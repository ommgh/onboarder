import { Lightbulb } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { HourChart, SalesChart } from "@/components/app/charts";
import { PageHeader, Section } from "@/components/app/page-header";
import { ProductThumb } from "@/components/app/product-thumb";
import { Stat } from "@/components/app/stat";
import { Pill, SOURCE_LABEL } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { inr, num, pluralize } from "@/lib/format";
import { catalogHealth, pctChange, salesSummary } from "@/lib/server/analytics";
import { getUserOrRedirect } from "@/lib/server/session";
import { ensureStore } from "@/lib/server/store";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const RANGES = [7, 30, 90];

function hourLabel(h: number) {
  return `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const user = await getUserOrRedirect();
  const days = RANGES.includes(Number((await searchParams).days))
    ? Number((await searchParams).days)
    : 30;
  const [sales, health, store, connections] = await Promise.all([
    salesSummary(user.id, days),
    catalogHealth(user.id),
    ensureStore(user.id),
    db.marketplaceConnection.count({ where: { userId: user.id } }),
  ]);

  // Plain-language next steps, most valuable first.
  const insights: { text: string; href: string; cta: string }[] = [];
  const noPhoto = health.total - health.withPhoto;
  if (!store.ondcEnabled && health.total > 0)
    insights.push({
      text: "You're not on ONDC yet. It's free and puts your shop in Paytm, PhonePe Pincode and Magicpin for nearby shoppers.",
      href: "/dashboard/channels/ondc",
      cta: "Go live",
    });
  if (noPhoto > 0)
    insights.push({
      text: `${pluralize(noPhoto, "product")} ${noPhoto === 1 ? "has" : "have"} no photo. Shoppers rarely buy what they can't see.`,
      href: "/dashboard/catalog?filter=no-photo",
      cta: "Add photos",
    });
  const topLow = sales.topProducts.find((t) =>
    health.lowStock.some((l) => l.id === t.productId),
  );
  if (topLow)
    insights.push({
      text: `“${topLow.name}” is one of your best sellers and is running low. Restock before it sells out.`,
      href: `/dashboard/catalog/${topLow.productId}`,
      cta: "Update stock",
    });
  const peak = [...sales.byHour].sort((a, b) => b.orders - a.orders)[0];
  if (sales.orders >= 5 && peak.orders > 0)
    insights.push({
      text: `Most orders arrive around ${hourLabel(peak.hour)}–${hourLabel((peak.hour + 1) % 24)}. Keep the shop phone close and stock topped up before then.`,
      href: "/dashboard/orders",
      cta: "Orders",
    });
  const descIssue = health.topIssues.find((i) => i.id === "description");
  if (descIssue && descIssue.count >= 3)
    insights.push({
      text: `${pluralize(descIssue.count, "listing")} have thin descriptions. AI can rewrite them in a click from each product page.`,
      href: "/dashboard/catalog",
      cta: "Open catalog",
    });
  if (health.deadStock.length >= 3)
    insights.push({
      text: `${pluralize(health.deadStock.length, "product")} haven't sold in 30 days. Try a lower price, a better photo, or a combo offer.`,
      href: "#slow",
      cta: "See them",
    });
  if (connections === 0 && sales.orders > 20)
    insights.push({
      text: "Steady sales: you're ready for a second channel. Connect Shopify for your own branded store.",
      href: "/dashboard/channels",
      cta: "Channels",
    });

  const maxSource = Math.max(1, ...sales.bySource.map((s) => s.revenue));

  return (
    <>
      <PageHeader
        title="Analytics"
        description="How your shop is selling, and what to do next."
        actions={
          <div className="inline-flex rounded-lg border bg-card p-0.5 text-sm">
            {RANGES.map((d) => (
              <Link
                key={d}
                href={`?days=${d}`}
                className={cn(
                  "rounded-md px-3 py-1",
                  d === days ? "bg-muted font-medium" : "text-muted-foreground",
                )}
              >
                {d} days
              </Link>
            ))}
          </div>
        }
      />

      {insights.length ? (
        <Section className="mb-6 border-primary/30 bg-accent/30">
          <div className="flex items-center gap-2 px-5 pt-4 text-sm font-medium">
            <Lightbulb className="size-4 text-primary" /> What to do next
          </div>
          <ul className="divide-y divide-border/60">
            {insights.slice(0, 4).map((i) => (
              <li
                key={i.text}
                className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center"
              >
                <span className="flex-1 text-sm">{i.text}</span>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="self-start sm:self-auto"
                >
                  <Link href={i.href}>{i.cta}</Link>
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Sales"
          value={inr(sales.revenue)}
          change={pctChange(sales.revenue, sales.prevRevenue)}
          hint={`vs previous ${days} days`}
        />
        <Stat
          label="Orders"
          value={num(sales.orders)}
          change={pctChange(sales.orders, sales.prevOrders)}
          hint={sales.cancelled ? `${sales.cancelled} cancelled` : undefined}
        />
        <Stat
          label="Average order"
          value={inr(Math.round(sales.aov))}
          hint={`${num(sales.items)} items sold`}
        />
        <Stat
          label="Repeat customers"
          value={num(sales.repeatCustomers)}
          hint="ordered more than once"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Section title="Sales by day" className="lg:col-span-2">
          <div className="p-4">
            {sales.orders ? (
              <SalesChart data={sales.byDay} height={260} />
            ) : (
              <p className="grid h-[260px] place-items-center text-sm text-muted-foreground">
                No sales in this period yet.
              </p>
            )}
          </div>
        </Section>
        <Section title="By channel">
          {sales.bySource.length ? (
            <ul className="space-y-4 p-5">
              {sales.bySource.map((s) => (
                <li key={s.source}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{SOURCE_LABEL[s.source]}</span>
                    <span className="font-medium tabular">
                      {inr(s.revenue)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-chart-1"
                      style={{ width: `${(s.revenue / maxSource) * 100}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {pluralize(s.orders, "order")}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">
              Channel split appears once orders come in.
            </p>
          )}
        </Section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Section title="Best sellers" className="lg:col-span-2">
          {sales.topProducts.length ? (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="px-5 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 text-right font-medium">Sold</th>
                  <th className="px-5 py-2 text-right font-medium">Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sales.topProducts.map((t, i) => (
                  <tr key={`${t.productId}-${i}`}>
                    <td className="max-w-0 truncate px-5 py-2.5">
                      {t.productId ? (
                        <Link
                          href={`/dashboard/catalog/${t.productId}`}
                          className="hover:underline"
                        >
                          {t.name}
                        </Link>
                      ) : (
                        t.name
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular">
                      {num(t.quantity)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium tabular">
                      {inr(t.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">
              Your best sellers will show here.
            </p>
          )}
        </Section>
        <Section
          title="Busiest hours"
          description="Orders by time of day (IST)"
        >
          <div className="p-4">
            {sales.orders ? (
              <HourChart data={sales.byHour} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Not enough orders yet.
              </p>
            )}
          </div>
        </Section>
      </div>

      <h2
        id="listings"
        className="mt-10 mb-3 scroll-mt-20 text-lg font-semibold"
      >
        Listing health
      </h2>
      <div className="grid gap-6 lg:grid-cols-3">
        <Section>
          <div className="p-5">
            <div className="text-sm text-muted-foreground">
              Average listing score
            </div>
            <div className="mt-1 text-4xl font-semibold tabular">
              {health.avgScore}
              <span className="text-lg font-normal text-muted-foreground">
                /100
              </span>
            </div>
            <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-muted">
              {health.total ? (
                <>
                  <div
                    className="bg-success"
                    style={{
                      width: `${(health.bands.great / health.total) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-warning"
                    style={{
                      width: `${(health.bands.good / health.total) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-destructive"
                    style={{
                      width: `${(health.bands.weak / health.total) * 100}%`,
                    }}
                  />
                </>
              ) : null}
            </div>
            <dl className="mt-3 grid grid-cols-3 text-xs">
              <div>
                <dt className="text-muted-foreground">Great</dt>
                <dd className="font-medium tabular">
                  {num(health.bands.great)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Good</dt>
                <dd className="font-medium tabular">
                  {num(health.bands.good)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Weak</dt>
                <dd className="font-medium tabular">
                  {num(health.bands.weak)}
                </dd>
              </div>
            </dl>
          </div>
        </Section>
        <Section title="Most common gaps" className="lg:col-span-2">
          {health.topIssues.length ? (
            <ul className="divide-y">
              {health.topIssues.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm"
                >
                  <span className="w-10 text-right font-semibold tabular">
                    {i.count}
                  </span>
                  <span className="flex-1">{i.message}</span>
                  {i.ai ? <Pill tone="primary">AI fix</Pill> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">
              No gaps. Every listing is complete.
            </p>
          )}
        </Section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section
          title="Weakest listings"
          description="Fixing these has the biggest payoff"
        >
          <ProductList
            items={health.weakest.map((w) => ({
              ...w,
              right: (
                <Pill tone={w.score < 60 ? "danger" : "warning"}>
                  {w.score}
                </Pill>
              ),
              sub: w.topFix,
            }))}
            empty="Nothing here yet."
          />
        </Section>
        <Section
          title="Slow movers"
          description="Listed 3+ weeks, no sales in 30 days"
        >
          <div id="slow" className="scroll-mt-24" />
          <ProductList
            items={health.deadStock.map((d) => ({
              ...d,
              right:
                d.stock !== null ? (
                  <span className="text-xs text-muted-foreground">
                    {d.stock} in stock
                  </span>
                ) : null,
              sub: undefined,
            }))}
            empty="Everything has sold recently."
          />
        </Section>
      </div>
    </>
  );
}

function ProductList({
  items,
  empty,
}: {
  items: {
    id: string;
    name: string;
    imageUrl: string;
    right: React.ReactNode;
    sub?: string;
  }[];
  empty: string;
}) {
  if (!items.length)
    return <p className="p-5 text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y">
      {items.map((p) => (
        <li key={p.id}>
          <Link
            href={`/dashboard/catalog/${p.id}`}
            className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/40"
          >
            <ProductThumb src={p.imageUrl} name={p.name} size={32} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{p.name}</div>
              {p.sub ? (
                <div className="truncate text-xs text-muted-foreground">
                  {p.sub}
                </div>
              ) : null}
            </div>
            {p.right}
          </Link>
        </li>
      ))}
    </ul>
  );
}
