// Plain shapes the protocol layer works with, decoupled from Prisma so builders stay pure.

export interface OndcStore {
  id: string;
  name: string;
  slug: string;
  tagline?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  fssaiLicense?: string | null;
  addressLine?: string | null;
  locality?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  stdCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openTime: string;
  closeTime: string;
  openDays: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  serviceRadiusKm: number;
  timeToShipMinutes: number;
  returnable: boolean;
  returnWindowHours: number;
  codEnabled: boolean;
  deliveryFee: number;
  minOrderValue: number;
  consumerCareName?: string | null;
  consumerCareEmail?: string | null;
  consumerCarePhone?: string | null;
  ondcDomains: string[];
  updatedAt: Date;
}

export interface OndcProduct {
  id: string;
  name: string;
  description: string;
  brand?: string | null;
  barcode?: string | null;
  price: number | null;
  mrp: number | null;
  stock: number | null;
  unit?: string | null;
  unitValue?: number | null;
  imageUrl: string;
  images: string[];
  variantGroup?: string | null;
  variantLabel?: string | null;
  ondcCategory?: string | null;
  vegType?: string | null;
  manufacturer?: string | null;
  manufacturerAddress?: string | null;
  commonName?: string | null;
  countryOfOrigin: string;
  type: "PACKAGED" | "LOOSE" | "HANDMADE" | "APPAREL";
  updatedAt: Date;
}

// Loose Beckn payload typing: the protocol is large and versioned, so handlers read
// defensively instead of trusting a generated schema.
// biome-ignore lint/suspicious/noExplicitAny: protocol payloads are dynamic JSON
export type Json = any;

export interface BecknContext {
  domain: string;
  country: string;
  city: string;
  action: string;
  core_version: string;
  bap_id: string;
  bap_uri: string;
  bpp_id?: string;
  bpp_uri?: string;
  transaction_id: string;
  message_id: string;
  timestamp: string;
  ttl?: string;
}
