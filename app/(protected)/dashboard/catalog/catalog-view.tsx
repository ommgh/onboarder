"use client";

import {
  Archive,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Package,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, toastError } from "@/components/app/api";
import { EmptyState } from "@/components/app/empty-state";
import { NativeSelect, OndcCategorySelect } from "@/components/app/fields";
import { PageHeader } from "@/components/app/page-header";
import { ProductThumb } from "@/components/app/product-thumb";
import { LISTING_STATUS, PRODUCT_STATUS, Pill } from "@/components/app/status";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { inr, num } from "@/lib/format";
import { qualityBand, scoreListing } from "@/lib/products/quality";
import type { ProductDTO } from "@/lib/products/serialize";
import { formatQuantity } from "@/lib/products/units";
import { cn } from "@/lib/utils";

const TYPES = [
  { value: "all", label: "All" },
  { value: "PACKAGED", label: "Packaged" },
  { value: "LOOSE", label: "Loose" },
  { value: "HANDMADE", label: "Handmade" },
  { value: "APPAREL", label: "Apparel" },
];
const FILTERS = [
  { value: "", label: "Everything" },
  { value: "no-price", label: "Missing price" },
  { value: "no-photo", label: "Missing photo" },
  { value: "no-category", label: "Missing category" },
  { value: "low-stock", label: "Low stock (≤5)" },
  { value: "needs-action", label: "Channel issues" },
];
const PAGE = 50;

