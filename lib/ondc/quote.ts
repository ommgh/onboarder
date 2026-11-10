// Prices a buyer's cart for on_select / on_init / on_confirm. Pure and unit-tested.

import { DELIVERY_FULFILLMENT_ID, distanceKm, parseGps } from "./catalog.ts";
import type { Json, OndcProduct, OndcStore } from "./types.ts";

export interface CartLine {
  id: string;
  count: number;
}

export interface QuoteResult {
  quote: Json;
  total: number;
  subtotal: number;
  deliveryFee: number;
  /** ONDC error to return alongside the quote, if any */
  error?: { type: string; code: string; message: string };
  serviceable: boolean;
  lines: { product: OndcProduct; count: number; lineTotal: number }[];
}

const money = (n: number) => n.toFixed(2);

export function priceCart(
  store: OndcStore,
  products: Map<string, OndcProduct>,
  cart: CartLine[],
  buyerGps: string | null | undefined,
  fulfillmentId = DELIVERY_FULFILLMENT_ID,
): QuoteResult {
  const breakup: Json[] = [];
  const lines: QuoteResult["lines"] = [];
  const outOfStock: string[] = [];
  let subtotal = 0;

  for (const line of cart) {
    const product = products.get(line.id);
    const available = product ? (product.stock === null ? 99 : Math.max(0, product.stock)) : 0;
    if (!product || !product.price || available < line.count) outOfStock.push(line.id);
    const unitPrice = product?.price ?? 0;
    const count = product ? Math.min(line.count, available) : 0;
    const lineTotal = unitPrice * count;
    subtotal += lineTotal;
    if (product) lines.push({ product, count, lineTotal });
    breakup.push({
      "@ondc/org/item_id": line.id,
      "@ondc/org/item_quantity": { count },
      title: product?.name ?? "Unavailable item",
      "@ondc/org/title_type": "item",
      price: { currency: "INR", value: money(lineTotal) },
      item: {
        price: { currency: "INR", value: money(unitPrice) },
        quantity: {
          available: { count: String(Math.min(available, 99)) },
          maximum: { count: String(Math.min(available, 99)) },
        },
      },
    });
  }

  const isDelivery = fulfillmentId === DELIVERY_FULFILLMENT_ID;
  const storeGps =
    store.latitude != null && store.longitude != null ? ([store.latitude, store.longitude] as [number, number]) : null;
  const buyer = parseGps(buyerGps);
  const serviceable =
    !isDelivery || !storeGps || !buyer || distanceKm(storeGps, buyer) <= store.serviceRadiusKm;

  const deliveryFee = isDelivery && serviceable ? store.deliveryFee : 0;
  breakup.push({
    "@ondc/org/item_id": fulfillmentId,
    title: "Delivery charges",
    "@ondc/org/title_type": "delivery",
    price: { currency: "INR", value: money(deliveryFee) },
  });

  const total = subtotal + deliveryFee;
  let error: QuoteResult["error"];
  if (outOfStock.length) {
    error = {
      type: "DOMAIN-ERROR",
      code: "40002",
      message: JSON.stringify(outOfStock.map((item_id) => ({ item_id, error: "40002" }))),
    };
  } else if (!serviceable) {
    error = { type: "DOMAIN-ERROR", code: "30009", message: "Location not serviceable by seller" };
  } else if (store.minOrderValue > 0 && subtotal < store.minOrderValue) {
    error = {
      type: "DOMAIN-ERROR",
      code: "30023",
      message: `Minimum order value is ₹${store.minOrderValue}`,
    };
  }

  return {
    quote: { price: { currency: "INR", value: money(total) }, breakup, ttl: "P1D" },
    total,
    subtotal,
    deliveryFee,
    error,
    serviceable,
    lines,
  };
}
