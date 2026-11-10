import "server-only";
import { parseQuantity } from "@/lib/products/units";

export interface BarcodeProduct {
  barcode: string;
  name: string;
  brand: string | null;
  description: string;
  category: string | null;
  imageUrl: string | null;
  unit: string | null;
  unitValue: number | null;
  manufacturer: string | null;
  vegType: string | null;
  source: "go-upc" | "openfoodfacts";
}

export function normaliseBarcode(raw: string): string | null {
  const code = raw.replace(/\D/g, "");
  return code.length >= 8 && code.length <= 14 ? code : null;
}

async function fromGoUpc(code: string): Promise<BarcodeProduct | null> {
  const key = process.env.UPC_API_KEY;
  if (!key) return null;
  const res = await fetch(`https://go-upc.com/api/v1/code/${code}?key=${encodeURIComponent(key)}`, {
    signal: AbortSignal.timeout(6000),
  }).catch(() => null);
  if (!res?.ok) return null;
  const data = (await res.json()) as {
    product?: { name?: string; brand?: string; description?: string; category?: string; imageUrl?: string; specs?: [string, string][] };
  };
  const p = data.product;
  if (!p?.name) return null;
  const qty = parseQuantity(p.name) ?? parseQuantity(p.specs?.find(([k]) => /size|weight|volume/i.test(k))?.[1]);
  return {
    barcode: code,
    name: p.name,
    brand: p.brand ?? null,
    description: p.description ?? "",
    category: p.category ?? null,
    imageUrl: p.imageUrl ?? null,
    unit: qty?.unit ?? null,
    unitValue: qty?.value ?? null,
    manufacturer: p.brand ?? null,
    vegType: null,
    source: "go-upc",
  };
}

async function fromOpenFoodFacts(code: string): Promise<BarcodeProduct | null> {
  const fields = "product_name,product_name_en,generic_name,brands,quantity,image_front_url,image_url,categories,manufacturing_places,labels_tags,ingredients_analysis_tags";
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}`, {
    headers: { "User-Agent": "Onboarder/2.0 (+https://onboarder.store)" },
    signal: AbortSignal.timeout(6000),
  }).catch(() => null);
  if (!res?.ok) return null;
  const data = (await res.json()) as { status?: number; product?: Record<string, unknown> };
  const p = data.product;
  const name = (p?.product_name as string) || (p?.product_name_en as string);
  if (data.status !== 1 || !p || !name) return null;
  const brand = ((p.brands as string) ?? "").split(",")[0]?.trim() || null;
  const qty = parseQuantity(p.quantity as string);
  const labels = (p.labels_tags as string[] | undefined) ?? [];
  const analysis = (p.ingredients_analysis_tags as string[] | undefined) ?? [];
  const vegType = labels.includes("en:non-vegetarian")
    ? "nonveg"
    : labels.includes("en:vegetarian") || analysis.includes("en:vegetarian")
      ? "veg"
      : null;
  return {
    barcode: code,
    name: brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${name}` : name,
    brand,
    description: (p.generic_name as string) ?? "",
    category: ((p.categories as string) ?? "").split(",").pop()?.trim() || null,
    imageUrl: (p.image_front_url as string) || (p.image_url as string) || null,
    unit: qty?.unit ?? null,
    unitValue: qty?.value ?? null,
    manufacturer: brand,
    vegType,
    source: "openfoodfacts",
  };
}

/** Looks a barcode up across providers, best source first. */
export async function lookupBarcode(raw: string): Promise<BarcodeProduct | null> {
  const code = normaliseBarcode(raw);
  if (!code) return null;
  return (await fromGoUpc(code)) ?? (await fromOpenFoodFacts(code));
}
