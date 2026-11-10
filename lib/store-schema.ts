import { z } from "zod";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const storeInput = z.object({
  name: z.string().trim().min(2, "Shop name is required").max(80).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes")
    .optional(),
  tagline: text(120),
  description: text(1000),
  logoUrl: z
    .string()
    .url()
    .refine(
      (v) => v.startsWith("https://"),
      "Logo link must start with https://",
    )
    .or(z.literal(""))
    .nullable()
    .optional(),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  phone: text(15).refine(
    (v) => !v || /^[6-9]\d{9}$/.test(v.replace(/\D/g, "").slice(-10)),
    "Enter a 10-digit mobile number",
  ),
  email: z
    .string()
    .trim()
    .email()
    .or(z.literal(""))
    .transform((v) => v || null)
    .nullable()
    .optional(),
  whatsapp: text(15),
  legalName: text(120),
  gstin: text(15)
    .transform((v) => v?.toUpperCase() ?? v)
    .refine(
      (v) => !v || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v),
      "GSTIN should look like 29ABCDE1234F1Z5",
    ),
  fssaiLicense: text(14).refine(
    (v) => !v || /^\d{14}$/.test(v),
    "FSSAI licence is 14 digits",
  ),
  addressLine: text(200),
  locality: text(80),
  city: text(80),
  state: text(2).transform((v) => v?.toUpperCase() ?? v),
  pincode: text(6).refine(
    (v) => !v || /^[1-9]\d{5}$/.test(v),
    "Pincode is 6 digits",
  ),
  stdCode: text(10).refine(
    (v) => !v || /^std:\d{2,5}$/.test(v),
    "Use the format std:080",
  ),
  latitude: z.number().min(6).max(38).nullable().optional(),
  longitude: z.number().min(68).max(98).nullable().optional(),
  openTime: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  closeTime: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  openDays: z
    .string()
    .regex(/^[1-7](,[1-7])*$/)
    .optional(),
  deliveryEnabled: z.boolean().optional(),
  pickupEnabled: z.boolean().optional(),
  serviceRadiusKm: z.number().min(0.5).max(50).optional(),
  timeToShipMinutes: z
    .number()
    .int()
    .min(10)
    .max(7 * 24 * 60)
    .optional(),
  returnable: z.boolean().optional(),
  returnWindowHours: z.number().int().min(0).max(720).optional(),
  codEnabled: z.boolean().optional(),
  deliveryFee: z.number().min(0).max(10000).optional(),
  minOrderValue: z.number().min(0).max(100000).optional(),
  consumerCareName: text(80),
  consumerCareEmail: z
    .string()
    .trim()
    .email()
    .or(z.literal(""))
    .transform((v) => v || null)
    .nullable()
    .optional(),
  consumerCarePhone: text(15),
  bankAccountName: text(120),
  bankAccountNumber: z
    .string()
    .trim()
    .regex(/^\d{9,18}$/, "Account number is 9-18 digits")
    .or(z.literal(""))
    .optional(),
  bankIfsc: text(11)
    .transform((v) => v?.toUpperCase() ?? v)
    .refine(
      (v) => !v || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v),
      "IFSC looks like SBIN0001234",
    ),
  upiId: text(80).refine(
    (v) => !v || /^[\w.-]+@[\w]+$/.test(v),
    "UPI ID looks like name@bank",
  ),
  ondcEnabled: z.boolean().optional(),
  ondcDomains: z
    .array(z.string().regex(/^ONDC:RET\d{2}$/))
    .max(10)
    .optional(),
  storefrontEnabled: z.boolean().optional(),
});

export type StoreInput = z.infer<typeof storeInput>;
