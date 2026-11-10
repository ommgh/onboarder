import { db } from "@/lib/db";
import { parseProvider } from "@/lib/channels/provider";
import { handler, ok } from "@/lib/server/api";
import { requireUserId } from "@/lib/server/session";

// DELETE /api/channels/:provider disconnects and forgets the stored tokens.
export const DELETE = handler(async (_req: Request, ctx: { params: Promise<{ provider: string }> }) => {
  const userId = await requireUserId();
  const provider = parseProvider((await ctx.params).provider);
  await db.marketplaceConnection.deleteMany({ where: { userId, provider } });
  await db.channelListing.updateMany({
    where: { provider, product: { userId } },
    data: { status: "PAUSED", message: "Channel disconnected" },
  });
  return ok({ disconnected: true });
});