export function CatalogView({ connected, limit }: { connected: { SHOPIFY: boolean; AMAZON: boolean }; limit: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const type = params.get("type") ?? "all";
  const filter = params.get("filter") ?? "";
  const status = params.get("status") ?? "";
  const [q, setQ] = useState(params.get("q") ?? "");
  const [items, setItems] = useState<ProductDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const req = useRef(0);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v && v !== "all") next.set(k, v);
    else next.delete(k);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  const load = useCallback(
    async (offset = 0) => {
      const id = ++req.current;
      offset ? setMore(true) : setLoading(true);
      const sp = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
      if (type !== "all") sp.set("type", type);
      if (filter) sp.set("filter", filter);
      if (status) sp.set("status", status);
      const query = params.get("q");
      if (query) sp.set("q", query);
      try {
        const r = await api<{ products: ProductDTO[]; total: number }>(`/api/products?${sp}`);
        if (id !== req.current) return;
        setItems((cur) => (offset ? [...cur, ...r.products] : r.products));
        setTotal(r.total);
      } catch (e) {
        toastError(e);
      } finally {
        if (id === req.current) {
          setLoading(false);
          setMore(false);
        }
      }
    },
    [type, filter, status, params],
  );

  useEffect(() => {
    setSelected(new Set());
    load(0);
  }, [load]);

  // debounce search into the URL
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) setParam("q", q);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const patch = async (id: string, data: Record<string, unknown>) => {
    try {
      const { product } = await api<{ product: ProductDTO }>(`/api/products/${id}`, { method: "PATCH", json: data });
      setItems((cur) => cur.map((p) => (p.id === id ? product : p)));
    } catch (e) {
      toastError(e);
    }
  };

  const bulk = async (action: string, value?: string) => {
    setBusy(true);
    try {
      const { affected } = await api<{ affected: number }>("/api/products/bulk", { method: "PATCH", json: { ids: [...selected], action, value } });
      toast.success(`Updated ${affected} products`);
      setSelected(new Set());
      await load(0);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const publish = async (provider: "shopify" | "amazon") => {
    setBusy(true);
    const ids = [...selected];
    const t = toast.loading(`Publishing ${ids.length} to ${provider === "shopify" ? "Shopify" : "Amazon"}…`);
    try {
      let ok = 0;
      let failed = 0;
      for (let i = 0; i < ids.length; i += 50) {
        const r = await api<{ published: number; failed: number }>(`/api/channels/${provider}/publish`, {
          method: "POST",
          json: { productIds: ids.slice(i, i + 50) },
        });
        ok += r.published;
        failed += r.failed;
      }
      toast.success(`${ok} published${failed ? `, ${failed} need attention` : ""}`, { id: t });
      setSelected(new Set());
      await load(0);
    } catch (e) {
      toast.dismiss(t);
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const allChecked = items.length > 0 && items.every((p) => selected.has(p.id));
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(items.map((p) => p.id)));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const exportHref = (format: string) => `/api/products/export?format=${format}${selected.size ? `&ids=${[...selected].join(",")}` : ""}`;
  const isFiltered = type !== "all" || filter || status || params.get("q");

  return (
    <>
      <PageHeader
        title="Catalog"
        description={loading ? "Loading…" : `${num(total)} ${isFiltered ? "matching" : "of " + num(limit)} products`}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download /> Export <ChevronDown className="opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {selected.size ? `${selected.size} selected` : "Whole catalog"}
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <a href={exportHref("csv")}>Spreadsheet (CSV)</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={exportHref("flipkart")}>Flipkart listing sheet</a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild>
              <Link href="/dashboard/add">
                <Plus /> Add
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU, barcode or brand" className="pl-9" />
          </div>
          <NativeSelect value={filter} onChange={(e) => setParam("filter", e.target.value)} className="sm:w-48" aria-label="Filter">
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect value={status} onChange={(e) => setParam("status", e.target.value)} className="sm:w-36" aria-label="Status">
            <option value="">Active & drafts</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Drafts</option>
            <option value="ARCHIVED">Archived</option>
          </NativeSelect>
        </div>
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setParam("type", t.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-sm transition-colors",
                type === t.value ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="sticky top-16 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2 shadow-sm">
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            <X /> {selected.size} selected
          </Button>
          <div className="mx-1 h-5 w-px bg-border" />
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => bulk("activate")}>
            <Eye /> Activate
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => bulk("draft")}>
            <EyeOff /> Draft
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={busy}>
                <Send /> Publish <ChevronDown className="opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem disabled={!connected.SHOPIFY} onSelect={() => publish("shopify")}>
                Shopify {connected.SHOPIFY ? "" : "(not connected)"}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!connected.AMAZON} onSelect={() => publish("amazon")}>
                Amazon.in {connected.AMAZON ? "" : "(not connected)"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/channels/ondc">ONDC is automatic for ready products</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="w-52">
            <OndcCategorySelect value={null} onChange={(v) => v && bulk("set-ondc-category", v)} placeholder="Set category…" disabled={busy} />
          </div>
          <div className="ml-auto flex gap-1">
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => bulk("archive")}>
              <Archive /> Archive
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Delete
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        isFiltered ? (
          <EmptyState icon={Search} title="Nothing matches" description="Try a different search or clear the filters.">
            <Button variant="outline" onClick={() => router.replace(pathname)}>
              Clear filters
            </Button>
          </EmptyState>
        ) : (
          <EmptyState icon={Package} title="Your catalog is empty" description="Scan barcodes, pick loose staples or photograph handmade work to get started.">
            <Button asChild>
              <Link href="/dashboard/add">Add products</Link>
            </Button>
          </EmptyState>
        )
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="hidden grid-cols-[32px_minmax(0,1fr)_110px_90px_120px_70px] items-center gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
            <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="Select all" />
            <span>Product</span>
            <span>Price</span>
            <span>Stock</span>
            <span>Channels</span>
            <span className="text-right">Score</span>
          </div>
          <ul className="divide-y">
            {items.map((p) => (
              <CatalogRow key={p.id} p={p} checked={selected.has(p.id)} onCheck={() => toggle(p.id)} onPatch={(d) => patch(p.id, d)} />
            ))}
          </ul>
          {items.length < total ? (
            <div className="border-t p-3 text-center">
              <Button variant="ghost" onClick={() => load(items.length)} disabled={more}>
                {more ? <Loader2 className="animate-spin" /> : null} Show more ({num(total - items.length)} left)
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} products?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. Past orders keep their line items. To hide products without losing them, archive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => bulk("delete")}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const CHANNEL_DOTS = [
  { id: "ONDC", label: "ONDC" },
  { id: "SHOPIFY", label: "Shopify" },
  { id: "AMAZON", label: "Amazon" },
];

function CatalogRow({ p, checked, onCheck, onPatch }: { p: ProductDTO; checked: boolean; onCheck: () => void; onPatch: (d: Record<string, unknown>) => void }) {
  const { score } = scoreListing({ ...p, imageUrl: p.imageUrl, images: p.images });
  const band = qualityBand(score);
  const size = formatQuantity(p.unitValue, p.unit);
  const listings = new Map((p.listings ?? []).map((l) => [l.provider, l]));
  return (
    <li className={cn("grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 md:grid-cols-[32px_minmax(0,1fr)_110px_90px_120px_70px]", checked && "bg-accent/40")}>
      <Checkbox checked={checked} onCheckedChange={onCheck} aria-label={`Select ${p.name}`} />
      <Link href={`/dashboard/catalog/${p.id}`} className="flex min-w-0 items-center gap-3">
        <ProductThumb src={p.imageUrl} name={p.name} size={44} />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium hover:underline">{p.name}</div>
          <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            {p.status !== "ACTIVE" ? <Pill tone={PRODUCT_STATUS[p.status].tone}>{PRODUCT_STATUS[p.status].label}</Pill> : null}
            {[size, p.brand, p.sku ?? p.barcode].filter(Boolean).join(" · ") || p.category}
          </div>
          <div className="mt-0.5 text-xs font-medium tabular md:hidden">
            {inr(p.price)} {p.stock !== null ? <span className="font-normal text-muted-foreground">· {p.stock} in stock</span> : null}
          </div>
        </div>
      </Link>
      <InlineNumber className="hidden md:block" value={p.price} prefix="₹" placeholder="Set price" onSave={(v) => onPatch({ price: v, ...(p.status === "DRAFT" && v ? { status: "ACTIVE" } : {}) })} />
      <InlineNumber className="hidden md:block" value={p.stock} placeholder="∞" integer onSave={(v) => onPatch({ stock: v })} />
      <div className="hidden items-center gap-1 md:flex">
        {CHANNEL_DOTS.map((c) => {
          const l = listings.get(c.id as never);
          const tone = l ? LISTING_STATUS[l.status] : null;
          return (
            <span
              key={c.id}
              title={`${c.label}: ${tone?.label ?? "Not listed"}${l?.message ? ` (${l.message})` : ""}`}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                !l && "bg-muted text-muted-foreground/60",
                l?.status === "LIVE" && "bg-success/15 text-success",
                (l?.status === "NEEDS_ACTION" || l?.status === "FAILED") && "bg-destructive/12 text-destructive",
                (l?.status === "PENDING" || l?.status === "PAUSED") && "bg-warning/20 text-foreground/70",
              )}
            >
              {c.label.slice(0, 3)}
            </span>
          );
        })}
      </div>
      <div className="text-right">
        <span
          title="Listing score: how complete and convincing this listing is"
          className={cn(
            "inline-block min-w-9 rounded-md px-1.5 py-0.5 text-center text-xs font-semibold tabular",
            band === "great" && "bg-success/15 text-success",
            band === "good" && "bg-warning/20 text-foreground/80",
            band === "weak" && "bg-destructive/12 text-destructive",
          )}
        >
          {score}
        </span>
      </div>
    </li>
  );
}

function InlineNumber({ value, onSave, prefix, placeholder, integer, className }: {
  value: number | null;
  onSave: (v: number | null) => void;
  prefix?: string;
  placeholder?: string;
  integer?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  useEffect(() => setDraft(value === null ? "" : String(value)), [value]);
  const commit = () => {
    const next = draft.trim() === "" ? null : integer ? Math.max(0, Math.trunc(Number(draft))) : Number(draft);
    if (next !== value && (next === null || Number.isFinite(next))) onSave(next);
  };
  return (
    <div className={cn("relative", className)}>
      {prefix ? <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span> : null}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(integer ? /[^\d]/g : /[^\d.]/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        inputMode={integer ? "numeric" : "decimal"}
        placeholder={placeholder}
        className={cn(
          "h-8 w-full rounded-md border border-transparent bg-transparent text-sm tabular outline-none hover:border-input focus:border-ring focus:bg-background",
          prefix ? "pl-5" : "pl-2",
          !draft && "placeholder:text-primary/70",
        )}
      />
    </div>
  );
}
