import { z } from "zod";
import { authorizeUrl as amazonUrl } from "@/lib/channels/amazon";
import { assertCanConnect, createOAuthState } from "@/lib/channels/connections";
import { parseProvider } from "@/lib/channels/provider";
import {
  normaliseShopDomain,
  authorizeUrl as shopifyUrl,
} from "@/lib/channels/shopify";
import { handler, ok, parseJson } from "@/lib/server/api";
import { HttpError, requireUserId } from "@/lib/server/session";

// POST /api/channels/:provider/connect -> { url } to send the seller to for consent.
export const POST = handler(
  async (req: Request, ctx: { params: Promise<{ provider: string }> }) => {
    const userId = await requireUserId();
    const provider = parseProvider((await ctx.params).provider);
    await assertCanConnect(userId, provider);
    if (provider === "SHOPIFY") {
      const { shop } = await parseJson(
        req,
        z.object({ shop: z.string().min(1) }),
      );
      const domain = normaliseShopDomain(shop);
      if (!domain)
        throw new HttpError(
          400,
          "Enter your store address, e.g. mystore.myshopify.com",
        );
      const state = await createOAuthState(userId, provider, { shop: domain });
      return ok({ url: shopifyUrl(domain, state) });
    }
    const state = await createOAuthState(userId, provider);
    return ok({ url: amazonUrl(state) });
  },
);
