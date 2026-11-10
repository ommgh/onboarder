// Builds ONDC Retail v1.2 `on_search` catalogs from stores and products.
// Shape follows ONDC-RET-Specifications draft-1.x Examples/B2C/on_search/on_search_Grocery.yaml.

import { domainForCategory, FOOD_CATEGORIES, ondcUnit } from "./taxonomy.ts";
import type { Json, OndcProduct, OndcStore } from "./types.ts";

export interface CatalogOptions {
  /** Absolute URL that serves a generated image for products without a photo. */
  placeholderImage: (productId: string) => string;
  /** Domain of the incoming search; only matching products are included. */
  domain: string;
  sellerAppName: string;
  sellerAppSymbol: string;
}

export const locationId = (storeId: string) => `${storeId}-L1`;
export const DELIVERY_FULFILLMENT_ID = "F1";
export const PICKUP_FULFILLMENT_ID = "F2";

const money = (n: number) => n.toFixed(2);
const iso = (d: Date) => d.toISOString();

function isoDuration(minutes: number): string {
  if (minutes % 60 === 0) return `PT${minutes / 60}H`;
  return `PT${minutes}M`;
}

/** "0900" -> "0900"; tolerates "9:00" style input from forms. */
export function hhmm(value: string): string {
  const digits = value.replace(/\D/g, "").padStart(4, "0");
  return digits.slice(-4);
}

export function productDomain(p: OndcProduct): string | null {
  return domainForCategory(p.ondcCategory);
}

export function isProductListable(p: OndcProduct): boolean {
  return Boolean(p.price && p.price > 0 && p.ondcCategory && (p.stock === null || p.stock > 0));
}

export function consumerCare(store: OndcStore): string {
  return [
    store.consumerCareName || store.name,
    store.consumerCareEmail || store.email || "",
    store.consumerCarePhone || store.phone || "",
  ].join(",");
}

function storeFulfillments(store: OndcStore) {
  const contact = { phone: store.phone ?? "", email: store.email ?? "" };
  const out: Json[] = [];
  if (store.deliveryEnabled) out.push({ id: DELIVERY_FULFILLMENT_ID, type: "Delivery", contact });
  if (store.pickupEnabled) out.push({ id: PICKUP_FULFILLMENT_ID, type: "Self-Pickup", contact });
  return out;
}

export function buildItem(store: OndcStore, p: OndcProduct, opts: CatalogOptions): Json {
  const price = p.price ?? 0;
  const images = [p.imageUrl, ...p.images].filter(Boolean);
  if (images.length === 0) images.push(opts.placeholderImage(p.id));
  const isFood = p.ondcCategory ? FOOD_CATEGORIES.has(p.ondcCategory) : false;
  const available = p.stock === null ? 99 : Math.max(0, p.stock);

  const item: Json = {
    id: p.id,
    time: { label: "enable", timestamp: iso(p.updatedAt) },
    descriptor: {
      name: p.name,
      // 1: = EAN/UPC per ONDC descriptor code convention; 5: = other
      code: p.barcode ? `1:${p.barcode}` : `5:${p.id}`,
      symbol: images[0],
      short_desc: p.name,
      long_desc: p.description || p.name,
      images,
    },
    quantity: {
      unitized: {
        measure: {
          unit: ondcUnit(p.unit),
          value: String(p.unitValue ?? 1),
        },
      },
      available: { count: String(Math.min(available, 99)) },
      maximum: { count: String(Math.min(available, 99)) },
    },
    price: {
      currency: "INR",
      value: money(price),
      maximum_value: money(Math.max(p.mrp ?? price, price)),
    },
    category_id: p.ondcCategory,
    fulfillment_id: store.deliveryEnabled ? DELIVERY_FULFILLMENT_ID : PICKUP_FULFILLMENT_ID,
    location_id: locationId(store.id),
    "@ondc/org/returnable": store.returnable,
    "@ondc/org/cancellable": true,
    "@ondc/org/return_window": `PT${store.returnWindowHours}H`,
    "@ondc/org/seller_pickup_return": store.returnable,
    "@ondc/org/time_to_ship": isoDuration(store.timeToShipMinutes),
    "@ondc/org/available_on_cod": store.codEnabled,
    "@ondc/org/contact_details_consumer_care": consumerCare(store),
    tags: [
      { code: "origin", list: [{ code: "country", value: p.countryOfOrigin || "IND" }] },
    ],
  };

  if (p.variantGroup) item.parent_item_id = variantCategoryId(p.variantGroup);

  // Packaged commodities rules apply to anything sold in a sealed pack.
  if (p.type === "PACKAGED" || p.manufacturer) {
    item["@ondc/org/statutory_reqs_packaged_commodities"] = {
      manufacturer_or_packer_name: p.manufacturer || p.brand || store.name,
      manufacturer_or_packer_address:
        p.manufacturerAddress || [store.addressLine, store.city, store.pincode].filter(Boolean).join(", "),
      common_or_generic_name_of_commodity: p.commonName || p.name,
      month_year_of_manufacture_packing_import: "Please refer to the product label",
    };
  }
  if (isFood) {
    if (store.fssaiLicense) {
      item["@ondc/org/statutory_reqs_prepackaged_food"] = {
        brand_owner_FSSAI_license_no: store.fssaiLicense,
        other_FSSAI_license_no: store.fssaiLicense,
        importer_FSSAI_license_no: store.fssaiLicense,
      };
    }
    item.tags.push({
      code: "veg_nonveg",
      list: [
        p.vegType === "nonveg"
          ? { code: "non_veg", value: "yes" }
          : p.vegType === "egg"
            ? { code: "egg", value: "yes" }
            : { code: "veg", value: "yes" },
      ],
    });
  }
  return item;
}

