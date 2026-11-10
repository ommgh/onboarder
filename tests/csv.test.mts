import assert from "node:assert/strict";
import { test } from "node:test";
import { guessColumn, parseCsv, toCsv } from "../lib/products/csv.ts";

test("round-trips quotes, commas and newlines", () => {
  const rows = [["Name", "Price"], ['Atta "Chakki", 5kg', "280"], ["Multi\nline", ""]];
  assert.deepEqual(parseCsv(toCsv(rows)), rows);
});

test("handles BOM and CRLF from Excel/Tally exports", () => {
  assert.deepEqual(parseCsv("﻿Item Name,Rate\r\nSugar,45\r\n"), [["Item Name", "Rate"], ["Sugar", "45"]]);
});

test("recognises common billing-software headers", () => {
  assert.equal(guessColumn("Item Name"), "name");
  assert.equal(guessColumn("Closing Stock"), "stock");
  assert.equal(guessColumn("MRP"), "mrp");
  assert.equal(guessColumn("HSN/SAC"), "hsnCode");
  assert.equal(guessColumn("EAN Code"), "barcode");
  assert.equal(guessColumn("Shoe size"), null);
});
