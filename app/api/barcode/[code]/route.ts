import { db } from "@/lib/db";
import { handler, ok } from "@/lib/server/api";
import { lookupBarcode, normaliseBarcode } from "@/lib/server/barcode";
import { HttpError, requireUserId } from "@/lib/server/session";

// Looks a scanned barcode up and reports whether it's already in the seller's catalog.
export const GET = handler(
  async (_req: Request, ctx: { params: Promise<{ code: string }> }) => {
    const userId = await requireUserId();
    const code = normaliseBarcode((await ctx.params).code);
    if (!code)
      throw new HttpError(400, "That doesn't look like a product barcode.");
    const [existing, product] = await Promise.all([
      db.product.findFirst({
        where: { userId, barcode: code },
        select: { id: true, name: true },
      }),
      lookupBarcode(code),
    ]);
    return ok({ barcode: code, existing, product });
  },
);
