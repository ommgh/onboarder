import "server-only";
import { randomUUID } from "node:crypto";
import type { Order, OrderItem, OrderStatus, Store } from "@prisma/client";
import { appUrl } from "@/lib/config";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/server/crypto";
import { nextOrderNumber } from "@/lib/server/orders";
import {
  buildCatalog,
  DELIVERY_FULFILLMENT_ID,
  locationId,
  PICKUP_FULFILLMENT_ID,
} from "./catalog";
import { priceCart } from "./quote";
import {
  ACK,
  callbackContext,
  logOndc,
  nack,
  placeholderImage,
  sendCallback,
  toOndcProduct,
  toOndcStore,
  type VerifyResult,
} from "./server";
import type { BecknContext, Json } from "./types";

export const SUPPORTED_ACTIONS = [
  "search",
  "select",
  "init",
  "confirm",
  "status",
  "cancel",
  "track",
  "support",
  "update",
] as const;
export type OndcAction = (typeof SUPPORTED_ACTIONS)[number];

/**
 * Validates and acknowledges an incoming request. Returns the synchronous response plus
 * a deferred job that sends the asynchronous callback (run it after responding).
 */
export async function receive(
  action: OndcAction,
  rawBody: string,
  verification: VerifyResult,
): Promise<{ status: number; body: Json; job?: () => Promise<void> }> {
  let payload: Json;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return {
      status: 400,
      body: nack("JSON-SCHEMA-ERROR", "10000", "Body is not valid JSON"),
    };
  }
  const ctx = payload?.context as BecknContext | undefined;
  await logOndc({
    context: ctx ?? { action },
    direction: "in",
    payload,
    ok: verification.ok,
  });

  if (!verification.ok) {
    return {
      status: 401,
      body: nack("POLICY-ERROR", "10002", verification.reason),
    };
  }
  if (
    !ctx?.transaction_id ||
    !ctx.message_id ||
    !ctx.bap_uri ||
    ctx.action !== action
  ) {
    return {
      status: 400,
      body: nack("CONTEXT-ERROR", "10000", "Invalid or missing context"),
    };
  }
  if (action === "update") {
    return {
      status: 200,
      body: nack(
        "DOMAIN-ERROR",
        "40000",
        "Order updates are not supported by this seller",
      ),
    };
  }

  const job = async () => {
    try {
      await JOBS[action](ctx, payload.message ?? {});
    } catch (e) {
      console.error(`[ondc] ${action} failed`, e);
    }
  };
  return { status: 200, body: ACK, job };
}

const JOBS: Record<
  Exclude<OndcAction, "update">,
  (ctx: BecknContext, message: Json) => Promise<void>
> = {
  search: onSearch,
  select: onSelect,
  init: onInit,
  confirm: onConfirm,
  status: onStatus,
  cancel: onCancel,
  track: onTrack,
  support: onSupport,
};

// ---------------------------------------------------------------------------------------

async function onSearch(ctx: BecknContext, message: Json) {
  const intent = message.intent ?? {};
  const itemName: string | undefined = intent.item?.descriptor?.name;
  const categoryId: string | undefined = intent.category?.id;
  const providerId: string | undefined = intent.provider?.id;

  const stores = await db.store.findMany({
    where: {
      ondcEnabled: true,
      ondcDomains: { has: ctx.domain },
      ...(ctx.city && ctx.city !== "*" ? { stdCode: ctx.city } : {}),
      ...(providerId ? { id: providerId } : {}),
    },
    take: 200,
  });
  if (stores.length === 0) return; // spec: stay silent when nothing matches

  const products = await db.product.findMany({
    where: {
      userId: { in: stores.map((s) => s.userId) },
      status: "ACTIVE",
      ...(categoryId ? { ondcCategory: categoryId } : {}),
      ...(itemName
        ? { name: { contains: itemName, mode: "insensitive" } }
        : {}),
    },
  });

  const catalog = buildCatalog(
    stores.map((s) => ({
      store: toOndcStore(s),
      products: products
        .filter((p) => p.userId === s.userId)
        .map(toOndcProduct),
    })),
    {
      domain: ctx.domain,
      placeholderImage,
      sellerAppName: "Onboarder",
      sellerAppSymbol: `${appUrl()}/favicon/web-app-manifest-512x512.png`,
    },
  );
  if (catalog["bpp/providers"].length === 0) return;

  // Mark these products as live on ONDC for the seller's dashboard.
  const listed = catalog["bpp/providers"].flatMap((p: Json) =>
    p.items.map((i: Json) => i.id as string),
  );
  await markListed(listed);
  await sendCallback(callbackContext(ctx, "on_search"), { catalog });
}

