import "server-only";
import type { OrderSource } from "@prisma/client";
import { db } from "@/lib/db";
import { isOndcReady } from "@/lib/ondc/readiness";
import { toOndcProduct } from "@/lib/ondc/server";
import { scoreListing } from "@/lib/products/quality";

const DAY = 24 * 3600 * 1000;

export interface SalesSummary {
  days: number;
  revenue: number;
  orders: number;
  aov: number;
  items: number;
  prevRevenue: number;
  prevOrders: number;
  byDay: { date: string; revenue: number; orders: number }[];
  bySource: { source: OrderSource; revenue: number; orders: number }[];
  topProducts: { productId: string | null; name: string; quantity: number; revenue: number }[];
  byHour: { hour: number; orders: number }[];
  cancelled: number;
  repeatCustomers: number;
}

// Shops operate in IST regardless of where the server runs.
const IST_OFFSET = 5.5 * 3600 * 1000;
const istKey = (d: Date) => new Date(d.getTime() + IST_OFFSET).toISOString().slice(0, 10);
const istHour = (d: Date) => new Date(d.getTime() + IST_OFFSET).getUTCHours();
function startOfDay(d: Date) {
  return new Date(`${istKey(d)}T00:00:00.000+05:30`);
}

export async function salesSummary(userId: string, days = 30): Promise<SalesSummary> {
  const end = new Date();
  const start = startOfDay(new Date(end.getTime() - (days - 1) * DAY));
  const prevStart = new Date(start.getTime() - days * DAY);

  const [orders, prev] = await Promise.all([
    db.order.findMany({
      where: { userId, createdAt: { gte: start } },
      include: { items: true },
      orderBy: { createdAt: "asc" },
      take: 10000,
    }),
    db.order.aggregate({
      where: { userId, createdAt: { gte: prevStart, lt: start }, status: { not: "CANCELLED" } },
      _sum: { total: true },
      _count: true,
    }),
  ]);
  const valid = orders.filter((o) => o.status !== "CANCELLED");

  const byDayMap = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * DAY);
    byDayMap.set(istKey(d), { revenue: 0, orders: 0 });
  }
  const sources = new Map<OrderSource, { revenue: number; orders: number }>();
  const products = new Map<string, { productId: string | null; name: string; quantity: number; revenue: number }>();
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }));
  const phones = new Map<string, number>();
  let revenue = 0;
  let items = 0;

  for (const o of valid) {
    const total = Number(o.total);
    revenue += total;
    const day = byDayMap.get(istKey(o.createdAt));
    if (day) {
      day.revenue += total;
      day.orders += 1;
    }
    const s = sources.get(o.source) ?? { revenue: 0, orders: 0 };
    s.revenue += total;
    s.orders += 1;
    sources.set(o.source, s);
    hours[istHour(o.createdAt)].orders += 1;
    if (o.customerPhone) phones.set(o.customerPhone, (phones.get(o.customerPhone) ?? 0) + 1);
    for (const it of o.items) {
      items += it.quantity;
      const k = it.productId ?? `name:${it.name}`;
      const p = products.get(k) ?? { productId: it.productId, name: it.name, quantity: 0, revenue: 0 };
      p.quantity += it.quantity;
      p.revenue += Number(it.price) * it.quantity;
      products.set(k, p);
    }
  }

  return {
    days,
    revenue,
    orders: valid.length,
    aov: valid.length ? revenue / valid.length : 0,
    items,
    prevRevenue: Number(prev._sum.total ?? 0),
    prevOrders: prev._count,
    byDay: [...byDayMap.entries()].map(([date, v]) => ({ date, ...v })),
    bySource: [...sources.entries()].map(([source, v]) => ({ source, ...v })).sort((a, b) => b.revenue - a.revenue),
    topProducts: [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    byHour: hours,
    cancelled: orders.length - valid.length,
    repeatCustomers: [...phones.values()].filter((n) => n > 1).length,
  };
}

