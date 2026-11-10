import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PLAN_LIMITS, PLAN_PRICES } from "@/lib/plans";
import { cn } from "@/lib/utils";

const n = (v: number) => new Intl.NumberFormat("en-IN").format(v);

const PLANS = [
  {
    id: "FREE" as const,
    blurb: "For a neighbourhood shop getting online for the first time.",
    extras: [
      "ONDC seller app",
      "Free WhatsApp storefront",
      "Barcode scanning & loose-item catalog",
      "Orders, stock & analytics",
    ],
    cta: "Start free",
    href: "/auth/register",
  },
  {
    id: "PRO" as const,
    blurb: "For shops selling every day across several channels.",
    extras: [
      "Everything in Free",
      "Shopify + Amazon + more",
      "AI listing rewrites at scale",
      "Virtual try-on for clothing",
    ],
    cta: "Upgrade to Pro",
    href: "/dashboard/settings#plan",
    featured: true,
  },
  {
    id: "ENTERPRISE" as const,
    blurb: "For supermarkets, distributors and multi-category sellers.",
    extras: [
      "Everything in Pro",
      "Brand kit & logo design",
      "Priority support",
      "Help importing large catalogs",
    ],
    cta: "Upgrade",
    href: "/dashboard/settings#plan",
  },
];

export function PricingCards() {
  return (
    <div className="grid items-center gap-4 lg:grid-cols-3">
      {PLANS.map((p) => {
        const l = PLAN_LIMITS[p.id];
        const price = PLAN_PRICES[p.id];
        return (
          <div
            key={p.id}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-card p-6",
              p.featured &&
                "border-primary/50 shadow-soft ring-4 ring-primary/5 lg:py-9",
            )}
          >
            {p.featured ? (
              <span className="absolute top-6 right-6 rounded-full border border-sage/60 bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                Most popular
              </span>
            ) : null}
            <div className="text-lg font-semibold">{l.label}</div>
            <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>
            <div className="mt-6 flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tabular">
                {price.amount}
              </span>
              <span className="text-sm text-muted-foreground">
                {price.period}
              </span>
            </div>
            <ul className="mt-6 space-y-2.5 border-t pt-6 text-sm">
              {[
                `${n(l.products)} products`,
                `${n(l.aiCredits)} AI credits a month`,
                `${l.channels} marketplace connection${l.channels === 1 ? "" : "s"}`,
                `${l.models} try-on models`,
                ...p.extras,
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              asChild
              size="lg"
              variant={p.featured ? "glow" : "secondary"}
              className="mt-8"
            >
              <Link href={p.href}>{p.cta}</Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