export const variantCategoryId = (group: string) => `VG-${group}`.slice(0, 64);

export function buildProvider(store: OndcStore, products: OndcProduct[], opts: CatalogOptions): Json {
  const listable = products.filter(
    (p) => isProductListable(p) && productDomain(p) === opts.domain,
  );
  const groups = [...new Set(listable.map((p) => p.variantGroup).filter(Boolean))] as string[];
  const gps =
    store.latitude != null && store.longitude != null
      ? `${store.latitude.toFixed(6)},${store.longitude.toFixed(6)}`
      : undefined;
  const symbol = store.logoUrl || opts.placeholderImage(`store-${store.id}`);

  return {
    id: store.id,
    time: { label: "enable", timestamp: iso(store.updatedAt) },
    fulfillments: storeFulfillments(store),
    descriptor: {
      name: store.name,
      symbol,
      short_desc: store.tagline || store.name,
      long_desc: store.description || store.tagline || store.name,
      images: [symbol],
    },
    ttl: "P1D",
    locations: [
      {
        id: locationId(store.id),
        time: {
          label: "enable",
          timestamp: iso(store.updatedAt),
          days: store.openDays,
          schedule: { holidays: [] },
          range: { start: hhmm(store.openTime), end: hhmm(store.closeTime) },
        },
        gps,
        address: {
          locality: store.locality ?? "",
          street: store.addressLine ?? "",
          city: store.city ?? "",
          area_code: store.pincode ?? "",
          state: store.state ?? "",
        },
        circle: {
          gps,
          radius: { unit: "km", value: String(store.serviceRadiusKm) },
        },
      },
    ],
    categories: groups.map((g) => ({
      id: variantCategoryId(g),
      descriptor: { name: listable.find((p) => p.variantGroup === g)?.name.replace(/\s*[-–]\s*[\d.]+\s*\w+$/, "") ?? g },
      tags: [
        { code: "type", list: [{ code: "type", value: "variant_group" }] },
        {
          code: "attr",
          list: [
            { code: "name", value: "item.quantity.unitized.measure" },
            { code: "seq", value: "1" },
          ],
        },
      ],
    })),
    items: listable.map((p) => buildItem(store, p, opts)),
    tags: [
      {
        code: "serviceability",
        list: [
          { code: "location", value: locationId(store.id) },
          { code: "category", value: listable[0]?.ondcCategory ?? "Foodgrains" },
          { code: "type", value: "10" }, // 10 = hyperlocal radius
          { code: "val", value: String(store.serviceRadiusKm) },
          { code: "unit", value: "km" },
        ],
      },
    ],
  };
}

export function buildCatalog(
  entries: { store: OndcStore; products: OndcProduct[] }[],
  opts: CatalogOptions,
): Json {
  const providers = entries
    .map(({ store, products }) => buildProvider(store, products, opts))
    .filter((p) => p.items.length > 0);
  return {
    "bpp/fulfillments": [
      { id: "1", type: "Delivery" },
      { id: "2", type: "Self-Pickup" },
    ],
    "bpp/descriptor": {
      name: opts.sellerAppName,
      symbol: opts.sellerAppSymbol,
      short_desc: "Local shops, online",
      long_desc: `${opts.sellerAppName} helps neighbourhood stores sell on ONDC.`,
      images: [opts.sellerAppSymbol],
    },
    "bpp/providers": providers,
  };
}

/** Great-circle distance in km, for hyperlocal serviceability checks. */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function parseGps(gps: string | undefined | null): [number, number] | null {
  if (!gps) return null;
  const [lat, lng] = gps.split(",").map((s) => Number(s.trim()));
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
}
