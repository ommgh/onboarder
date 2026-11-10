import { db } from "@/lib/db";
import { handler, ok } from "@/lib/server/api";
import { HttpError, requireUserId } from "@/lib/server/session";

export const DELETE = handler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const r = await db.models.deleteMany({ where: { id, userId } });
    if (!r.count) throw new HttpError(404, "Model not found.");
    return ok({ deleted: true });
  },
);
