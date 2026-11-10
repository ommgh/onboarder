import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreListing } from "../lib/products/quality.ts";

const base = {
  name: "Aashirvaad Whole Wheat Atta 5 kg",
  description:
    "Made from the finest whole wheat grains, ground the traditional chakki way for soft, fluffy rotis every day.",
  type: "PACKAGED" as const,
  imageUrl: "https://x/a.png",
  images: ["https://x/b.png"],
  price: 280,
  mrp: 300,
  stock: 10,
  barcode: "8901725121203",
  brand: "Aashirvaad",
  unit: "kg",
  unitValue: 5,
  ondcCategory: "Atta, Flours and Sooji",
  category: "Grocery",
};

test("a complete listing scores 100 with no suggestions", () => {
  const r = scoreListing(base);
  assert.equal(r.score, 100);
  assert.deepEqual(r.suggestions, []);
});

test("a bare scan scores low and leads with the most valuable fixes", () => {
  const r = scoreListing({
    ...base,
    name: "ATTA",
    description: "",
    imageUrl: "",
    images: [],
    price: null,
    mrp: null,
  });
  assert.ok(r.score < 40, `score ${r.score}`);
  assert.deepEqual(
    r.suggestions
      .slice(0, 2)
      .map((s) => s.id)
      .sort(),
    ["photo", "price"],
  );
  assert.ok(r.suggestions.find((s) => s.id === "description")?.ai);
});

import { productInput } from "../lib/products/schema.ts";

test("product images must be https", () => {
  const base = { name: "Tea" };
  assert.ok(
    productInput.safeParse({ ...base, imageUrl: "https://x.ufs.sh/a.png" })
      .success,
  );
  assert.ok(
    !productInput.safeParse({ ...base, imageUrl: "javascript:alert(1)" })
      .success,
  );
  assert.ok(
    !productInput.safeParse({
      ...base,
      images: ["http://insecure.example/a.png"],
    }).success,
  );
  assert.ok(productInput.safeParse({ ...base, imageUrl: "" }).success);
});
