import { flipkartListingSheet } from "@/lib/channels/flipkart";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/products/csv";
import { handler } from "@/lib/server/api";
import { requireUserId } from "@/lib/server/session";

// GET /api/products/export?format=csv|flipkart[&ids=a,b]
export const GET = handler(async (req: Request) => {
  const userId = await requireUserId();
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "csv";
  const ids = url.searchParams.get("ids")?.split(",").filter(Boolean);
  const products = await db.product.findMany({
    where: {
      userId,
      status: { not: "ARCHIVED" },
      ...(ids?.length ? { id: { in: ids } } : {}),
    },
    orderBy: { name: "asc" },
  });
  const date = new Date().toISOString().slice(0, 10);
  const body =
    format === "flipkart"
      ? flipkartListingSheet(products)
      : toCsv([
          [
            "name",
            "sku",
            "barcode",
            "brand",
            "type",
            "status",
            "category",
            "ondc_category",
            "price",
            "mrp",
            "stock",
            "unit_value",
            "unit",
            "description",
            "image_url",
          ],
          ...products.map((p) => [
            p.name,
            p.sku,
            p.barcode,
            p.brand,
            p.type,
            p.status,
            p.category,
            p.ondcCategory,
            p.price?.toString(),
            p.mrp?.toString(),
            p.stock,
            p.unitValue?.toString(),
            p.unit,
            p.description,
            p.imageUrl,
          ]),
        ]);
  return new Response(`﻿${body}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="onboarder-${format === "flipkart" ? "flipkart-sheet" : "catalog"}-${date}.csv"`,
    },
  });
});
