"use client";

import { AlertTriangle, Check, ChevronDown, Code2, Info, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api, toastError } from "@/components/app/api";
import { PageHeader, Section } from "@/components/app/page-header";
import { ProductThumb } from "@/components/app/product-thumb";
import { Stat } from "@/components/app/stat";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { inr, num } from "@/lib/format";
import type { Check as ReadinessCheck } from "@/lib/ondc/readiness";
import { cn } from "@/lib/utils";

const BUYER_APPS = ["Paytm", "PhonePe Pincode", "Magicpin", "Ola", "Mystore", "Digihaat"];

export function OndcView(props: {
  store: { ondcEnabled: boolean; ondcDomains: string[]; name: string; city: string | null; stdCode: string | null };
  network: { configured: boolean; env: string };
  checks: ReadinessCheck[];
  domains: { code: string; label: string; products: number }[];
  products: { total: number; ready: number };
  blocked: { id: string; name: string; imageUrl: string; issue: string }[];
  blockedCount: number;
  orders: { count: number; total: number };
  preview: string;
}) {
  const { store, network, checks, domains, products, blocked, blockedCount, orders, preview } = props;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(new Set(store.ondcDomains));
  const storeReady = checks.every((c) => c.ok);
  const doneChecks = checks.filter((c) => c.ok).length;

  const save = async (data: { ondcEnabled?: boolean; ondcDomains?: string[] }) => {
    setBusy(true);
    try {
      await api("/api/store", { method: "PATCH", json: data });
      if (data.ondcEnabled !== undefined) {
        toast.success(data.ondcEnabled ? "You're live on ONDC. Buyer apps in your city can now find your shop." : "Paused. Your shop is hidden from ONDC.");
      }
      router.refresh();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Open Network for Digital Commerce"
        title="Sell on ONDC"
        description="List once and appear in every ONDC buyer app (Paytm, PhonePe Pincode, Magicpin and more) for shoppers near you. No marketplace commission to Onboarder."
      />

      {!network.configured ? (
        <div className="mb-6 flex gap-3 rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="font-medium">Onboarder's network connection is being certified</div>
            <p className="text-muted-foreground">
              Prepare your shop now. Once ONDC finishes our seller app certification, ready products start appearing in buyer apps automatically. You don't need to do anything again.
            </p>
          </div>
        </div>
      ) : null}

      <div className={cn("mb-6 flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center", store.ondcEnabled ? "border-success/40 bg-success/5" : "bg-card")}>
        <div className="flex-1">
          <div className="flex items-center gap-2 font-medium">
            <span className={cn("size-2.5 rounded-full", store.ondcEnabled ? "bg-success" : "bg-muted-foreground/40")} />
            {store.ondcEnabled ? `${store.name} is live on ONDC` : "Not live yet"}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {store.ondcEnabled
              ? `${num(products.ready)} products are visible to shoppers${store.city ? ` in ${store.city}` : ""}.`
              : storeReady
                ? "Your shop meets every requirement. Switch on when you're ready to take orders."
                : `Complete ${checks.length - doneChecks} more item${checks.length - doneChecks === 1 ? "" : "s"} below to go live.`}
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium">
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {store.ondcEnabled ? "Live" : "Go live"}
          <Switch checked={store.ondcEnabled} disabled={busy || (!store.ondcEnabled && !storeReady)} onCheckedChange={(v) => save({ ondcEnabled: v })} />
        </label>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ready to sell" value={num(products.ready)} hint={`of ${num(products.total)} active`} />
        <Stat label="Need fixes" value={num(blockedCount)} hint="blocked by missing info" />
        <Stat label="ONDC orders" value={num(orders.count)} hint="all time" />
        <Stat label="ONDC sales" value={inr(orders.total)} hint="all time" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Shop requirements" description={`${doneChecks} of ${checks.length} complete. Required by ONDC for every seller.`}>
          <ul className="divide-y">
            {checks.map((c) => (
              <li key={c.id} className="flex items-start gap-3 px-5 py-3">
                <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", c.ok ? "bg-success text-success-foreground" : "border border-destructive/40 text-destructive")}>
                  {c.ok ? <Check className="size-3" /> : <X className="size-3" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{c.label}</div>
                  {!c.ok ? <div className="text-xs text-muted-foreground">{c.hint}</div> : null}
                </div>
                {!c.ok ? (
                  <Button asChild size="sm" variant="ghost">
                    <Link href={c.fixHref}>Add</Link>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>

        <div className="space-y-6">
          <Section title="What you sell" description="Buyer apps search by retail category. Choose every one that applies.">
            <div className="grid gap-2 p-5 sm:grid-cols-2">
              {domains.map((d) => (
                <label key={d.code} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                  <Checkbox
                    checked={selected.has(d.code)}
                    onCheckedChange={(v) => {
                      const next = new Set(selected);
                      v ? next.add(d.code) : next.delete(d.code);
                      if (next.size === 0) return;
                      setSelected(next);
                      save({ ondcDomains: [...next] });
                    }}
                  />
                  <span className="flex-1">{d.label}</span>
                  <span className="text-xs text-muted-foreground tabular">{d.products || ""}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section title="Products that need fixes" description={blockedCount ? `${num(blockedCount)} products are hidden from ONDC until fixed.` : undefined}>
            {blocked.length ? (
              <ul className="max-h-80 divide-y overflow-y-auto">
                {blocked.map((b) => (
                  <li key={b.id}>
                    <Link href={`/dashboard/catalog/${b.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/40">
                      <ProductThumb src={b.imageUrl} name={b.name} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{b.name}</div>
                        <div className="flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangle className="size-3" /> {b.issue}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-5 text-sm text-muted-foreground">{products.total ? "Every active product is ready for ONDC." : "Add products to see them here."}</p>
            )}
            {blockedCount > 0 ? (
              <div className="border-t px-5 py-3">
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/catalog?filter=no-category">Bulk-set categories in the catalog</Link>
                </Button>
              </div>
            ) : null}
          </Section>
        </div>
      </div>

      <Section className="mt-6" title="How ONDC orders work">
        <ol className="grid gap-4 p-5 text-sm sm:grid-cols-3">
          <li>
            <div className="font-medium">1. A shopper searches</div>
            <p className="text-muted-foreground">in any buyer app: {BUYER_APPS.join(", ")} and others. Your products show if you deliver to them.</p>
          </li>
          <li>
            <div className="font-medium">2. The order lands here</div>
            <p className="text-muted-foreground">in Orders, with the buyer's address and payment. Stock updates automatically.</p>
          </li>
          <li>
            <div className="font-medium">3. You pack and deliver</div>
            <p className="text-muted-foreground">Tap through Packed → Out for delivery → Delivered; the shopper sees each step in their app.</p>
          </li>
        </ol>
      </Section>

      <Collapsible className="mt-6 rounded-xl border bg-card">
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-5 py-4 text-left text-sm font-medium">
          <Code2 className="size-4 text-muted-foreground" /> Preview what buyer apps receive
          <ChevronDown className="ml-auto size-4 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <p className="px-5 text-xs text-muted-foreground">Your store as an ONDC Retail v1.2 provider (first 3 ready products).</p>
          <pre className="m-5 max-h-96 overflow-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed">{preview}</pre>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
