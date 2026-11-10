// Minimal RFC 4180 CSV parse/serialise, so imports and exports need no dependency.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((r) =>
      r
        .map((v) => {
          const s = v === null || v === undefined ? "" : String(v);
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\r\n");
}

/** Guesses which product field a spreadsheet header refers to. */
export const COLUMN_GUESSES: Record<string, RegExp> = {
  name: /^(product\s*)?(name|title|item(\s*name)?|description of goods|particulars)$/i,
  price: /^(selling\s*)?(price|rate|sp|sale\s*price)$/i,
  mrp: /^(mrp|max(imum)?\s*retail\s*price|list\s*price)$/i,
  stock: /^(stock|qty|quantity|closing\s*(stock|qty)|inventory|available)$/i,
  barcode: /^(barcode|ean|upc|gtin|ean\s*code)$/i,
  sku: /^(sku|item\s*code|code|product\s*code)$/i,
  brand: /^(brand|company|manufacturer)$/i,
  category: /^(category|group|item\s*group|department)$/i,
  unit: /^(unit|uom|size|pack\s*size|weight)$/i,
  description: /^(description|details|long\s*description)$/i,
  hsnCode: /^(hsn|hsn\s*code|hsn\/sac)$/i,
  gstRate: /^(gst|gst\s*%|gst\s*rate|tax\s*%?)$/i,
  imageUrl: /^(image|image\s*url|photo|picture)$/i,
};

export function guessColumn(header: string): string | null {
  const h = header.trim();
  for (const [field, re] of Object.entries(COLUMN_GUESSES)) if (re.test(h)) return field;
  return null;
}
