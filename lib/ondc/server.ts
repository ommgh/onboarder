import "server-only";
import type { Product, Store } from "@prisma/client";
import { appUrl } from "@/lib/config";
import { db } from "@/lib/db";
import {
  createAuthorizationHeader,
  type ParsedAuthHeader,
  parseAuthorizationHeader,
  signMessage,
  verifyAuthorizationHeader,
} from "./crypto";
import type { BecknContext, Json, OndcProduct, OndcStore } from "./types";

// Registry endpoints and public keys from ONDC-Official/developer-docs
// registry/Onboarding of Participants.md. The staging registry has been decommissioned.
const REGISTRIES = {
  preprod: {
    subscribe: "https://preprod.registry.ondc.org/ondc/subscribe",
    lookup: "https://preprod.registry.ondc.org/v2.0/lookup",
    encryptionPublicKey:
      "MCowBQYDK2VuAyEARa/WcMCzNQp4DWjvTI4DK7vHL6EdaHqN4GjFIu9wxxM=",
  },
  prod: {
    subscribe: "https://prod.registry.ondc.org/subscribe",
    lookup: "https://prod.registry.ondc.org/v2.0/lookup",
    encryptionPublicKey:
      "MCowBQYDK2VuAyEAwASk2D4O3p/tuD8f9sNQAQlwOU2w3DAumcOK9qHCFwI=",
  },
} as const;

export const CORE_VERSION = "1.2.0";

export function ondcConfig() {
  const env = process.env.ONDC_ENV === "prod" ? "prod" : "preprod";
  const subscriberId = process.env.ONDC_SUBSCRIBER_ID ?? new URL(appUrl()).host;
  return {
    env,
    subscriberId,
    uniqueKeyId: process.env.ONDC_UNIQUE_KEY_ID ?? "",
    signingPrivateKey: process.env.ONDC_SIGNING_PRIVATE_KEY ?? "",
    signingPublicKey: process.env.ONDC_SIGNING_PUBLIC_KEY ?? "",
    encryptionPrivateKey: process.env.ONDC_ENCRYPTION_PRIVATE_KEY ?? "",
    encryptionPublicKey: process.env.ONDC_ENCRYPTION_PUBLIC_KEY ?? "",
    requestId: process.env.ONDC_REQUEST_ID ?? "",
    /** Set ONDC_VERIFY_SIGNATURES=false only for local testing with mock buyer apps. */
    verifySignatures: process.env.ONDC_VERIFY_SIGNATURES !== "false",
    bppUri: `${appUrl()}/api/ondc`,
    registry: REGISTRIES[env],
  };
}

export function isOndcConfigured() {
  const c = ondcConfig();
  return Boolean(
    c.uniqueKeyId && c.signingPrivateKey && c.encryptionPrivateKey,
  );
}

// ---------------------------------------------------------------------------------------
// Registry lookup (cached). The v2.0 lookup must itself be signed.

const keyCache = new Map<string, { key: string; at: number }>();
const KEY_TTL_MS = 60 * 60 * 1000;

export async function lookupSigningKey(
  subscriberId: string,
  uniqueKeyId: string,
): Promise<string | null> {
  const cacheKey = `${subscriberId}|${uniqueKeyId}`;
  const hit = keyCache.get(cacheKey);
  if (hit && Date.now() - hit.at < KEY_TTL_MS) return hit.key;

  const c = ondcConfig();
  const body = JSON.stringify({
    subscriber_id: subscriberId,
    ukId: uniqueKeyId,
    country: "IND",
  });
  const res = await fetch(c.registry.lookup, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: createAuthorizationHeader(body, {
        subscriberId: c.subscriberId,
        uniqueKeyId: c.uniqueKeyId,
        privateKey: c.signingPrivateKey,
      }),
    },
    body,
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!res?.ok) return null;
  const entries = (await res.json().catch(() => [])) as Json[];
  const entry = Array.isArray(entries)
    ? entries.find(
        (e) =>
          e.subscriber_id === subscriberId &&
          (e.ukId === uniqueKeyId || e.unique_key_id === uniqueKeyId),
      )
    : null;
  const key: string | undefined = entry?.signing_public_key;
  if (!key) return null;
  keyCache.set(cacheKey, { key, at: Date.now() });
  return key;
}

