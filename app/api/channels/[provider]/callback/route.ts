import { NextResponse } from "next/server";
import { exchangeCode as amazonExchange } from "@/lib/channels/amazon";
import { consumeOAuthState, saveConnection } from "@/lib/channels/connections";
import { parseProvider } from "@/lib/channels/provider";
import {
  shopInfo,
  exchangeCode as shopifyExchange,
  verifyCallbackHmac,
} from "@/lib/channels/shopify";
import { appUrl } from "@/lib/config";
import { HttpError } from "@/lib/server/session";

const back = (params: Record<string, string>) =>
  NextResponse.redirect(
    `${appUrl()}/dashboard/channels?${new URLSearchParams(params)}`,
  );

export async function GET(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const url = new URL(req.url);
  const q = url.searchParams;
  try {
    const provider = parseProvider((await ctx.params).provider);
    if (q.get("error"))
      throw new HttpError(
        400,
        q.get("error_description") ?? "Permission was not granted.",
      );

    if (provider === "SHOPIFY") {
      if (!verifyCallbackHmac(q))
        throw new HttpError(400, "Shopify's response could not be verified.");
      const { userId, extra } = await consumeOAuthState(
        q.get("state"),
        provider,
      );
      const shop = q.get("shop");
      if (!shop || shop !== extra.shop)
        throw new HttpError(400, "Store address mismatch. Please try again.");
      const t = await shopifyExchange(shop, q.get("code") ?? "");
      const conn = await saveConnection({
        userId,
        provider,
        sellerId: shop,
        marketplaceId: shop,
        shopDomain: shop,
        scopes: t.scope,
        accessToken: t.access_token,
        refreshToken: t.refresh_token,
        accessTokenExpiresIn: t.expires_in,
        refreshTokenExpiresIn: t.refresh_token_expires_in,
      });
      const info = await shopInfo(conn).catch(() => null);
      if (info)
        await saveConnection({
          userId,
          provider,
          sellerId: shop,
          marketplaceId: shop,
          shopDomain: shop,
          scopes: t.scope,
          accessToken: t.access_token,
          refreshToken: t.refresh_token,
          accessTokenExpiresIn: t.expires_in,
          refreshTokenExpiresIn: t.refresh_token_expires_in,
          metadata: {
            shopName: info.name,
            locationId: info.locationId,
            currency: info.currency,
          },
        });
      return back({ connected: "shopify" });
    }

    // Amazon: state, selling_partner_id, spapi_oauth_code
    const { userId } = await consumeOAuthState(q.get("state"), provider);
    const sellerId = q.get("selling_partner_id");
    const code = q.get("spapi_oauth_code");
    if (!sellerId || !code)
      throw new HttpError(400, "Amazon didn't return an authorisation code.");
    const t = await amazonExchange(code);
    await saveConnection({
      userId,
      provider,
      sellerId,
      marketplaceId: "A21TJRUUN4KGV",
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      accessTokenExpiresIn: t.expires_in,
    });
    return back({ connected: "amazon" });
  } catch (e) {
    console.error("[channels] callback failed", e);
    return back({
      error:
        e instanceof HttpError
          ? e.message
          : "Connection failed. Please try again.",
    });
  }
}
