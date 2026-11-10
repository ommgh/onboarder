import { ArrowRight, Barcode, Check, FileSpreadsheet, Hand, PackageOpen, Receipt, Wheat } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SalesChart } from "@/components/app/charts";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader, Section } from "@/components/app/page-header";
import { ProductThumb } from "@/components/app/product-thumb";
import { Stat } from "@/components/app/stat";
import { ORDER_STATUS, Pill, SOURCE_LABEL } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { db } from "@/lib/db";
import { inr, num, timeAgo } from "@/lib/format";
import { catalogHealth, pctChange, salesSummary } from "@/lib/server/analytics";
import { getPlan, getUserOrRedirect } from "@/lib/server/session";
import { ensureStore } from "@/lib/server/store";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };

const ADD_LANES = [
  { href: "/dashboard/add/packaged", icon: Barcode, title: "Scan packaged goods", body: "Barcode in, listing out." },
  { href: "/dashboard/add/loose", icon: Wheat, title: "Add loose staples", body: "Atta, dal, sabzi by the kg." },
  { href: "/dashboard/add/handmade", icon: Hand, title: "Photograph handmade", body: "AI writes and polishes." },
  { href: "/dashboard/add/import", icon: FileSpreadsheet, title: "Import a spreadsheet", body: "From Excel, Tally or Vyapar." },
];

