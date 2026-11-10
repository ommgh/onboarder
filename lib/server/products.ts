import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { ProductInput } from "@/lib/products/schema";
import { getPlan, HttpError } from "./session";

export async function assertProductCapacity(userId: string, adding: number) {
  const { limits } = await getPlan(userId);
  const count = await db.product.count({ where: { userId, status: { not: "ARCHIVED" } } });
  if (count + adding > limits.products) {
    const room = Math.max(0, limits.products - count);
    throw new HttpError(
      402,
      room === 0
        ? `Your ${limits.label} plan holds ${limits.products} products and your catalog is full. Archive old items or upgrade.`
        : `Only ${room} more product${room === 1 ? "" : "s"} fit in your ${limits.label} plan (limit ${limits.products}). Upgrade to add all ${adding}.`,
      "PRODUCT_LIMIT",
    );
  }
}

/** SKUs must be unique per seller; enforced here since the column is new and nullable. */
export async function assertSkusFree(userId: string, skus: (string | null | undefined)[], excludeId?: string) {
  const wanted = skus.filter((s): s is string => Boolean(s));
  const dupes = wanted.filter((s, i) => wanted.indexOf(s) !== i);
  if (dupes.length) throw new HttpError(409, `SKU ${dupes[0]} is used twice in this batch.`);
  if (!wanted.length) return;
  const clash = await db.product.findFirst({
    where: { userId, sku: { in: wanted }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { sku: true },
  });
  if (clash) throw new HttpError(409, `SKU ${clash.sku} already exists in your catalog.`);
}

export function toCreateData(userId: string, p: ProductInput): Prisma.ProductUncheckedCreateInput {
  return {
    ...p,
    userId,
    attributes: (p.attributes ?? undefined) as Prisma.InputJsonValue | undefined,
  };
}
