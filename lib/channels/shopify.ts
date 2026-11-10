import "server-only";
import crypto from "node:crypto";
import type { MarketplaceConnection, Product } from "@prisma/client";
import { db } from "@/lib/db";
import { nextOrderNumber } from "@/lib/server/orders";
import { HttpError } from "@/lib/server/session";
import { accessToken, channelCallbackUrl, ensureSku } from "./connections";

// Shopify Admin GraphQL, authorization code grant with expiring offline tokens.
// https://shopify.dev/docs/apps/build/authentication-authorization/authenticate-standalone-apps
export const SHOPIFY_API_VERSION = "2026-10";
const SCOPES =
  "read_products,write_products,read_inventory,write_inventory,read_locations,read_orders";

function credentials() {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new HttpError(503, "Shopify is not configured on this server.");
  return { clientId, clientSecret };
}

export const isShopifyConfigured = () =>
  Boolean(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET);

/** Accepts "mystore", "mystore.myshopify.com" or a full admin URL. */
export function normaliseShopDomain(input: string): string | null {
  const raw = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0];
  const handle = raw.endsWith(".myshopify.com")
    ? raw.slice(0, -".myshopify.com".length)
    : raw;
  return /^[a-z0-9][a-z0-9-]{0,60}$/.test(handle)
    ? `${handle}.myshopify.com`
    : null;
}

