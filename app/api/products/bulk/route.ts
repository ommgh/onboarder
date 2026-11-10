import { db } from "@/lib/db";
import { bulkActionInput, bulkCreateInput } from "@/lib/products/schema";
import { handler, ok, parseJson } from "@/lib/server/api";
import { assertProductCapacity, assertSkusFree, toCreateData } from "@/lib/server/products";
import { HttpError, requireUserId } from "@/lib/server/session";

// Create many products at once (scanner queue, loose catalog, CSV import).
export const POST = handler(async (req: Request) => {
  const userId = await requireUserId();
  const { products } = await parseJson(req, bulkCreateInput);
  await assertProductCapacity(userId, products.length);
  await assertSkusFree(userId, products.map((p) => p.sku));
  const created = await db.$transaction(products.map((p) => db.product.create({ data: toCreateData(userId, p), select: { id: true } })));
  return ok({ created: created.length, ids: created.map((c) => c.id) }, { status: 201 });
});

// Bulk actions from the catalog table.
export const PATCH = handler(async (req: Request) => {
  const userId = await requireUserId();
  const { ids, action, value } = await parseJson(req, bulkActionInput);
  const where = { userId, id: { in: ids } };
  switch (action) {
    case "delete": {
      const r = await db.product.deleteMany({ where });
      return ok({ affected: r.count });
    }
    case "activate": {
      const r = await db.product.updateMany({ where, data: { status: "ACTIVE" } });
      return ok({ affected: r.count });
    }
    case "draft": {
      const r = await db.product.updateMany({ where, data: { status: "DRAFT" } });
      return ok({ affected: r.count });
    }
    case "archive": {
      const r = await db.product.updateMany({ where, data: { status: "ARCHIVED" } });
      return ok({ affected: r.count });
    }
    case "set-category":
    case "set-ondc-category": {
      if (!value) throw new HttpError(400, "Choose a category.");
      const data = action === "set-category" ? { category: value } : { ondcCategory: value };
      const r = await db.product.updateMany({ where, data });
      return ok({ affected: r.count });
    }
  }
});
