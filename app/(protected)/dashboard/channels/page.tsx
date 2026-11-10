import type { Metadata } from "next";
import { Suspense } from "react";
import { isAmazonConfigured } from "@/lib/channels/amazon";
import { CHANNELS } from "@/lib/channels/catalog";
import { isShopifyConfigured } from "@/lib/channels/shopify";
import { db } from "@/lib/db";
import { getPlan, getUserOrRedirect } from "@/lib/server/session";
import { ensureStore } from "@/lib/server/store";
import { ChannelsView } from "./channels-view";

export const metadata: Metadata = { title: "Channels" };

export default async function ChannelsPage() {
  const user = await getUserOrRedirect();
  const [store, connections, live, { limits }] = await Promise.all([
    ensureStore(user.id),
    db.marketplaceConnection.findMany({ where: { userId: user.id } }),
    db.channelListing.groupBy({
      by: ["provider", "status"],
      where: { product: { userId: user.id } },
      _count: true,
    }),
    getPlan(user.id),
  ]);
  const stats = (p: string) => ({
    live: live
      .filter((l) => l.provider === p && l.status === "LIVE")
      .reduce((s, l) => s + l._count, 0),
    issues: live
      .filter(
        (l) =>
          l.provider === p && ["NEEDS_ACTION", "FAILED"].includes(l.status),
      )
      .reduce((s, l) => s + l._count, 0),
  });
  const conn = (p: string) => {
    const c = connections.find((x) => x.provider === p);
    if (!c) return null;
    const meta = (c.metadata ?? {}) as { shopName?: string };
    return {
      account: meta.shopName ?? c.shopDomain ?? c.sellerId,
      lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
    };
  };
  return (
    <Suspense>
      <ChannelsView
        channels={CHANNELS}
        state={{
          ONDC: {
            connected: store.ondcEnabled,
            configured: true,
            account: store.name,
            lastSyncAt: null,
            ...stats("ONDC"),
          },
          SHOPIFY: {
            connected: Boolean(conn("SHOPIFY")),
            configured: isShopifyConfigured(),
            ...(conn("SHOPIFY") ?? { account: null, lastSyncAt: null }),
            ...stats("SHOPIFY"),
          },
          AMAZON: {
            connected: Boolean(conn("AMAZON")),
            configured: isAmazonConfigured(),
            ...(conn("AMAZON") ?? { account: null, lastSyncAt: null }),
            ...stats("AMAZON"),
          },
          FLIPKART: {
            connected: false,
            configured: true,
            account: null,
            lastSyncAt: null,
            live: 0,
            issues: 0,
          },
        }}
        storefront={{ slug: store.slug, enabled: store.storefrontEnabled }}
        channelLimit={limits.channels}
        planLabel={limits.label}
      />
    </Suspense>
  );
}
