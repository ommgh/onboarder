import { db } from "@/lib/db";
import { productPatch } from "@/lib/products/schema";
import { toProductDTO } from "@/lib/products/serialize";
import { handler, ok, parseJson } from "@/lib/server/api";
import { assertSkusFree } from "@/lib/server/products";
import { HttpError, requireUserId } from "@/lib/server/session";

type Ctx = { params: Promise<{ id: string }> };

async function owned(userId: string, id: string) {
  const product = await db.product.findFirst({
    where: { id, userId },
    include: { listings: true },
  });
  if (!product) throw new HttpError(404, "Product not found.");
  return product;
}

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const userId = await requireUserId();
  return ok({
    product: toProductDTO(await owned(userId, (await ctx.params).id)),
  });
});

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const userId = await requireUserId();
  const { id } = await ctx.params;
  await owned(userId, id);
  const patch = await parseJson(req, productPatch);
  if (patch.sku !== undefined) await assertSkusFree(userId, [patch.sku], id);
  const { attributes, ...rest } = patch;
  const product = await db.product.update({
    where: { id },
    data: {
      ...rest,
      ...(attributes !== undefined
        ? { attributes: attributes ?? undefined }
        : {}),
    } as never,
    include: { listings: true },
  });
  // Edits invalidate pushed listings so the seller knows to re-sync.
  await db.channelListing.updateMany({
    where: {
      productId: id,
      provider: { in: ["SHOPIFY", "AMAZON"] },
      status: "LIVE",
    },
    data: { status: "PENDING", message: "Edited since last sync" },
  });
  return ok({ product: toProductDTO(product) });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const userId = await requireUserId();
  const { id } = await ctx.params;
  await owned(userId, id);
  await db.product.delete({ where: { id } });
  return ok({ deleted: true });
});