async function markListed(productIds: string[]) {
  if (!productIds.length) return;
  const now = new Date();
  await db
    .$transaction(
      productIds.map((productId) =>
        db.channelListing.upsert({
          where: { productId_provider: { productId, provider: "ONDC" } },
          create: {
            productId,
            provider: "ONDC",
            status: "LIVE",
            syncedAt: now,
          },
          update: { status: "LIVE", syncedAt: now, message: null },
        }),
      ),
    )
    .catch(() => undefined);
}

// ---------------------------------------------------------------------------------------

async function loadCart(order: Json) {
  const store = await db.store.findUnique({
    where: { id: order?.provider?.id ?? "" },
  });
  if (!store || !store.ondcEnabled) return null;
  const ids: string[] = (order.items ?? []).map((i: Json) => String(i.id));
  const products = await db.product.findMany({
    where: { userId: store.userId, id: { in: ids }, status: "ACTIVE" },
  });
  const map = new Map(products.map((p) => [p.id, toOndcProduct(p)]));
  const cart = (order.items ?? []).map((i: Json) => ({
    id: String(i.id),
    count: Math.max(1, Number(i.quantity?.count ?? 1)),
  }));
  const fulfillment = order.fulfillments?.[0] ?? {};
  const wantsPickup =
    fulfillment.type === "Self-Pickup" || !store.deliveryEnabled;
  const fulfillmentId = wantsPickup
    ? PICKUP_FULFILLMENT_ID
    : DELIVERY_FULFILLMENT_ID;
  const priced = priceCart(
    toOndcStore(store),
    map,
    cart,
    fulfillment.end?.location?.gps,
    fulfillmentId,
  );
  return { store, cart, priced, fulfillment, fulfillmentId };
}

function fulfillmentBlock(
  store: Store,
  fulfillmentId: string,
  requested: Json,
  stateCode: string,
) {
  return {
    ...requested,
    id: fulfillmentId,
    type: fulfillmentId === PICKUP_FULFILLMENT_ID ? "Self-Pickup" : "Delivery",
    "@ondc/org/provider_name": store.name,
    "@ondc/org/category": "Immediate Delivery",
    "@ondc/org/TAT": `PT${store.timeToShipMinutes + 30}M`,
    tracking: false,
    state: { descriptor: { code: stateCode } },
    start: {
      location: {
        id: locationId(store.id),
        descriptor: { name: store.name },
        gps:
          store.latitude != null
            ? `${store.latitude},${store.longitude}`
            : undefined,
        address: {
          locality: store.locality ?? "",
          city: store.city ?? "",
          area_code: store.pincode ?? "",
          state: store.state ?? "",
        },
      },
      contact: { phone: store.phone ?? "", email: store.email ?? "" },
    },
  };
}

async function onSelect(ctx: BecknContext, message: Json) {
  const order = message.order ?? {};
  const loaded = await loadCart(order);
  const out = callbackContext(ctx, "on_select");
  if (!loaded) {
    await sendCallback(
      out,
      {},
      { type: "DOMAIN-ERROR", code: "30001", message: "Provider not found" },
    );
    return;
  }
  const { store, cart, priced, fulfillmentId } = loaded;
  await sendCallback(
    out,
    {
      order: {
        provider: { id: store.id, locations: [{ id: locationId(store.id) }] },
        items: cart.map((l: { id: string }) => ({
          id: l.id,
          fulfillment_id: fulfillmentId,
        })),
        fulfillments: [
          {
            id: fulfillmentId,
            "@ondc/org/provider_name": store.name,
            tracking: false,
            "@ondc/org/category": "Immediate Delivery",
            "@ondc/org/TAT": `PT${store.timeToShipMinutes + 30}M`,
            state: {
              descriptor: {
                code: priced.serviceable ? "Serviceable" : "Non-serviceable",
              },
            },
          },
        ],
        quote: priced.quote,
      },
    },
    priced.error,
  );
}

function settlementDetails(store: Store) {
  if (store.upiId) {
    return [
      {
        settlement_counterparty: "seller-app",
        settlement_phase: "sale-amount",
        settlement_type: "upi",
        beneficiary_name:
          store.bankAccountName ?? store.legalName ?? store.name,
        upi_address: store.upiId,
      },
    ];
  }
  if (store.bankAccountEncrypted && store.bankIfsc) {
    return [
      {
        settlement_counterparty: "seller-app",
        settlement_phase: "sale-amount",
        settlement_type: "neft",
        beneficiary_name:
          store.bankAccountName ?? store.legalName ?? store.name,
        settlement_bank_account_no: decrypt(store.bankAccountEncrypted),
        settlement_ifsc_code: store.bankIfsc,
      },
    ];
  }
  return [];
}

