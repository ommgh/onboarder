// Unit handling shared by the scanner, loose-item builder, CSV import and channels.

export const UNITS = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "l", label: "litre" },
  { value: "ml", label: "ml" },
  { value: "piece", label: "piece" },
  { value: "pack", label: "pack" },
  { value: "dozen", label: "dozen" },
] as const;

export type Unit = (typeof UNITS)[number]["value"];

const ALIASES: Record<string, Unit> = {
  kg: "kg", kgs: "kg", kilo: "kg", kilogram: "kg", kilograms: "kg",
  g: "g", gm: "g", gms: "g", gram: "g", grams: "g", gr: "g",
  l: "l", ltr: "l", litre: "l", liter: "l", litres: "l", liters: "l", lt: "l",
  ml: "ml", millilitre: "ml", milliliter: "ml",
  pc: "piece", pcs: "piece", piece: "piece", pieces: "piece", unit: "piece", units: "piece", nos: "piece",
  pack: "pack", pkt: "pack", packet: "pack",
  dozen: "dozen", dz: "dozen",
};

/** Parses "1 kg", "500g", "1.5 L", "6 pcs" into a normalised unit and value. */
export function parseQuantity(text: string | null | undefined): { unit: Unit; value: number } | null {
  if (!text) return null;
  const m = text.toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*([a-z]+)/);
  if (!m) return null;
  const value = Number(m[1].replace(",", "."));
  const unit = ALIASES[m[2]];
  if (!unit || !Number.isFinite(value) || value <= 0) return null;
  return { unit, value };
}

export function formatQuantity(value: number | null | undefined, unit: string | null | undefined): string {
  if (!value || !unit) return "";
  const v = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
  if (unit === "piece") return value === 1 ? "1 pc" : `${v} pcs`;
  if (unit === "l") return `${v} L`;
  return `${v} ${unit}`;
}

/** Price per kg / litre for a pack, used to suggest pack prices from a per-kg rate. */
export function packPrice(ratePerBaseUnit: number, value: number, unit: Unit): number {
  const factor = unit === "g" || unit === "ml" ? value / 1000 : value;
  return Math.round(ratePerBaseUnit * factor * 100) / 100;
}
