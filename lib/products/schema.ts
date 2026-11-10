import { z } from "zod";

const money = z
  .union([z.number(), z.string()])
  .transform((v) => (v === "" ? null : Number(v)))
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v < 10_000_000), "Enter a valid amount")
  .nullable();

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const productInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(5000).default(""),
  category: z.string().trim().max(100).default("General"),
  type: z.enum(["PACKAGED", "LOOSE", "HANDMADE", "APPAREL"]).default("PACKAGED"),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("ACTIVE"),
  brand: optionalText(120),
  sku: optionalText(64),
  barcode: optionalText(32),
  price: money.optional(),
  mrp: money.optional(),
  stock: z
    .union([z.number().int(), z.string()])
    .transform((v) => (v === "" ? null : Math.trunc(Number(v))))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Stock can't be negative")
    .nullable()
    .optional(),
  unit: z.enum(["kg", "g", "l", "ml", "piece", "pack", "dozen"]).nullable().optional(),
  unitValue: money.optional(),
  imageUrl: z.string().url().or(z.literal("")).default(""),
  images: z.array(z.string().url()).max(10).default([]),
  variantGroup: optionalText(80),
  variantLabel: optionalText(40),
  ondcCategory: optionalText(80),
  vegType: z.enum(["veg", "nonveg", "egg"]).nullable().optional(),
  manufacturer: optionalText(200),
  manufacturerAddress: optionalText(300),
  commonName: optionalText(200),
  countryOfOrigin: z.string().trim().length(3).default("IND"),
  hsnCode: optionalText(12),
  gstRate: money.optional(),
  attributes: z.record(z.string(), z.unknown()).nullable().optional(),
  aiGenerated: z.boolean().optional(),
});

export type ProductInput = z.infer<typeof productInput>;

export const productPatch = productInput.partial();

export const bulkCreateInput = z.object({
  products: z.array(productInput).min(1).max(500),
});

export const bulkActionInput = z.object({
  ids: z.array(z.string()).min(1).max(1000),
  action: z.enum(["activate", "draft", "archive", "delete", "set-category", "set-ondc-category"]),
  value: z.string().optional(),
});
