import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { productInput } from "@/lib/products/schema";
import { toProductDTO } from "@/lib/products/serialize";
import { handler, ok, parseJson } from "@/lib/server/api";
import { assertProductCapacity, assertSkusFree, toCreateData } from "@/lib/server/products";
import { requireUserId } from "@/lib/server/session";

export const GET = handler(async (req: Request) => {
  const userId = await requireUserId();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");
  const filter = url.searchParams.get("filter");
  const group = url.searchParams.get("group");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 200);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);

  const where: Prisma.ProductWhereInput = {
    userId,
    ...(status && status !== "all" ? { status: status as never } : { status: { not: "ARCHIVED" } }),
    ...(type && type !== "all" ? { type: type as never } : {}),
    ...(group ? { variantGroup: group } : {}),
    ...(filter === "no-photo" ? { imageUrl: "", images: { isEmpty: true } } : {}),
    ...(filter === "no-price" ? { price: null } : {}),
    ...(filter === "low-stock" ? { stock: { lte: 5 } } : {}),
    ...(filter === "no-category" ? { ondcCategory: null } : {}),
    ...(filter === "needs-action" ? { listings: { some: { status: { in: ["NEEDS_ACTION", "FAILED", "PENDING"] } } } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
            { barcode: { contains: q } },
            { brand: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [products, total] = await Promise.all([
    db.product.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: offset, include: { listings: true } }),
    db.product.count({ where }),
  ]);
  return ok({ products: products.map(toProductDTO), total, limit, offset });
});

export const POST = handler(async (req: Request) => {
  const userId = await requireUserId();
  const input = await parseJson(req, productInput);
  await assertProductCapacity(userId, 1);
  await assertSkusFree(userId, [input.sku]);
  const product = await db.product.create({ data: toCreateData(userId, input) });
  return ok({ product: toProductDTO(product) }, { status: 201 });
});