export default async function HomePage() {
  const user = await getUserOrRedirect();
  const [store, sales, health, recent, { limits }, connections] = await Promise.all([
    ensureStore(user.id),
    salesSummary(user.id, 30),
    catalogHealth(user.id),
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6, include: { items: { select: { quantity: true } } } }),
    getPlan(user.id),
    db.marketplaceConnection.count({ where: { userId: user.id } }),
  ]);

  const firstName = (user.name ?? "").split(" ")[0];
  const steps = [
    {
      done: Boolean(store.phone && store.addressLine && store.pincode),
      title: "Tell us about your shop",
      body: "Address, phone and timings appear on every channel.",
      href: "/dashboard/settings#store",
      cta: "Complete profile",
    },
    {
      done: health.total >= 10,
      title: "Add your first 10 products",
      body: `${num(health.total)} added so far. Scanning is the fastest way.`,
      href: "/dashboard/add",
      cta: "Add products",
    },
    {
      done: health.total > 0 && health.withPhoto / health.total >= 0.8,
      title: "Give products a photo",
      body: "Listings with photos get far more orders. AI can create them for loose items.",
      href: "/dashboard/catalog?filter=no-photo",
      cta: "Fix photos",
    },
    {
      done: store.ondcEnabled || connections > 0,
      title: "Start selling on a channel",
      body: "Go live on ONDC for free, or connect Shopify or Amazon.",
      href: "/dashboard/channels",
      cta: "Choose channels",
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const setupComplete = doneCount === steps.length;

  return (
    <>
      <PageHeader
        eyebrow={store.name}
        title={firstName ? `Namaste, ${firstName}` : "Namaste"}
        description={
          setupComplete
            ? `Here's how ${store.name} did over the last 30 days.`
            : "Let's get your shop online. Most sellers finish these steps in one sitting."
        }
      />

      {!setupComplete ? (
        <Section className="mb-6 overflow-hidden">
          <div className="flex flex-col gap-1 border-b bg-accent/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-medium">Get your shop online</h2>
              <p className="text-sm text-muted-foreground">
                {doneCount} of {steps.length} done
              </p>
            </div>
            <Progress value={(doneCount / steps.length) * 100} className="h-2 sm:w-48" />
          </div>
          <ol className="divide-y">
            {steps.map((s, i) => (
              <li key={s.title} className="flex items-center gap-4 px-5 py-3.5">
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-medium",
                    s.done ? "border-success bg-success text-success-foreground" : "bg-background text-muted-foreground",
                  )}
                >
                  {s.done ? <Check className="size-4" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={cn("text-sm font-medium", s.done && "text-muted-foreground line-through decoration-1")}>{s.title}</div>
                  {!s.done ? <div className="text-xs text-muted-foreground">{s.body}</div> : null}
                </div>
                {!s.done ? (
                  <Button asChild size="sm" variant={steps.findIndex((x) => !x.done) === i ? "default" : "outline"}>
                    <Link href={s.href}>{s.cta}</Link>
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales · 30 days" value={inr(sales.revenue)} change={pctChange(sales.revenue, sales.prevRevenue)} hint="vs previous 30" />
        <Stat label="Orders" value={num(sales.orders)} change={pctChange(sales.orders, sales.prevOrders)} hint={`${num(sales.items)} items sold`} />
        <Stat label="Average order" value={inr(Math.round(sales.aov))} hint={sales.repeatCustomers ? `${sales.repeatCustomers} repeat customers` : "per order"} />
        <Stat
          label="Catalog"
          value={
            <>
              {num(health.total)}
              <span className="text-base font-normal text-muted-foreground"> / {num(limits.products)}</span>
            </>
          }
          hint={`${num(health.ondcReady)} ready for ONDC`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Section
          title="Sales"
          description="Last 30 days, all channels"
          className="lg:col-span-3"
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/analytics">
                Analytics <ArrowRight />
              </Link>
            </Button>
          }
        >
          <div className="p-4">
            {sales.orders > 0 ? (
              <SalesChart data={sales.byDay} />
            ) : (
              <div className="grid h-[220px] place-items-center text-center text-sm text-muted-foreground">
                <div>
                  No sales recorded yet.
                  <br />
                  Orders from ONDC and Shopify appear here, and you can log counter sales in{" "}
                  <Link href="/dashboard/orders" className="text-primary underline-offset-4 hover:underline">
                    Orders
                  </Link>
                  .
                </div>
              </div>
            )}
          </div>
        </Section>

        <Section
          title="Recent orders"
          className="lg:col-span-2"
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/orders">
                All <ArrowRight />
              </Link>
            </Button>
          }
        >
          {recent.length ? (
            <ul className="divide-y">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/dashboard/orders?open=${o.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="font-mono text-xs">{o.orderNumber}</span>
                        <Pill tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Pill>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {SOURCE_LABEL[o.source]} · {o.customerName ?? "Walk-in"} · {timeAgo(o.createdAt)}
                      </div>
                    </div>
                    <div className="text-sm font-medium tabular">{inr(Number(o.total))}</div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-5">
              <EmptyState icon={Receipt} title="No orders yet" description="New orders from every channel land here." className="py-8" />
            </div>
          )}
        </Section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section
          title="Improve your listings"
          description={health.total ? `Average listing score ${health.avgScore}/100` : undefined}
          actions={
            health.total ? (
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/analytics#listings">
                  Details <ArrowRight />
                </Link>
              </Button>
            ) : null
          }
        >
          {health.total === 0 ? (
            <div className="p-5">
              <EmptyState icon={PackageOpen} title="Your catalog is empty" description="Add products and we'll show what to fix to sell more." className="py-8">
                <Button asChild size="sm">
                  <Link href="/dashboard/add">Add products</Link>
                </Button>
              </EmptyState>
            </div>
          ) : health.topIssues.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Every listing is in great shape. Nicely done.</p>
          ) : (
            <ul className="divide-y">
              {health.topIssues.slice(0, 4).map((i) => (
                <li key={i.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-0.5 min-w-9 rounded-md bg-accent px-1.5 py-0.5 text-center text-xs font-semibold text-accent-foreground tabular">
                    {i.count}
                  </span>
                  <span className="flex-1 text-sm">{i.message}</span>
                  {i.ai ? <Pill tone="primary">AI fix</Pill> : null}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Running low" description="Active products with 5 or fewer in stock">
          {health.lowStock.length ? (
            <ul className="divide-y">
              {health.lowStock.map((p) => (
                <li key={p.id}>
                  <Link href={`/dashboard/catalog/${p.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/50">
                    <ProductThumb src={p.imageUrl} name={p.name} size={32} />
                    <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                    <Pill tone={p.stock === 0 ? "danger" : "warning"}>{p.stock === 0 ? "Out" : `${p.stock} left`}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">
              Nothing is running low. Track stock on a product to get alerts here.
            </p>
          )}
        </Section>
      </div>

      <h2 className="mt-8 mb-3 text-sm font-medium text-muted-foreground">Add more products</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ADD_LANES.map((l) => (
          <Link key={l.href} href={l.href} className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30">
            <l.icon className="size-5 text-primary" />
            <div className="mt-3 text-sm font-medium">{l.title}</div>
            <div className="text-xs text-muted-foreground">{l.body}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
