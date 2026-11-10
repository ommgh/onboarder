// Listing quality: a 0-100 score plus concrete suggestions. Better listings convert better
// on every channel, so this is the backbone of the "improve your selling chances" view.

export interface QualityInput {
  name: string;
  description: string;
  type: "PACKAGED" | "LOOSE" | "HANDMADE" | "APPAREL";
  imageUrl: string;
  images: string[];
  price: number | null;
  mrp: number | null;
  stock: number | null;
  barcode?: string | null;
  brand?: string | null;
  unit?: string | null;
  unitValue?: number | null;
  ondcCategory?: string | null;
  category: string;
}

export interface Suggestion {
  id: string;
  message: string;
  points: number;
  ai?: boolean; // can be fixed with one click using AI
}

export function scoreListing(p: QualityInput): { score: number; suggestions: Suggestion[] } {
  const suggestions: Suggestion[] = [];
  let score = 0;
  const add = (ok: boolean, points: number, s: Omit<Suggestion, "points">) => {
    if (ok) score += points;
    else suggestions.push({ ...s, points });
  };

  const photos = [p.imageUrl, ...p.images].filter(Boolean).length;
  add(photos > 0, 20, { id: "photo", message: "Add a product photo. Listings without photos rarely sell." });
  add(photos > 1, 5, { id: "photos", message: "Add a second photo (back of pack, close-up or in use)." });

  const name = p.name.trim();
  const goodName = name.length >= 12 && name.length <= 120 && name !== name.toUpperCase();
  add(goodName, 10, {
    id: "name",
    message: "Write a fuller title: brand, product and size, e.g. “Aashirvaad Whole Wheat Atta 5 kg”.",
    ai: true,
  });
  add(p.description.trim().length >= 80, 15, {
    id: "description",
    message: "Add a description of at least two sentences covering use, quality and storage.",
    ai: true,
  });
  add(Boolean(p.price && p.price > 0), 20, { id: "price", message: "Set a selling price." });
  add(Boolean(p.mrp && p.price && p.mrp >= p.price), 5, {
    id: "mrp",
    message: "Add the MRP so buyers can see the discount you offer.",
  });
  add(Boolean(p.ondcCategory) || Boolean(p.category && p.category !== "General"), 10, {
    id: "category",
    message: "Choose a category so buyers can find this in browse and search.",
  });
  add(p.stock === null || p.stock > 0, 5, { id: "stock", message: "This item is out of stock." });

  const needsSize = p.type === "PACKAGED" || p.type === "LOOSE";
  add(!needsSize || Boolean(p.unit && p.unitValue), 5, {
    id: "size",
    message: "Add the pack size (e.g. 1 kg, 500 ml). Marketplaces require it for groceries.",
  });
  add(p.type !== "PACKAGED" || Boolean(p.barcode || p.brand), 5, {
    id: "identity",
    message: "Add the brand or barcode so marketplaces can match the product.",
  });

  return { score: Math.min(100, score), suggestions: suggestions.sort((a, b) => b.points - a.points) };
}

export function qualityBand(score: number): "great" | "good" | "weak" {
  if (score >= 85) return "great";
  if (score >= 60) return "good";
  return "weak";
}
