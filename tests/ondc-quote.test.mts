import assert from "node:assert/strict";
import { test } from "node:test";
import { priceCart } from "../lib/ondc/quote.ts";
import type { OndcProduct, OndcStore } from "../lib/ondc/types.ts";

const now = new Date();
const store = {
  id: "s", name: "S", latitude: 12.9255, longitude: 77.5937, serviceRadiusKm: 3, deliveryFee: 20,
  minOrderValue: 0, updatedAt: now,
} as OndcStore;
const p = (id: string, price: number, stock: number | null): OndcProduct =>
  ({ id, name: id, price, stock, images: [], imageUrl: "", updatedAt: now } as unknown as OndcProduct);
const products = new Map([["a", p("a", 65, null)], ["b", p("b", 30, 2)]]);

test("prices a serviceable cart with delivery", () => {
  const r = priceCart(store, products, [{ id: "a", count: 2 }, { id: "b", count: 1 }], "12.93,77.60");
  assert.equal(r.error, undefined);
  assert.equal(r.subtotal, 160);
  assert.equal(r.total, 180);
  assert.equal(r.quote.price.value, "180.00");
  assert.equal(r.quote.breakup.length, 3);
  assert.equal(r.quote.breakup[2]["@ondc/org/title_type"], "delivery");
});

test("reports out-of-stock items with code 40002", () => {
  const r = priceCart(store, products, [{ id: "b", count: 5 }, { id: "zz", count: 1 }], null);
  assert.equal(r.error?.code, "40002");
  assert.deepEqual(JSON.parse(r.error!.message).map((e: { item_id: string }) => e.item_id), ["b", "zz"]);
  assert.equal(r.quote.breakup[0]["@ondc/org/item_quantity"].count, 2);
});

test("rejects buyers outside the delivery radius", () => {
  const r = priceCart(store, products, [{ id: "a", count: 1 }], "13.10,77.60");
  assert.equal(r.serviceable, false);
  assert.equal(r.error?.code, "30009");
  assert.equal(r.deliveryFee, 0);
});

test("pickup ignores distance and charges no delivery", () => {
  const r = priceCart(store, products, [{ id: "a", count: 1 }], "13.10,77.60", "F2");
  assert.equal(r.error, undefined);
  assert.equal(r.total, 65);
});

test("enforces minimum order value", () => {
  const r = priceCart({ ...store, minOrderValue: 100 }, products, [{ id: "a", count: 1 }], null);
  assert.equal(r.error?.code, "30023");
});