export type VerifyResult =
  | { ok: true; sender?: ParsedAuthHeader }
  | { ok: false; reason: string };

export async function verifyIncoming(
  rawBody: string,
  headers: Headers,
): Promise<VerifyResult> {
  const c = ondcConfig();
  if (!c.verifySignatures) return { ok: true };
  const parsed = parseAuthorizationHeader(headers.get("authorization"));
  if (!parsed)
    return { ok: false, reason: "Missing or malformed Authorization header" };
  const key = await lookupSigningKey(parsed.subscriberId, parsed.uniqueKeyId);
  if (!key)
    return { ok: false, reason: `No registry key for ${parsed.subscriberId}` };
  if (!verifyAuthorizationHeader(rawBody, parsed, key))
    return { ok: false, reason: "Signature verification failed" };

  const gateway = parseAuthorizationHeader(
    headers.get("x-gateway-authorization"),
  );
  if (gateway) {
    const gwKey = await lookupSigningKey(
      gateway.subscriberId,
      gateway.uniqueKeyId,
    );
    if (!gwKey || !verifyAuthorizationHeader(rawBody, gateway, gwKey)) {
      return { ok: false, reason: "Gateway signature verification failed" };
    }
  }
  return { ok: true, sender: parsed };
}

export function siteVerificationSignature(): string {
  const c = ondcConfig();
  return signMessage(c.requestId, c.signingPrivateKey);
}

// ---------------------------------------------------------------------------------------
// Responses and callbacks

export const ACK = { message: { ack: { status: "ACK" } } };
export function nack(type: string, code: string, message: string) {
  return {
    message: { ack: { status: "NACK" } },
    error: { type, code, message },
  };
}

export function callbackContext(
  ctx: BecknContext,
  action: string,
): BecknContext {
  const c = ondcConfig();
  return {
    ...ctx,
    action,
    bpp_id: c.subscriberId,
    bpp_uri: c.bppUri,
    timestamp: new Date().toISOString(),
  };
}

export async function logOndc(entry: {
  context: Partial<BecknContext>;
  direction: "in" | "out";
  payload: Json;
  response?: Json;
  ok?: boolean;
}) {
  await db.ondcLog
    .create({
      data: {
        transactionId: entry.context.transaction_id ?? "unknown",
        messageId: entry.context.message_id ?? "unknown",
        action: entry.context.action ?? "unknown",
        direction: entry.direction,
        counterparty: entry.context.bap_id ?? null,
        payload: entry.payload,
        response: entry.response ?? undefined,
        ok: entry.ok ?? true,
      },
    })
    .catch((e) => console.error("[ondc] failed to write log", e));
}

/** Sends a signed callback (on_search, on_select, ...) to the buyer app. */
export async function sendCallback(
  ctx: BecknContext,
  message: Json,
  error?: Json,
) {
  const c = ondcConfig();
  const payload: Json = { context: ctx, message };
  if (error) payload.error = error;
  const body = JSON.stringify(payload);
  const url = `${ctx.bap_uri.replace(/\/$/, "")}/${ctx.action}`;
  let response: Json = null;
  let ok = false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: createAuthorizationHeader(body, {
          subscriberId: c.subscriberId,
          uniqueKeyId: c.uniqueKeyId,
          privateKey: c.signingPrivateKey,
        }),
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
    response = await res.json().catch(() => ({ status: res.status }));
    ok = res.ok && response?.message?.ack?.status !== "NACK";
  } catch (e) {
    response = { error: String(e) };
  }
  await logOndc({ context: ctx, direction: "out", payload, response, ok });
  return ok;
}

// ---------------------------------------------------------------------------------------
// Prisma -> protocol shapes

export function toOndcStore(s: Store): OndcStore {
  return {
    ...s,
    deliveryFee: Number(s.deliveryFee),
    minOrderValue: Number(s.minOrderValue),
  };
}

export function toOndcProduct(p: Product): OndcProduct {
  return {
    ...p,
    price: p.price === null ? null : Number(p.price),
    mrp: p.mrp === null ? null : Number(p.mrp),
    unitValue: p.unitValue === null ? null : Number(p.unitValue),
  };
}

export function placeholderImage(id: string) {
  return `${appUrl()}/api/placeholder/${encodeURIComponent(id)}`;
}
