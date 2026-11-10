// What a store and its products still need before they can go live on ONDC.
// Pure so the dashboard checklist and the protocol layer agree on the rules.

import { productDomain } from "./catalog.ts";
import { FOOD_CATEGORIES } from "./taxonomy.ts";
import type { OndcProduct, OndcStore } from "./types.ts";

export interface Check {
  id: string;
  label: string;
  ok: boolean;
  hint: string;
  /** settings section the seller should open to fix it */
  fixHref: string;
}

const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const FSSAI = /^\d{14}$/;
const PINCODE = /^[1-9]\d{5}$/;

export function storeChecks(store: OndcStore, sellsFood: boolean): Check[] {
  const settings = "/dashboard/settings#store";
  return [
    {
      id: "address",
      label: "Shop address and pincode",
      ok: Boolean(store.addressLine && store.city && store.state && store.pincode && PINCODE.test(store.pincode)),
      hint: "Buyers see this and delivery partners use it for pickup.",
      fixHref: settings,
    },
    {
      id: "gps",
      label: "Map location",
      ok: store.latitude != null && store.longitude != null,
      hint: "ONDC matches buyers to shops within your delivery radius using GPS.",
      fixHref: settings,
    },
    {
      id: "city",
      label: "ONDC city code",
      ok: Boolean(store.stdCode && /^std:\d{2,5}$/.test(store.stdCode)),
      hint: "Your city's STD code, e.g. std:080 for Bengaluru. Search requests are routed by city.",
      fixHref: settings,
    },
    {
      id: "contact",
      label: "Phone and email",
      ok: Boolean(store.phone && store.email),
      hint: "Buyer apps show this on every order.",
      fixHref: settings,
    },
    {
      id: "care",
      label: "Customer care contact",
      ok: Boolean((store.consumerCarePhone || store.phone) && (store.consumerCareEmail || store.email)),
      hint: "Mandatory for grievance redressal on the network.",
      fixHref: settings,
    },
    {
      id: "gstin",
      label: "GSTIN",
      ok: Boolean(store.gstin && GSTIN.test(store.gstin.toUpperCase())),
      hint: "Required for tax invoices on ONDC orders.",
      fixHref: settings,
    },
    {
      id: "fssai",
      label: "FSSAI licence",
      ok: !sellsFood || Boolean(store.fssaiLicense && FSSAI.test(store.fssaiLicense)),
      hint: "14-digit licence number, mandatory when you sell food or groceries.",
      fixHref: settings,
    },
    {
      id: "fulfillment",
      label: "Delivery or pickup",
      ok: store.deliveryEnabled || store.pickupEnabled,
      hint: "Offer at least one way for buyers to get their order.",
      fixHref: settings,
    },
  ];
}

export interface ProductIssue {
  field: string;
  message: string;
  blocking: boolean;
}

export function productIssues(p: OndcProduct, store?: Pick<OndcStore, "fssaiLicense">): ProductIssue[] {
  const issues: ProductIssue[] = [];
  if (!p.price || p.price <= 0) issues.push({ field: "price", message: "Add a selling price", blocking: true });
  if (!p.ondcCategory) issues.push({ field: "ondcCategory", message: "Pick an ONDC category", blocking: true });
  if (p.stock !== null && p.stock <= 0) issues.push({ field: "stock", message: "Out of stock", blocking: true });
  if (!p.imageUrl && p.images.length === 0)
    issues.push({ field: "imageUrl", message: "Add a photo (a placeholder is used meanwhile)", blocking: false });
  if (p.ondcCategory && FOOD_CATEGORIES.has(p.ondcCategory)) {
    if (!p.vegType) issues.push({ field: "vegType", message: "Mark veg / non-veg", blocking: false });
    if (store && !store.fssaiLicense)
      issues.push({ field: "fssai", message: "Store FSSAI licence missing", blocking: true });
  }
  if (p.type === "PACKAGED" && !p.manufacturer && !p.brand)
    issues.push({ field: "manufacturer", message: "Add manufacturer or brand", blocking: false });
  if (p.mrp && p.price && p.price > p.mrp)
    issues.push({ field: "price", message: "Price is above MRP, which is not allowed", blocking: true });
  return issues;
}

export function isOndcReady(p: OndcProduct, store?: Pick<OndcStore, "fssaiLicense">) {
  return !productIssues(p, store).some((i) => i.blocking) && productDomain(p) !== null;
}
