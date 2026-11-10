import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { getUserOrRedirect } from "@/lib/server/session";
import { type OrderRow, OrdersView } from "./orders-view";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  const user = await getUserOrRedirect();
  const [orders, shopify] = await Promise.all([
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { items: true },
    }),
    db.marketplaceConnection.findUnique({
      where: { userId_provider: { userId: user.id, provider: "SHOPIFY" } },
      select: { id: true },
    }),
  ]);
  const rows: OrderRow[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    source: o.source,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerAddress: o.customerAddress,
    notes: o.notes,
    subtotal: Number(o.subtotal),
    deliveryFee: Number(o.deliveryFee),
    total: Number(o.total),
    createdAt: o.createdAt.toISOString(),
    buyerApp: ((o.channelData ?? {}) as { buyerApp?: string }).buyerApp ?? null,
    items: o.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      price: Number(i.price),
      productId: i.productId,
    })),
  }));
  return (
    <Suspense>
      <OrdersView orders={rows} shopifyConnected={Boolean(shopify)} />
    </Suspense>
  );
}