async function onInit(ctx: BecknContext, message: Json) {
  const order = message.order ?? {};
  const loaded = await loadCart(order);
  const out = callbackContext(ctx, "on_init");
  if (!loaded) {
    await sendCallback(
      out,
      {},
      { type: "DOMAIN-ERROR", code: "30001", message: "Provider not found" },
    );
    return;
  }
  const { store, cart, priced, fulfillment, fulfillmentId } = loaded;
  await sendCallback(
    out,
    {
      order: {
        provider: { id: store.id },
        provider_location: { id: locationId(store.id) },
        items: cart.map((l: { id: string; count: number }) => ({
          id: l.id,
          fulfillment_id: fulfillmentId,
          quantity: { count: l.count },
        })),
        billing: order.billing,
        fulfillments: [{ ...fulfillment, id: fulfillmentId, tracking: false }],
        quote: priced.quote,
        payment: {
          ...order.payment,
          "@ondc/org/settlement_details": settlementDetails(store),
        },
        tags: [
          {
            code: "bpp_terms",
            list: [
              { code: "tax_number", value: store.gstin ?? "" },
              { code: "provider_tax_number", value: store.gstin ?? "" },
              { code: "np_type", value: "MSN" },
              { code: "accept_bap_terms", value: "Y" },
            ],
          },
          ...(order.tags ?? []),
        ],
      },
    },
    priced.error,
  );
}

const ORDER_STATE: Record<OrderStatus, [string, string]> = {
  CREATED: ["Created", "Pending"],
  ACCEPTED: ["Accepted", "Pending"],
  PACKED: ["In-progress", "Packed"],
  OUT_FOR_DELIVERY: ["In-progress", "Out-for-delivery"],
  DELIVERED: ["Completed", "Order-delivered"],
  CANCELLED: ["Cancelled", "Cancelled"],
  RETURNED: ["Completed", "Order-delivered"],
};

function orderPayload(
  order: Order & { items: OrderItem[] },
  store: Store,
): Json {
  const data = (order.channelData ?? {}) as Json;
  const confirmed = data.order ?? {};
  const [state, fState] = ORDER_STATE[order.status];
  const fulfillmentId: string = data.fulfillmentId ?? DELIVERY_FULFILLMENT_ID;
  return {
    ...confirmed,
    id: order.externalId,
    state,
    provider: { id: store.id, locations: [{ id: locationId(store.id) }] },
    items: order.items.map((i) => ({
      id: i.productId,
      fulfillment_id: fulfillmentId,
      quantity: { count: i.quantity },
    })),
    fulfillments: [
      fulfillmentBlock(
        store,
        fulfillmentId,
        confirmed.fulfillments?.[0] ?? {},
        fState,
      ),
    ],
    created_at: order.createdAt.toISOString(),
    updated_at: order.updatedAt.toISOString(),
    ...(order.status === "CANCELLED" && data.cancellation
      ? { cancellation: data.cancellation }
      : {}),
  };
}

async function onConfirm(ctx: BecknContext, message: Json) {
  const order = message.order ?? {};
  const out = callbackContext(ctx, "on_confirm");
  const externalId = String(order.id ?? "");
  if (!externalId) {
    await sendCallback(
      out,
      {},
      { type: "DOMAIN-ERROR", code: "30000", message: "order.id is required" },
    );
    return;
  }

  const existing = await db.order.findUnique({
    where: { source_externalId: { source: "ONDC", externalId } },
    include: { items: true },
  });
  if (existing) {
    const store = await db.store.findUniqueOrThrow({
      where: { userId: existing.userId },
    });
    await sendCallback(out, { order: orderPayload(existing, store) });
    return;
  }

  const loaded = await loadCart(order);
  if (!loaded) {
    await sendCallback(
      out,
      {},
      { type: "DOMAIN-ERROR", code: "30001", message: "Provider not found" },
    );
    return;
  }
  const { store, priced, fulfillment, fulfillmentId } = loaded;
  if (priced.error) {
    await sendCallback(
      out,
      { order: { id: externalId, state: "Cancelled", quote: priced.quote } },
      priced.error,
    );
    return;
  }

  const end = fulfillment.end ?? {};
  const address = end.location?.address ?? {};
  const prepaid = order.payment?.type === "ON-ORDER";
  const created = await db.$transaction(async (tx) => {
    for (const line of priced.lines) {
      if (line.product.stock !== null) {
        await tx.product.update({
          where: { id: line.product.id },
          data: { stock: { decrement: line.count } },
        });
      }
    }
    return tx.order.create({
      data: {
        userId: store.userId,
        orderNumber: await nextOrderNumber(tx),
        source: "ONDC",
        externalId,
        status: "ACCEPTED",
        paymentMethod: prepaid ? "PREPAID" : "COD",
        paymentStatus: order.payment?.status === "PAID" ? "PAID" : "PENDING",
        customerName:
          order.billing?.name ?? end.location?.address?.name ?? null,
        customerPhone: end.contact?.phone ?? order.billing?.phone ?? null,
        customerAddress:
          [address.building, address.locality, address.city, address.area_code]
            .filter(Boolean)
            .join(", ") || null,
        subtotal: priced.subtotal,
        deliveryFee: priced.deliveryFee,
        total: priced.total,
        channelData: {
          bapId: ctx.bap_id,
          bapUri: ctx.bap_uri,
          transactionId: ctx.transaction_id,
          domain: ctx.domain,
          city: ctx.city,
          coreVersion: ctx.core_version,
          fulfillmentId,
          buyerApp: ctx.bap_id,
          order: { ...order, quote: priced.quote },
        },
        items: {
          create: priced.lines.map((l) => ({
            productId: l.product.id,
            name: l.product.name,
            quantity: l.count,
            price: l.product.price ?? 0,
          })),
        },
      },
      include: { items: true },
    });
  });
  await sendCallback(out, { order: orderPayload(created, store) });
}

