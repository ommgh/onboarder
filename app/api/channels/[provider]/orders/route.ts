import { parseProvider } from "@/lib/channels/provider";
import { importShopifyOrders } from "@/lib/channels/shopify";
import { handler, ok } from "@/lib/server/api";
import { HttpError, requireUserId } from "@/lib/server/session";

export const maxDuration = 120;

// POST /api/channels/shopify/orders imports recent orders for analytics and fulfilment.
export const POST = handler(async (_req: Request, ctx: { params: Promise<{ provider: string }> }) => {
  const userId = await requireUserId();
  const provider = parseProvider((await ctx.params).provider);
  if (provider !== "SHOPIFY") throw new HttpError(400, "Order import is available for Shopify.");
  return ok({ imported: await importShopifyOrders(userId) });
});