export interface CatalogHealth {
  total: number;
  active: number;
  drafts: number;
  avgScore: number;
  bands: { great: number; good: number; weak: number };
  topIssues: { id: string; message: string; count: number; ai: boolean }[];
  weakest: { id: string; name: string; imageUrl: string; score: number; topFix: string }[];
  lowStock: { id: string; name: string; imageUrl: string; stock: number }[];
  withPhoto: number;
  ondcReady: number;
  channelLive: Record<string, number>;
  deadStock: { id: string; name: string; imageUrl: string; stock: number | null }[];
}

export async function catalogHealth(userId: string): Promise<CatalogHealth> {
  const [products, store, listings, soldRecently] = await Promise.all([
    db.product.findMany({ where: { userId, status: { not: "ARCHIVED" } } }),
    db.store.findUnique({ where: { userId } }),
    db.channelListing.groupBy({ by: ["provider"], where: { product: { userId }, status: "LIVE" }, _count: true }),
    db.orderItem.findMany({
      where: { order: { userId, createdAt: { gte: new Date(Date.now() - 30 * DAY) }, status: { not: "CANCELLED" } } },
      select: { productId: true },
      distinct: ["productId"],
    }),
  ]);

  const issues = new Map<string, { id: string; message: string; count: number; ai: boolean }>();
  const scored = products.map((p) => {
    const dto = toOndcProduct(p);
    const q = scoreListing({ ...dto, category: p.category });
    for (const s of q.suggestions) {
      const cur = issues.get(s.id) ?? { id: s.id, message: s.message, count: 0, ai: Boolean(s.ai) };
      cur.count += 1;
      issues.set(s.id, cur);
    }
    return { p, dto, q };
  });

  const sold = new Set(soldRecently.map((s) => s.productId));
  const oldEnough = Date.now() - 21 * DAY;
  return {
    total: products.length,
    active: products.filter((p) => p.status === "ACTIVE").length,
    drafts: products.filter((p) => p.status === "DRAFT").length,
    avgScore: scored.length ? Math.round(scored.reduce((s, x) => s + x.q.score, 0) / scored.length) : 0,
    bands: {
      great: scored.filter((x) => x.q.score >= 85).length,
      good: scored.filter((x) => x.q.score >= 60 && x.q.score < 85).length,
      weak: scored.filter((x) => x.q.score < 60).length,
    },
    topIssues: [...issues.values()].sort((a, b) => b.count - a.count).slice(0, 6),
    weakest: scored
      .filter((x) => x.p.status === "ACTIVE")
      .sort((a, b) => a.q.score - b.q.score)
      .slice(0, 6)
      .map((x) => ({ id: x.p.id, name: x.p.name, imageUrl: x.p.imageUrl, score: x.q.score, topFix: x.q.suggestions[0]?.message ?? "" })),
    lowStock: products
      .filter((p) => p.status === "ACTIVE" && p.stock !== null && p.stock <= 5)
      .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
      .slice(0, 8)
      .map((p) => ({ id: p.id, name: p.name, imageUrl: p.imageUrl, stock: p.stock ?? 0 })),
    withPhoto: products.filter((p) => p.imageUrl || p.images.length).length,
    ondcReady: scored.filter((x) => x.p.status === "ACTIVE" && isOndcReady(x.dto, store ?? undefined)).length,
    channelLive: Object.fromEntries(listings.map((l) => [l.provider, l._count])),
    deadStock: products
      .filter((p) => p.status === "ACTIVE" && p.createdAt.getTime() < oldEnough && !sold.has(p.id) && (p.stock ?? 1) > 0)
      .slice(0, 8)
      .map((p) => ({ id: p.id, name: p.name, imageUrl: p.imageUrl, stock: p.stock })),
  };
}

export function pctChange(now: number, before: number): number | null {
  if (before === 0) return now > 0 ? null : 0;
  return Math.round(((now - before) / before) * 100);
}
