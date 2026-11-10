import "server-only";
import type { MarketplaceConnection, MarketplaceProvider } from "@prisma/client";
import { appUrl } from "@/lib/config";
import { db } from "@/lib/db";
import { decrypt, encrypt, randomToken } from "@/lib/server/crypto";
import { getPlan, HttpError } from "@/lib/server/session";

export async function getConnection(userId: string, provider: MarketplaceProvider) {
  return db.marketplaceConnection.findUnique({ where: { userId_provider: { userId, provider } } });
}

export async function assertCanConnect(userId: string, provider: MarketplaceProvider) {
  const { limits } = await getPlan(userId);
  const existing = await db.marketplaceConnection.findMany({ where: { userId }, select: { provider: true } });
  const others = existing.filter((c) => c.provider !== provider).length;
  if (others >= limits.channels) {
    throw new HttpError(
      402,
      `Your ${limits.label} plan includes ${limits.channels} marketplace connection${limits.channels === 1 ? "" : "s"}. Upgrade to connect more.`,
      "CHANNEL_LIMIT",
    );
  }
}

export async function createOAuthState(userId: string, provider: MarketplaceProvider, extra?: Record<string, string>) {
  const state = randomToken(24);
  await db.oAuthState.create({
    data: {
      state,
      userId,
      provider,
      marketplaceId: provider,
      extra,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  return state;
}

/** Validates and consumes a one-time OAuth state. */
export async function consumeOAuthState(state: string | null, provider: MarketplaceProvider) {
  if (!state) throw new HttpError(400, "Missing state parameter.");
  const row = await db.oAuthState.findUnique({ where: { state } });
  if (!row) throw new HttpError(400, "This connection link has already been used. Please try again.");
  await db.oAuthState.delete({ where: { state } });
  if (row.expiresAt < new Date() || row.provider !== provider) {
    throw new HttpError(400, "The connection request expired. Please try again.");
  }
  return { userId: row.userId, extra: (row.extra ?? {}) as Record<string, string> };
}

export async function saveConnection(input: {
  userId: string;
  provider: MarketplaceProvider;
  sellerId: string;
  marketplaceId: string;
  shopDomain?: string;
  scopes?: string;
  accessToken: string;
  refreshToken?: string | null;
  accessTokenExpiresIn?: number | null;
  refreshTokenExpiresIn?: number | null;
  metadata?: Record<string, unknown>;
}) {
  const data = {
    sellerId: input.sellerId,
    marketplaceId: input.marketplaceId,
    shopDomain: input.shopDomain ?? null,
    scopes: input.scopes ?? null,
    encryptedAccessToken: encrypt(input.accessToken),
    encryptedRefreshToken: input.refreshToken ? encrypt(input.refreshToken) : null,
    accessTokenExpiresAt: input.accessTokenExpiresIn ? new Date(Date.now() + input.accessTokenExpiresIn * 1000) : null,
    refreshTokenExpiresAt: input.refreshTokenExpiresIn
      ? new Date(Date.now() + input.refreshTokenExpiresIn * 1000)
      : null,
    metadata: (input.metadata ?? undefined) as object | undefined,
  };
  return db.marketplaceConnection.upsert({
    where: { userId_provider: { userId: input.userId, provider: input.provider } },
    create: { userId: input.userId, provider: input.provider, ...data },
    update: data,
  });
}

/**
 * Returns a usable access token, refreshing through `refresh` when it expires within
 * five minutes. Throws a 409 asking the seller to reconnect when refresh fails.
 */
export async function accessToken(
  conn: MarketplaceConnection,
  refresh: (refreshToken: string) => Promise<{ accessToken: string; expiresIn: number; refreshToken?: string; refreshTokenExpiresIn?: number }>,
): Promise<string> {
  const expiresAt = conn.accessTokenExpiresAt?.getTime();
  if (!expiresAt || expiresAt - Date.now() > 5 * 60 * 1000) return decrypt(conn.encryptedAccessToken);
  if (!conn.encryptedRefreshToken) {
    throw new HttpError(409, "Your connection expired. Please reconnect.", "RECONNECT");
  }
  try {
    const next = await refresh(decrypt(conn.encryptedRefreshToken));
    await db.marketplaceConnection.update({
      where: { id: conn.id },
      data: {
        encryptedAccessToken: encrypt(next.accessToken),
        accessTokenExpiresAt: new Date(Date.now() + next.expiresIn * 1000),
        ...(next.refreshToken
          ? {
              encryptedRefreshToken: encrypt(next.refreshToken),
              refreshTokenExpiresAt: next.refreshTokenExpiresIn
                ? new Date(Date.now() + next.refreshTokenExpiresIn * 1000)
                : undefined,
            }
          : {}),
      },
    });
    return next.accessToken;
  } catch (e) {
    console.error(`[channels] token refresh failed for ${conn.provider}`, e);
    throw new HttpError(409, "Your connection expired. Please reconnect.", "RECONNECT");
  }
}

export function channelCallbackUrl(provider: "shopify" | "amazon") {
  return `${appUrl()}/api/channels/${provider}/callback`;
}

export function ensureSku(product: { id: string; sku: string | null }) {
  return product.sku || `OB-${product.id.slice(-10).toUpperCase()}`;
}
