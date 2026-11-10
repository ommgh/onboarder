"use client";

import { Loader2, Minus, Phone, Plus, Receipt, RefreshCw, Search, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, toastError } from "@/components/app/api";
import { EmptyState } from "@/components/app/empty-state";
import { NativeSelect } from "@/components/app/fields";
import { PageHeader } from "@/components/app/page-header";
import { ProductThumb } from "@/components/app/product-thumb";
import { ORDER_STATUS, Pill, SOURCE_LABEL } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { inr, timeAgo } from "@/lib/format";
import type { ProductDTO } from "@/lib/products/serialize";
import { cn } from "@/lib/utils";

export interface OrderRow {
  id: string;
  orderNumber: string;
  source: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  notes: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  buyerApp: string | null;
  items: { name: string; quantity: number; price: number; productId: string | null }[];
}

const TABS = [
  { id: "open", label: "To do", match: (s: string) => ["CREATED", "ACCEPTED", "PACKED", "OUT_FOR_DELIVERY"].includes(s) },
  { id: "done", label: "Completed", match: (s: string) => ["DELIVERED", "RETURNED"].includes(s) },
  { id: "cancelled", label: "Cancelled", match: (s: string) => s === "CANCELLED" },
  { id: "all", label: "All", match: () => true },
];

