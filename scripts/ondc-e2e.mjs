// End-to-end ONDC seller-app test against a mock buyer app.
//
// Prerequisites: demo data (scripts/seed-demo.mts, run fresh), ONDC_* keys in .env.local with
// ONDC_VERIFY_SIGNATURES=false, the dev server on :3000 and the mock BAP on :4555:
//   node scripts/ondc-mock-bap.mjs /tmp/ondc-callbacks.jsonl &
//   node --env-file=.env.local scripts/ondc-e2e.mjs /tmp/ondc-callbacks.jsonl

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import {
  parseAuthorizationHeader,
  verifyAuthorizationHeader,
} from "../lib/ondc/crypto.ts";

const BASE = "http://localhost:3000";
const CB = process.argv[2];
const PUB = process.env.ONDC_SIGNING_PUBLIC_KEY;
let cookie = "";
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) process.exitCode = 1;
};
async function req(path, opts = {}) {
  const r = await fetch(BASE + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      cookie,
      ...(opts.headers ?? {}),
    },
    redirect: "manual",
  });
  const sc = r.headers.getSetCookie?.() ?? [];
  if (sc.length)
    cookie = [cookie, ...sc.map((c) => c.split(";")[0])]
      .filter(Boolean)
      .join("; ");
  return r;
}
const callbacks = () =>
  readFileSync(CB, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
async function waitFor(action, txn, after = 0) {
  for (let i = 0; i < 60; i++) {
    const hit = callbacks()
      .slice(after)
      .find(
        (c) =>
          c.body.context?.action === action &&
          c.body.context?.transaction_id === txn,
      );
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no ${action} callback`);
}
const txn = randomUUID();
const ctx = (action) => ({
  domain: "ONDC:RET10",
  country: "IND",
  city: "std:080",
  action,
  core_version: "1.2.0",
  bap_id: "mockbap.local",
  bap_uri: "http://localhost:4555/",
  transaction_id: txn,
  message_id: randomUUID(),
  timestamp: new Date().toISOString(),
  ttl: "PT30S",
});
const send = (action, message) =>
  req(`/api/ondc/${action}`, {
    method: "POST",
    body: JSON.stringify({ context: ctx(action), message }),
  }).then((r) => r.json());

// login
const { csrfToken } = await (await req("/api/auth/csrf")).json();
await req("/api/auth/callback/credentials", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    csrfToken,
    email: "demo@onboarder.local",
    password: "demo1234",
  }),
});

// compliance gate
let r = await req("/api/store", {
  method: "PATCH",
  body: JSON.stringify({ ondcEnabled: true }),
});
ok(
  r.status === 422 && /gstin/i.test((await r.json()).error),
  "go-live refused while GSTIN/FSSAI are missing",
);
r = await req("/api/store", {
  method: "PATCH",
  body: JSON.stringify({
    gstin: "29ABCDE1234F1Z5",
    fssaiLicense: "12345678901234",
  }),
});
ok(r.ok, "compliance details saved");
r = await req("/api/store", {
  method: "PATCH",
  body: JSON.stringify({ ondcEnabled: true }),
});
ok(r.ok, "go-live accepted once compliant");

// search
let mark = callbacks().length;
const ack = await send("search", {
  intent: {
    fulfillment: { type: "Delivery" },
    category: { id: "Dals and Pulses" },
  },
});
ok(ack.message?.ack?.status === "ACK", "search ACKed synchronously");
const onSearch = await waitFor("on_search", txn, mark);
const header = parseAuthorizationHeader(onSearch.auth);
ok(
  header &&
    verifyAuthorizationHeader(JSON.stringify(onSearch.body), header, PUB),
  "on_search signature verifies against our public key",
);
const provider = onSearch.body.message.catalog["bpp/providers"][0];
ok(
  provider?.items.every((i) => i.category_id === "Dals and Pulses") &&
    provider.items.length === 3,
  `on_search returned ${provider?.items.length} toor dal packs, category filtered`,
);
ok(
  provider.categories[0]?.tags[0].list[0].value === "variant_group",
  "pack sizes grouped as a variant group",
);
const dal = provider.items.find(
  (i) => i.quantity.unitized.measure.value === "1",
);

// add Tata Salt (tracked stock) via a second search by name
mark = callbacks().length;
await send("search", {
  intent: { item: { descriptor: { name: "Tata Salt" } } },
});
const salt = (await waitFor("on_search", txn, mark)).body.message.catalog[
  "bpp/providers"
][0].items[0];
ok(
  salt?.descriptor.name.startsWith("Tata Salt") &&
    salt.quantity.available.count === "40",
  "item-name search finds Tata Salt with stock 40",
);

const items = [
  { id: dal.id, quantity: { count: 2 }, location_id: `${provider.id}-L1` },
  { id: salt.id, quantity: { count: 2 }, location_id: `${provider.id}-L1` },
];
const end = {
  location: {
    gps: "12.9300,77.5900",
    address: {
      name: "Anita",
      building: "12, 5th Cross",
      locality: "Jayanagar",
      city: "Bengaluru",
      area_code: "560041",
      state: "KA",
    },
  },
  contact: { phone: "9900011122" },
};

// select
mark = callbacks().length;
await send("select", {
  order: { provider: { id: provider.id }, items, fulfillments: [{ end }] },
});
const onSelect = await waitFor("on_select", txn, mark);
const expectTotal =
  2 * Number(dal.price.value) + 2 * Number(salt.price.value) + 20;
ok(
  Number(onSelect.body.message.order.quote.price.value) === expectTotal &&
    !onSelect.body.error,
  `on_select quote ₹${onSelect.body.message.order.quote.price.value} = items + ₹20 delivery`,
);

// out-of-range buyer
mark = callbacks().length;
await send("select", {
  order: {
    provider: { id: provider.id },
    items,
    fulfillments: [{ end: { location: { gps: "13.2000,77.7000" } } }],
  },
});
ok(
  (await waitFor("on_select", txn, mark)).body.error?.code === "30009",
  "far-away buyer gets 30009 not serviceable",
);

// init
mark = callbacks().length;
await send("init", {
  order: {
    provider: { id: provider.id },
    items,
    billing: {
      name: "Anita",
      phone: "9900011122",
      address: end.location.address,
    },
    fulfillments: [{ type: "Delivery", end }],
    payment: { type: "ON-ORDER", collected_by: "BAP" },
  },
});
const onInit = await waitFor("on_init", txn, mark);
ok(
  onInit.body.message.order.tags[0].list.find((t) => t.code === "tax_number")
    .value === "29ABCDE1234F1Z5",
  "on_init carries the seller GSTIN",
);

// confirm
const orderId = `E2E-${Date.now()}`;
mark = callbacks().length;
await send("confirm", {
  order: {
    id: orderId,
    state: "Created",
    provider: { id: provider.id },
    items,
    billing: { name: "Anita", phone: "9900011122" },
    fulfillments: [{ type: "Delivery", end }],
    payment: { type: "ON-ORDER", status: "PAID" },
  },
});
const onConfirm = await waitFor("on_confirm", txn, mark);
ok(
  onConfirm.body.message.order.state === "Accepted" &&
    onConfirm.body.message.order.fulfillments[0].state.descriptor.code ===
      "Pending",
  "on_confirm: order Accepted, fulfillment Pending",
);
let p = await (await req(`/api/products/${salt.id}`)).json();
ok(
  p.product.stock === 38,
  `Tata Salt stock decremented 40 → ${p.product.stock}`,
);

// duplicate confirm is idempotent
mark = callbacks().length;
await send("confirm", {
  order: {
    id: orderId,
    provider: { id: provider.id },
    items,
    fulfillments: [{ end }],
    payment: { type: "ON-ORDER", status: "PAID" },
  },
});
await waitFor("on_confirm", txn, mark);
p = await (await req(`/api/products/${salt.id}`)).json();
ok(p.product.stock === 38, "repeated confirm does not double-decrement stock");

// seller marks packed from the dashboard -> unsolicited on_status
const dbo = await new PrismaClient().order.findFirstOrThrow({
  where: { externalId: orderId },
});
const ours = ["", dbo.id, dbo.orderNumber];
mark = callbacks().length;
r = await req(`/api/orders/${ours[1]}`, {
  method: "PATCH",
  body: JSON.stringify({ status: "PACKED" }),
});
ok(r.ok, `seller marked ${ours[2]} packed`);
const pushed = await waitFor("on_status", txn, mark);
ok(
  pushed.body.message.order.fulfillments[0].state.descriptor.code === "Packed",
  "buyer app received unsolicited on_status: Packed",
);

// status pull
mark = callbacks().length;
await send("status", { order_id: orderId });
ok(
  (await waitFor("on_status", txn, mark)).body.message.order.state ===
    "In-progress",
  "status pull returns In-progress",
);

// buyer cancels -> stock restored
mark = callbacks().length;
await send("cancel", { order_id: orderId, cancellation_reason_id: "001" });
const onCancel = await waitFor("on_cancel", txn, mark);
p = await (await req(`/api/products/${salt.id}`)).json();
ok(
  onCancel.body.message.order.state === "Cancelled" && p.product.stock === 40,
  `on_cancel: Cancelled, stock restored to ${p.product.stock}`,
);

// unsupported + malformed
const upd = await send("update", {});
ok(upd.message.ack.status === "NACK", "update is NACKed with a clear error");
r = await fetch(`${BASE}/api/ondc/search`, {
  method: "POST",
  body: "not json",
});
ok(r.status === 400, "malformed body rejected with 400");