async function findOrder(orderId: string) {
  const order = await db.order.findUnique({
    where: { source_externalId: { source: "ONDC", externalId: orderId } },
    include: { items: true },
  });
  if (!order) return null;
  const store = await db.store.findUnique({ where: { userId: order.userId } });
  return store ? { order, store } : null;
}

async function onStatus(ctx: BecknContext, message: Json) {
  const out = callbackContext(ctx, "on_status");
  const found = await findOrder(String(message.order_id ?? ""));
  if (!found) {
    await sendCallback(
      out,
      {},
      { type: "DOMAIN-ERROR", code: "30004", message: "Order not found" },
    );
    return;
  }
  await sendCallback(out, { order: orderPayload(found.order, found.store) });
}

async function onCancel(ctx: BecknContext, message: Json) {
  const out = callbackContext(ctx, "on_cancel");
  const found = await findOrder(String(message.order_id ?? ""));
  if (!found) {
    await sendCallback(
      out,
      {},
      { type: "DOMAIN-ERROR", code: "30004", message: "Order not found" },
    );
    return;
  }
  if (
    ["OUT_FOR_DELIVERY", "DELIVERED", "RETURNED"].includes(found.order.status)
  ) {
    await sendCallback(
      out,
      { order: orderPayload(found.order, found.store) },
      {
        type: "DOMAIN-ERROR",
        code: "50001",
        message: "Order can no longer be cancelled",
      },
    );
    return;
  }
  const updated = await cancelOrder(found.order.id, {
    cancelled_by: ctx.bap_id,
    reason: { id: String(message.cancellation_reason_id ?? "") },
  });
  await sendCallback(out, { order: orderPayload(updated, found.store) });
}

async function onTrack(ctx: BecknContext) {
  await sendCallback(callbackContext(ctx, "on_track"), {
    tracking: { status: "inactive" },
  });
}

async function onSupport(ctx: BecknContext, message: Json) {
  const found = await findOrder(String(message.ref_id ?? ""));
  const store = found?.store;
  await sendCallback(callbackContext(ctx, "on_support"), {
    phone: store?.consumerCarePhone ?? store?.phone ?? "",
    email: store?.consumerCareEmail ?? store?.email ?? "",
    uri: store ? `${appUrl()}/s/${store.slug}` : appUrl(),
  });
}

/** Cancels an order and restocks tracked products. */
export async function cancelOrder(orderId: string, cancellation?: Json) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
    if (order.status !== "CANCELLED") {
      for (const item of order.items) {
        if (!item.productId) continue;
        await tx.product.updateMany({
          where: { id: item.productId, stock: { not: null } },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
    return tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        channelData: cancellation
          ? { ...((order.channelData as Json) ?? {}), cancellation }
          : (order.channelData ?? undefined),
      },
      include: { items: true },
    });
  });
}

/**
 * Pushes an unsolicited on_status (or on_cancel) to the buyer app after the seller
 * changes an order in the dashboard.
 */
export async function pushOrderUpdate(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.source !== "ONDC") return false;
  const store = await db.store.findUnique({ where: { userId: order.userId } });
  const data = (order.channelData ?? {}) as Json;
  if (!store || !data.bapUri) return false;
  const action = order.status === "CANCELLED" ? "on_cancel" : "on_status";
  const ctx: BecknContext = callbackContext(
    {
      domain: data.domain,
      country: "IND",
      city: data.city,
      action,
      core_version: data.coreVersion ?? "1.2.0",
      bap_id: data.bapId,
      bap_uri: data.bapUri,
      transaction_id: data.transactionId,
      message_id: randomUUID(),
      timestamp: new Date().toISOString(),
    },
    action,
  );
  return sendCallback(ctx, { order: orderPayload(order, store) });
}
