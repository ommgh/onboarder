import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatQuantity,
  packPrice,
  parseQuantity,
} from "../lib/products/units.ts";

test("parses pack sizes in the formats printed on Indian packs", () => {
  assert.deepEqual(parseQuantity("Aashirvaad Atta 5 Kg"), {
    unit: "kg",
    value: 5,
  });
  assert.deepEqual(parseQuantity("500g"), { unit: "g", value: 500 });
  assert.deepEqual(parseQuantity("1,5 L"), { unit: "l", value: 1.5 });
  assert.deepEqual(parseQuantity("200 ML"), { unit: "ml", value: 200 });
  assert.deepEqual(parseQuantity("6 pcs"), { unit: "piece", value: 6 });
  assert.equal(parseQuantity("family size"), null);
});

test("pack prices scale from a per-kg rate", () => {
  assert.equal(packPrice(60, 500, "g"), 30);
  assert.equal(packPrice(60, 5, "kg"), 300);
  assert.equal(packPrice(180, 250, "ml"), 45);
});

test("formats quantities for labels", () => {
  assert.equal(formatQuantity(1, "kg"), "1 kg");
  assert.equal(formatQuantity(0.5, "l"), "0.5 L");
  assert.equal(formatQuantity(12, "piece"), "12 pcs");
});

import { inr, inrCompact } from "../lib/format.ts";

test("rupee formatting drops paise on whole amounts and compacts for axes", () => {
  assert.equal(inr(111547), "₹1,11,547");
  assert.equal(inr(65.5), "₹65.50");
  assert.equal(inrCompact(8000), "₹8k");
  assert.equal(inrCompact(125000), "₹1.3L");
  assert.equal(inrCompact(0), "₹0");
});
