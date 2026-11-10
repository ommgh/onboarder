import "server-only";
import type { MarketplaceConnection, Product } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/server/session";
import { accessToken, channelCallbackUrl, ensureSku } from "./connections";
import type { PublishResult } from "./shopify";

// biome-ignore lint/suspicious/noExplicitAny: SP-API responses are dynamic JSON
type SpApiJson = any;

// Amazon SP-API for Amazon.in. India is served from the EU endpoint.
// Auth: https://developer-docs.amazon/sp-api/docs/website-authorization-workflow
export const AMAZON_IN_MARKETPLACE = "A21TJRUUN4KGV";
const SP_API = "https://sellingpartnerapi-eu.amazon.com";
const LWA_TOKEN = "https://api.amazon.com/auth/o2/token";

function credentials() {
  const appId = process.env.AMAZON_APP_ID;
  const clientId = process.env.AMAZON_LWA_CLIENT_ID;
  const clientSecret = process.env.AMAZON_LWA_CLIENT_SECRET;
  if (!appId || !clientId || !clientSecret)
    throw new HttpError(503, "Amazon is not configured on this server.");
  return { appId, clientId, clientSecret };
}

export const isAmazonConfigured = () =>
  Boolean(
    process.env.AMAZON_APP_ID &&
      process.env.AMAZON_LWA_CLIENT_ID &&
      process.env.AMAZON_LWA_CLIENT_SECRET,
  );

export function authorizeUrl(state: string) {
  const { appId } = credentials();
  const params = new URLSearchParams({
    application_id: appId,
    state,
    redirect_uri: channelCallbackUrl("amazon"),
  });
  // Draft (unpublished) apps must add version=beta to authorise test sellers.
  if (process.env.AMAZON_APP_DRAFT === "true") params.set("version", "beta");
  return `https://sellercentral.amazon.in/apps/authorize/consent?${params}`;
}

async function lwa(body: Record<string, string>) {
  const res = await fetch(LWA_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  if (!res.ok)
    throw new Error(
      `LWA token request failed: ${res.status} ${await res.text()}`,
    );
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
}

export function exchangeCode(code: string) {
  const { clientId, clientSecret } = credentials();
  return lwa({
    grant_type: "authorization_code",
    code,
    redirect_uri: channelCallbackUrl("amazon"),
    client_id: clientId,
    client_secret: clientSecret,
  });
}

function token(conn: MarketplaceConnection) {
  return accessToken(conn, async (refreshToken) => {
    const { clientId, clientSecret } = credentials();
    const r = await lwa({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });
    return { accessToken: r.access_token, expiresIn: r.expires_in };
  });
}

async function spapi(
  conn: MarketplaceConnection,
  method: string,
  path: string,
  body?: unknown,
): Promise<SpApiJson> {
  const res = await fetch(`${SP_API}${path}`, {
    method,
    headers: {
      "x-amz-access-token": await token(conn),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 || res.status === 403) {
    throw new HttpError(
      409,
      "Amazon rejected our access. Please reconnect your seller account.",
      "RECONNECT",
    );
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      json.errors?.[0]?.message ?? `Amazon returned ${res.status}`,
    );
  return json;
}

async function findAsin(
  conn: MarketplaceConnection,
  barcode: string,
): Promise<string | null> {
  const type = barcode.length === 12 ? "UPC" : "EAN";
  const q = new URLSearchParams({
    identifiers: barcode,
    identifiersType: type,
    marketplaceIds: AMAZON_IN_MARKETPLACE,
    includedData: "summaries",
  });
  const data = await spapi(conn, "GET", `/catalog/2022-04-01/items?${q}`);
  return data.items?.[0]?.asin ?? null;
}

export async function publishToAmazon(
  userId: string,
  products: Product[],
): Promise<PublishResult[]> {
  const conn = await db.marketplaceConnection.findUnique({
    where: { userId_provider: { userId, provider: "AMAZON" } },
  });
  if (!conn)
    throw new HttpError(400, "Connect your Amazon seller account first.");
  const results: PublishResult[] = [];
  for (const p of products) {
    if (!p.barcode) {
      results.push({
        productId: p.id,
        ok: false,
        message:
          "Needs a barcode (EAN) to match Amazon's catalog. Create brand-new products in Seller Central.",
      });
      continue;
    }
    if (!p.price) {
      results.push({
        productId: p.id,
        ok: false,
        message: "Set a price before listing.",
      });
      continue;
    }
    try {
      const asin = await findAsin(conn, p.barcode);
      if (!asin) {
        results.push({
          productId: p.id,
          ok: false,
          message:
            "No matching product on Amazon.in. Create it in Seller Central (some brands need approval).",
        });
        continue;
      }
      const sku = ensureSku(p);
      if (!p.sku)
        await db.product.update({ where: { id: p.id }, data: { sku } });
      const mk = AMAZON_IN_MARKETPLACE;
      const res = await spapi(
        conn,
        "PUT",
        `/listings/2021-08-01/items/${encodeURIComponent(conn.sellerId)}/${encodeURIComponent(sku)}?marketplaceIds=${mk}`,
        {
          productType: "PRODUCT",
          requirements: "LISTING_OFFER_ONLY",
          attributes: {
            merchant_suggested_asin: [{ value: asin, marketplace_id: mk }],
            condition_type: [{ value: "new_new", marketplace_id: mk }],
            purchasable_offer: [
              {
                marketplace_id: mk,
                currency: "INR",
                our_price: [
                  { schedule: [{ value_with_tax: Number(p.price) }] },
                ],
              },
            ],
            fulfillment_availability: [
              {
                fulfillment_channel_code: "DEFAULT",
                quantity: p.stock === null ? 10 : Math.max(0, p.stock),
              },
            ],
          },
        },
      );
      const errors = (res.issues ?? []).filter(
        (i: { severity: string }) => i.severity === "ERROR",
      );
      if (res.status !== "ACCEPTED" || errors.length) {
        results.push({
          productId: p.id,
          ok: false,
          message: errors[0]?.message ?? `Amazon status: ${res.status}`,
        });
      } else {
        results.push({
          productId: p.id,
          ok: true,
          externalId: asin,
          externalUrl: `https://www.amazon.in/dp/${asin}`,
        });
      }
    } catch (e) {
      if (e instanceof HttpError && e.code === "RECONNECT") throw e;
      results.push({
        productId: p.id,
        ok: false,
        message:
          e instanceof Error ? e.message : "Amazon rejected this listing",
      });
    }
  }
  await db.marketplaceConnection.update({
    where: { id: conn.id },
    data: { lastSyncAt: new Date() },
  });
  return results;
}