export function authorizeUrl(shop: string, state: string) {
  const { clientId } = credentials();
  const params = new URLSearchParams({
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: channelCallbackUrl("shopify"),
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params}`;
}

/** Verifies the hmac Shopify adds to the OAuth callback query string. */
export function verifyCallbackHmac(query: URLSearchParams): boolean {
  const { clientSecret } = credentials();
  const hmac = query.get("hmac");
  if (!hmac) return false;
  const message = [...query.entries()]
    .filter(([k]) => k !== "hmac" && k !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const digest = crypto
    .createHmac("sha256", clientSecret)
    .update(message)
    .digest("hex");
  return (
    digest.length === hmac.length &&
    crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac))
  );
}

interface TokenResponse {
  access_token: string;
  scope?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

async function tokenRequest(
  shop: string,
  body: Record<string, string | number>,
): Promise<TokenResponse> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(
      `Shopify token request failed: ${res.status} ${await res.text()}`,
    );
  return res.json();
}

export function exchangeCode(shop: string, code: string) {
  const { clientId, clientSecret } = credentials();
  return tokenRequest(shop, {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    expiring: 1,
  });
}

async function token(conn: MarketplaceConnection) {
  const shop = conn.shopDomain ?? conn.sellerId;
  return accessToken(conn, async (refreshToken) => {
    const { clientId, clientSecret } = credentials();
    const r = await tokenRequest(shop, {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    return {
      accessToken: r.access_token,
      expiresIn: r.expires_in ?? 3600,
      refreshToken: r.refresh_token,
      refreshTokenExpiresIn: r.refresh_token_expires_in,
    };
  });
}

// biome-ignore lint/suspicious/noExplicitAny: GraphQL responses are dynamic
export async function graphql<T = any>(
  conn: MarketplaceConnection,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const shop = conn.shopDomain ?? conn.sellerId;
  const res = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": await token(conn),
      },
      body: JSON.stringify({ query, variables }),
    },
  );
  if (res.status === 401 || res.status === 403) {
    throw new HttpError(
      409,
      "Shopify rejected our access. Please reconnect your store.",
      "RECONNECT",
    );
  }
  const json = await res.json();
  if (json.errors?.length)
    throw new Error(
      json.errors.map((e: { message: string }) => e.message).join("; "),
    );
  return json.data;
}

export async function shopInfo(conn: MarketplaceConnection) {
  const data = await graphql<{
    shop: { name: string; currencyCode: string };
    locations: { nodes: { id: string }[] };
  }>(
    conn,
    `{ shop { name currencyCode } locations(first: 1) { nodes { id } } }`,
  );
  return {
    name: data.shop.name,
    currency: data.shop.currencyCode,
    locationId: data.locations.nodes[0]?.id ?? null,
  };
}

// ---------------------------------------------------------------------------------------
// Publishing. Products sharing a variantGroup become one Shopify product with a Size option.

const PRODUCT_SET = `mutation ProductSet($input: ProductSetInput!, $identifier: ProductSetIdentifiers) {
  productSet(synchronous: true, input: $input, identifier: $identifier) {
    product { id handle }
    userErrors { field message }
  }
}`;

const money = (v: unknown) =>
  v === null || v === undefined ? null : Number(v).toFixed(2);

export interface PublishResult {
  productId: string;
  ok: boolean;
  message?: string;
  externalId?: string;
  externalUrl?: string;
}

export async function publishToShopify(
  userId: string,
  products: Product[],
): Promise<PublishResult[]> {
  const conn = await db.marketplaceConnection.findUnique({
    where: { userId_provider: { userId, provider: "SHOPIFY" } },
  });
  if (!conn) throw new HttpError(400, "Connect your Shopify store first.");
  const meta = (conn.metadata ?? {}) as { locationId?: string };
  let locationId = meta.locationId ?? null;
  if (!locationId) {
    locationId = (await shopInfo(conn)).locationId;
    if (locationId) {
      await db.marketplaceConnection.update({
        where: { id: conn.id },
        data: { metadata: { ...(meta as object), locationId } },
      });
    }
  }

  const existing = await db.channelListing.findMany({
    where: {
      provider: "SHOPIFY",
      productId: { in: products.map((p) => p.id) },
    },
  });
  const externalByProduct = new Map(
    existing.map((l) => [l.productId, l.externalId]),
  );

  // Group pack sizes
  const groups = new Map<string, Product[]>();
  for (const p of products) {
    const key = p.variantGroup ? `g:${p.variantGroup}` : `p:${p.id}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  const results: PublishResult[] = [];
  for (const members of groups.values()) {
    const lead = members[0];
    const grouped = members.length > 1 || Boolean(lead.variantGroup);
    const optionName = grouped ? "Size" : "Title";
    const label = (p: Product) =>
      grouped ? p.variantLabel || p.name : "Default Title";
    const images = [
      ...new Set(
        members
          .flatMap((p) => [p.imageUrl, ...p.images])
          .filter((u) => /^https:\/\//.test(u)),
      ),
    ];

    const input = {
      title: grouped
        ? lead.name.replace(/\s*[-–]\s*[\d.]+\s*\w+$/, "")
        : lead.name,
      descriptionHtml: lead.description
        ? `<p>${escapeHtml(lead.description).replace(/\n+/g, "</p><p>")}</p>`
        : "",
      vendor: lead.brand ?? undefined,
      productType: lead.ondcCategory ?? lead.category,
      status: lead.status === "ACTIVE" ? "ACTIVE" : "DRAFT",
      productOptions: [
        {
          name: optionName,
          values: [...new Set(members.map(label))].map((name) => ({ name })),
        },
      ],
      files: images.slice(0, 10).map((originalSource) => ({
        originalSource,
        contentType: "IMAGE",
        alt: lead.name,
      })),
      variants: members.map((p) => {
        const tracked = p.stock !== null;
        return {
          optionValues: [{ optionName, name: label(p) }],
          price: money(p.price) ?? "0.00",
          compareAtPrice:
            p.mrp && p.price && Number(p.mrp) > Number(p.price)
              ? money(p.mrp)
              : null,
          inventoryPolicy: "DENY",
          inventoryItem: { sku: ensureSku(p), tracked },
          ...(p.barcode ? { barcodes: [{ value: p.barcode }] } : {}),
          ...(tracked && locationId
            ? {
                inventoryQuantities: [
                  {
                    locationId,
                    name: "available",
                    quantity: Math.max(0, p.stock ?? 0),
                  },
                ],
              }
            : {}),
        };
      }),
    };
    const externalId = members
      .map((p) => externalByProduct.get(p.id))
      .find(Boolean);

    try {
      const data = await graphql(conn, PRODUCT_SET, {
        input,
        identifier: externalId ? { id: externalId } : undefined,
      });
      const errors = data.productSet.userErrors as { message: string }[];
      if (errors.length)
        throw new Error(errors.map((e) => e.message).join("; "));
      const gid: string = data.productSet.product.id;
      const url = `https://${conn.shopDomain}/admin/products/${gid.split("/").pop()}`;
      for (const p of members)
        results.push({
          productId: p.id,
          ok: true,
          externalId: gid,
          externalUrl: url,
        });
    } catch (e) {
      if (e instanceof HttpError && e.code === "RECONNECT") throw e;
      const message =
        e instanceof Error ? e.message : "Shopify rejected this product";
      for (const p of members)
        results.push({ productId: p.id, ok: false, message });
    }
  }
  await db.marketplaceConnection.update({
    where: { id: conn.id },
    data: { lastSyncAt: new Date() },
  });
  return results;
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
  );
}

// ---------------------------------------------------------------------------------------
// Order import (last 60 days is what read_orders allows) so analytics cover Shopify sales.

export async function importShopifyOrders(userId: string) {
  const conn = await db.marketplaceConnection.findUnique({
    where: { userId_provider: { userId, provider: "SHOPIFY" } },
  });
  if (!conn) throw new HttpError(400, "Connect your Shopify store first.");
  const since = new Date(Date.now() - 60 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const data = await graphql(
    conn,
    `query Orders($q: String!) {
      orders(first: 100, query: $q, sortKey: CREATED_AT, reverse: true) {
        nodes {
          id name createdAt cancelledAt displayFinancialStatus displayFulfillmentStatus
          totalPriceSet { shopMoney { amount } }
          subtotalPriceSet { shopMoney { amount } }
          customer { displayName }
          lineItems(first: 50) { nodes { title quantity sku originalUnitPriceSet { shopMoney { amount } } } }
        }
      }
    }`,
    { q: `created_at:>=${since}` },
  );
  const skus = await db.product.findMany({
    where: { userId, sku: { not: null } },
    select: { id: true, sku: true },
  });
  const bySku = new Map(skus.map((p) => [p.sku, p.id]));
  let imported = 0;
  for (const o of data.orders.nodes) {
    const status = o.cancelledAt
      ? "CANCELLED"
      : o.displayFulfillmentStatus === "FULFILLED"
        ? "DELIVERED"
        : "ACCEPTED";
    const exists = await db.order.findUnique({
      where: { source_externalId: { source: "SHOPIFY", externalId: o.id } },
    });
    if (exists) {
      await db.order.update({ where: { id: exists.id }, data: { status } });
      continue;
    }
    await db.order.create({
      data: {
        userId,
        orderNumber: await nextOrderNumber(db),
        source: "SHOPIFY",
        externalId: o.id,
        status,
        paymentStatus: o.displayFinancialStatus === "PAID" ? "PAID" : "PENDING",
        customerName: o.customer?.displayName ?? null,
        subtotal: Number(o.subtotalPriceSet.shopMoney.amount),
        total: Number(o.totalPriceSet.shopMoney.amount),
        notes: `Shopify ${o.name}`,
        createdAt: new Date(o.createdAt),
        items: {
          create: o.lineItems.nodes.map(
            (li: {
              title: string;
              quantity: number;
              sku: string | null;
              originalUnitPriceSet: { shopMoney: { amount: string } };
            }) => ({
              name: li.title,
              sku: li.sku,
              productId: li.sku ? (bySku.get(li.sku) ?? null) : null,
              quantity: li.quantity,
              price: Number(li.originalUnitPriceSet.shopMoney.amount),
            }),
          ),
        },
      },
    });
    imported++;
  }
  await db.marketplaceConnection.update({
    where: { id: conn.id },
    data: { lastSyncAt: new Date() },
  });
  return imported;
}
