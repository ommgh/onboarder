import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCatalog,
  distanceKm,
  hhmm,
  parseGps,
} from "../lib/ondc/catalog.ts";
import { productIssues, storeChecks } from "../lib/ondc/readiness.ts";
import type { OndcProduct, OndcStore } from "../lib/ondc/types.ts";

const now = new Date("2026-11-10T08:00:00.000Z");
const store: OndcStore = {
  id: "store1",
  name: "Sharma Kirana",
  slug: "sharma-kirana",
  phone: "9886098860",
  email: "shop@example.com",
  gstin: "29ABCDE1234F1Z5",
  fssaiLicense: "12345678901234",
  addressLine: "Jayanagar 4th Block",
  locality: "Jayanagar",
  city: "Bengaluru",
  state: "KA",
  pincode: "560011",
  stdCode: "std:080",
  latitude: 12.9255,
  longitude: 77.5937,
  openTime: "9:00",
  closeTime: "2100",
  openDays: "1,2,3,4,5,6,7",
  deliveryEnabled: true,
  pickupEnabled: true,
  serviceRadiusKm: 3,
  timeToShipMinutes: 45,
  returnable: true,
  returnWindowHours: 1,
  codEnabled: false,
  deliveryFee: 20,
  minOrderValue: 0,
  ondcDomains: ["ONDC:RET10"],
  updatedAt: now,
};
const atta = (id: string, kg: number, price: number): OndcProduct => ({
  id,
  name: `Chakki Atta - ${kg} kg`,
  description: "Stone-ground whole wheat",
  brand: null,
  barcode: null,
  price,
  mrp: price,
  stock: null,
  unit: "kg",
  unitValue: kg,
  imageUrl: "",
  images: [],
  variantGroup: "atta",
  variantLabel: `${kg} kg`,
  ondcCategory: "Atta, Flours and Sooji",
  vegType: "veg",
  countryOfOrigin: "IND",
  type: "LOOSE",
  updatedAt: now,
});
const opts = {
  domain: "ONDC:RET10",
  sellerAppName: "Onboarder",
  sellerAppSymbol: "https://onboarder.store/logo.png",
  placeholderImage: (id: string) =>
    `https://onboarder.store/api/placeholder/${id}`,
};

test("builds a grocery provider with a weight variant group", () => {
  const products = [
    atta("p1", 1, 65),
    atta("p2", 5, 300),
    { ...atta("p3", 1, 0), name: "Unpriced", variantGroup: null }, // not listable
    { ...atta("p4", 1, 50), ondcCategory: "Shirts", variantGroup: null }, // other domain
    {
      ...atta("p5", 1, 99),
      type: "PACKAGED" as const,
      barcode: "8901725181222",
      stock: 4,
      manufacturer: "ITC",
      variantGroup: null,
      name: "Aashirvaad Atta 1kg",
    },
  ];
  const catalog = buildCatalog([{ store, products }], opts);
  const provider = catalog["bpp/providers"][0];
  assert.equal(provider.id, "store1");
  assert.deepEqual(
    provider.items.map((i: { id: string }) => i.id),
    ["p1", "p2", "p5"],
  );
  assert.equal(provider.categories.length, 1);
  assert.equal(provider.categories[0].tags[0].list[0].value, "variant_group");
  assert.equal(provider.categories[0].descriptor.name, "Chakki Atta");

  const [i1, , i5] = provider.items;
  assert.equal(i1.parent_item_id, provider.categories[0].id);
  assert.deepEqual(i1.quantity.unitized.measure, {
    unit: "kilogram",
    value: "1",
  });
  assert.equal(i1.quantity.available.count, "99");
  assert.deepEqual(i1.price, {
    currency: "INR",
    value: "65.00",
    maximum_value: "65.00",
  });
  assert.equal(i1["@ondc/org/time_to_ship"], "PT45M");
  assert.equal(i1["@ondc/org/return_window"], "PT1H");
  assert.equal(
    i1.descriptor.images[0],
    "https://onboarder.store/api/placeholder/p1",
  );
  assert.equal(
    i1["@ondc/org/statutory_reqs_prepackaged_food"]
      .brand_owner_FSSAI_license_no,
    "12345678901234",
  );
  assert.ok(
    !i1["@ondc/org/statutory_reqs_packaged_commodities"],
    "loose goods are not packaged commodities",
  );
  assert.deepEqual(
    i1.tags.find((t: { code: string }) => t.code === "veg_nonveg").list,
    [{ code: "veg", value: "yes" }],
  );

  assert.equal(i5.descriptor.code, "1:8901725181222");
  assert.equal(i5.quantity.available.count, "4");
  assert.equal(
    i5["@ondc/org/statutory_reqs_packaged_commodities"]
      .manufacturer_or_packer_name,
    "ITC",
  );

  const loc = provider.locations[0];
  assert.equal(loc.gps, "12.925500,77.593700");
  assert.deepEqual(loc.time.range, { start: "0900", end: "2100" });
  assert.equal(loc.circle.radius.value, "3");
  assert.equal(provider.tags[0].code, "serviceability");
});

test("drops providers with nothing to sell", () => {
  const catalog = buildCatalog([{ store, products: [atta("x", 1, 0)] }], opts);
  assert.equal(catalog["bpp/providers"].length, 0);
});

test("readiness flags exactly what is missing", () => {
  const bare: OndcStore = {
    ...store,
    gstin: null,
    fssaiLicense: null,
    latitude: null,
    longitude: null,
    stdCode: null,
  };
  const failing = storeChecks(bare, true)
    .filter((c) => !c.ok)
    .map((c) => c.id);
  assert.deepEqual(failing, ["gps", "city", "gstin", "fssai"]);
  assert.deepEqual(
    storeChecks(store, true).filter((c) => !c.ok),
    [],
  );

  const issues = productIssues({ ...atta("q", 1, 80), mrp: 70 }, bare).map(
    (i) => i.message,
  );
  assert.ok(issues.includes("Price is above MRP, which is not allowed"));
  assert.ok(issues.includes("Store FSSAI licence missing"));
});

test("geo helpers", () => {
  assert.equal(hhmm("9:30"), "0930");
  assert.deepEqual(parseGps("12.9, 77.5"), [12.9, 77.5]);
  assert.equal(parseGps("nope"), null);
  const d = distanceKm([12.9255, 77.5937], [12.9352, 77.6245]); // Jayanagar -> Koramangala
  assert.ok(d > 3 && d < 4, `got ${d}`);
});

import { guessOndcCategory } from "../lib/ondc/taxonomy.ts";

test("guesses ONDC categories from scanned product text", () => {
  assert.equal(guessOndcCategory("Yippee noodles"), "Pasta, Soup and Noodles");
  assert.equal(
    guessOndcCategory("Aashirvaad Atta 5kg"),
    "Atta, Flours and Sooji",
  );
  assert.equal(
    guessOndcCategory("Surf Excel Detergent"),
    "Cleaning & Household",
  );
  assert.equal(guessOndcCategory("Mystery item"), null);
});
