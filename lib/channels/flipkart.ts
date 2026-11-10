import type { Product } from "@prisma/client";
import { toCsv } from "@/lib/products/csv";
import { formatQuantity } from "@/lib/products/units";

// Flipkart creates new listings only through Seller Hub category templates. This sheet
// carries the fields common to every template so sellers can paste columns across.
export function flipkartListingSheet(products: Product[]): string {
  const header = [
    "Seller SKU ID",
    "Product Title",
    "Brand",
    "MRP (INR)",
    "Your selling price (INR)",
    "Stock",
    "Pack size",
    "EAN / UPC",
    "HSN",
    "GST %",
    "Description",
    "Main Image URL",
    "Other Image URLs",
    "Country of Origin",
    "Manufacturer Details",
  ];
  const rows = products.map((p) => [
    p.sku || `OB-${p.id.slice(-10).toUpperCase()}`,
    p.name,
    p.brand ?? "Unbranded",
    p.mrp?.toString() ?? p.price?.toString() ?? "",
    p.price?.toString() ?? "",
    p.stock ?? 10,
    formatQuantity(p.unitValue ? Number(p.unitValue) : null, p.unit),
    p.barcode ?? "",
    p.hsnCode ?? "",
    p.gstRate?.toString() ?? "",
    p.description,
    p.imageUrl,
    p.images.join(" | "),
    p.countryOfOrigin === "IND" ? "India" : p.countryOfOrigin,
    [p.manufacturer, p.manufacturerAddress].filter(Boolean).join(", "),
  ]);
  return toCsv([header, ...rows]);
}