const NEXT: Record<string, { status: string; label: string } | undefined> = {
  CREATED: { status: "ACCEPTED", label: "Accept order" },
  ACCEPTED: { status: "PACKED", label: "Mark packed" },
  PACKED: { status: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  OUT_FOR_DELIVERY: { status: "DELIVERED", label: "Mark delivered" },
};

export function OrdersView({ orders, shopifyConnected }: { orders: OrderRow[]; shopifyConnected: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState("open");
  const [source, setSource] = useState("");
  const [open, setOpen] = useState<OrderRow | null>(null);
  const [recording, setRecording] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const id = params.get("open");
    if (id) setOpen(orders.find((o) => o.id === id) ?? null);
  }, [params, orders]);
  useEffect(() => {
    if (open) setOpen(orders.find((o) => o.id === open.id) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.id, orders.filter((o) => t.match(o.status)).length])), [orders]);
  const visible = orders.filter((o) => TABS.find((t) => t.id === tab)?.match(o.status) && (!source || o.source === source));

  const syncShopify = async () => {
    setSyncing(true);
    try {
      const { imported } = await api<{ imported: number }>("/api/channels/shopify/orders", { method: "POST" });
      toast.success(imported ? `Imported ${imported} Shopify orders` : "Shopify orders are up to date");
      router.refresh();
    } catch (e) {
      toastError(e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every order from ONDC, Shopify and your counter in one place."
        actions={
          <>
            {shopifyConnected ? (
              <Button variant="outline" onClick={syncShopify} disabled={syncing}>
                {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />} Shopify orders
              </Button>
            ) : null}
            <Button onClick={() => setRecording(true)}>
              <Plus /> Record a sale
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border bg-card p-0.5 text-sm">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn("rounded-md px-3 py-1.5", tab === t.id ? "bg-muted font-medium" : "text-muted-foreground")}>
              {t.label}
              {counts[t.id] ? <span className="ml-1.5 text-xs text-muted-foreground tabular">{counts[t.id]}</span> : null}
            </button>
          ))}
        </div>
        <NativeSelect value={source} onChange={(e) => setSource(e.target.value)} className="sm:w-44" aria-label="Channel">
          <option value="">All channels</option>
          {Object.entries(SOURCE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </NativeSelect>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={tab === "open" ? "Nothing to do right now" : "No orders here"}
          description={
            orders.length
              ? "Orders that match this view will show up here."
              : "When buyers order through ONDC or Shopify they land here. You can also record counter and WhatsApp sales to keep stock and sales numbers accurate."
          }
        >
          <Button variant="outline" onClick={() => setRecording(true)}>
            <Plus /> Record a sale
          </Button>
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <ul className="divide-y">
            {visible.map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => setOpen(o)} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium">{o.orderNumber}</span>
                      <Pill tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Pill>
                      <span className="text-xs text-muted-foreground">{SOURCE_LABEL[o.source]}{o.buyerApp ? ` · via ${o.buyerApp}` : ""}</span>
                    </div>
                    <div className="mt-0.5 truncate text-sm text-muted-foreground">
                      {o.customerName ?? "Walk-in customer"} · {o.items.reduce((n, i) => n + i.quantity, 0)} items · {timeAgo(o.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium tabular">{inr(o.total)}</div>
                    <div className={cn("text-xs", o.paymentStatus === "PAID" ? "text-success" : "text-muted-foreground")}>
                      {o.paymentStatus === "PAID" ? "Paid" : o.paymentMethod === "COD" ? "Cash on delivery" : "Unpaid"}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <OrderSheet order={open} onClose={() => setOpen(null)} onChanged={() => router.refresh()} />
      <RecordSale open={recording} onOpenChange={setRecording} onDone={() => router.refresh()} />
    </>
  );
}

function OrderSheet({ order, onClose, onChanged }: { order: OrderRow | null; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const update = async (data: Record<string, string>) => {
    if (!order) return;
    setBusy(Object.values(data)[0]);
    try {
      await api(`/api/orders/${order.id}`, { method: "PATCH", json: data });
      toast.success(order.source === "ONDC" && data.status ? "Updated. The buyer app has been notified." : "Order updated");
      onChanged();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(null);
    }
  };
  const next = order ? NEXT[order.status] : undefined;
  return (
    <Sheet open={Boolean(order)} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {order ? (
          <>
            <SheetHeader>
              <SheetTitle className="font-mono">{order.orderNumber}</SheetTitle>
              <SheetDescription>
                {SOURCE_LABEL[order.source]} · {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-5 px-4 pb-6">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={ORDER_STATUS[order.status].tone}>{ORDER_STATUS[order.status].label}</Pill>
                <Pill tone={order.paymentStatus === "PAID" ? "success" : "neutral"}>{order.paymentStatus === "PAID" ? "Paid" : order.paymentMethod === "COD" ? "Collect on delivery" : "Unpaid"}</Pill>
              </div>

              {next ? (
                <div className="flex gap-2">
                  <Button className="flex-1" size="lg" disabled={Boolean(busy)} onClick={() => update({ status: next.status })}>
                    {busy === next.status ? <Loader2 className="animate-spin" /> : null} {next.label}
                  </Button>
                  <Button variant="outline" size="lg" disabled={Boolean(busy)} onClick={() => update({ status: "CANCELLED" })}>
                    Cancel
                  </Button>
                </div>
              ) : null}

              <div className="rounded-lg border">
                <ul className="divide-y text-sm">
                  {order.items.map((i, idx) => (
                    <li key={`${i.name}-${idx}`} className="flex items-center gap-3 px-3 py-2">
                      <span className="w-8 text-muted-foreground tabular">{i.quantity}×</span>
                      <span className="flex-1">{i.name}</span>
                      <span className="tabular">{inr(i.price * i.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-1 border-t px-3 py-2 text-sm">
                  {order.deliveryFee ? (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Delivery</span>
                      <span className="tabular">{inr(order.deliveryFee)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span className="tabular">{inr(order.total)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div className="font-medium">{order.customerName ?? "Walk-in customer"}</div>
                {order.customerPhone ? (
                  <a href={`tel:${order.customerPhone}`} className="inline-flex items-center gap-1.5 text-primary">
                    <Phone className="size-3.5" /> {order.customerPhone}
                  </a>
                ) : null}
                {order.customerAddress ? <p className="text-muted-foreground">{order.customerAddress}</p> : null}
                {order.notes ? <p className="text-muted-foreground">Note: {order.notes}</p> : null}
              </div>

              {order.paymentStatus !== "PAID" && order.status !== "CANCELLED" ? (
                <Button variant="outline" className="w-full" disabled={Boolean(busy)} onClick={() => update({ paymentStatus: "PAID" })}>
                  Mark as paid
                </Button>
              ) : null}
              {order.source === "ONDC" ? (
                <p className="text-xs text-muted-foreground">
                  Status changes are sent to {order.buyerApp ?? "the buyer app"} instantly, so your customer sees them in their app.
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function RecordSale({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProductDTO[]>([]);
  const [cart, setCart] = useState<{ p: ProductDTO; qty: number }[]>([]);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [method, setMethod] = useState("CASH");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      api<{ products: ProductDTO[] }>(`/api/products?status=ACTIVE&limit=8${q ? `&q=${encodeURIComponent(q)}` : ""}`)
        .then((r) => setResults(r.products))
        .catch(() => undefined);
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  const add = (p: ProductDTO) => {
    if (p.price === null) return toast.error("Set a price for this product first.");
    setCart((c) => (c.some((x) => x.p.id === p.id) ? c.map((x) => (x.p.id === p.id ? { ...x, qty: x.qty + 1 } : x)) : [...c, { p, qty: 1 }]));
  };
  const total = cart.reduce((s, x) => s + (x.p.price ?? 0) * x.qty, 0);

  const save = async () => {
    setSaving(true);
    try {
      const { order } = await api<{ order: { orderNumber: string } }>("/api/orders", {
        method: "POST",
        json: {
          items: cart.map((x) => ({ productId: x.p.id, quantity: x.qty })),
          customerName: customer.name || undefined,
          customerPhone: customer.phone || undefined,
          paymentMethod: method,
          paid: method !== "COD",
        },
      });
      toast.success(`Sale ${order.orderNumber} recorded`);
      setCart([]);
      setCustomer({ name: "", phone: "" });
      onOpenChange(false);
      onDone();
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record a sale</DialogTitle>
          <DialogDescription>Counter, phone or WhatsApp orders. Stock goes down and the sale counts in your analytics.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="pl-9" autoFocus />
          </div>
          <ul className="max-h-48 divide-y overflow-y-auto rounded-lg border">
            {results.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => add(p)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50">
                  <ProductThumb src={p.imageUrl} name={p.name} size={28} />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-muted-foreground tabular">{inr(p.price)}</span>
                  <Plus className="size-4 text-primary" />
                </button>
              </li>
            ))}
            {!results.length ? <li className="px-3 py-4 text-center text-sm text-muted-foreground">No active products match.</li> : null}
          </ul>
          {cart.length ? (
            <ul className="space-y-2">
              {cart.map((x) => (
                <li key={x.p.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{x.p.name}</span>
                  <div className="flex items-center rounded-md border">
                    <button type="button" className="grid size-7 place-items-center" onClick={() => setCart((c) => c.map((y) => (y.p.id === x.p.id ? { ...y, qty: Math.max(1, y.qty - 1) } : y)))} aria-label="Less">
                      <Minus className="size-3" />
                    </button>
                    <span className="w-6 text-center tabular">{x.qty}</span>
                    <button type="button" className="grid size-7 place-items-center" onClick={() => setCart((c) => c.map((y) => (y.p.id === x.p.id ? { ...y, qty: y.qty + 1 } : y)))} aria-label="More">
                      <Plus className="size-3" />
                    </button>
                  </div>
                  <span className="w-20 text-right tabular">{inr((x.p.price ?? 0) * x.qty)}</span>
                  <button type="button" onClick={() => setCart((c) => c.filter((y) => y.p.id !== x.p.id))} className="text-muted-foreground" aria-label="Remove">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Customer name (optional)" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
            <Input placeholder="Phone (optional)" inputMode="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
          </div>
          <div className="flex gap-1.5">
            {[
              ["CASH", "Cash"],
              ["UPI", "UPI"],
              ["COD", "Pay later"],
            ].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setMethod(v)} className={cn("flex-1 rounded-md border py-1.5 text-sm", method === v ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground")}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button className="w-full" size="lg" disabled={!cart.length || saving} onClick={save}>
            {saving ? <Loader2 className="animate-spin" /> : null} Record sale · {inr(total)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
