"use client";

import {
  Clock,
  MapPin,
  Minus,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Input } from "@/components/ui/input";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface StorefrontGroup {
  key: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  vegType: string | null;
  options: {
    id: string;
    label: string;
    price: number;
    mrp: number | null;
    inStock: boolean;
  }[];
}

interface StoreInfo {
  name: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  whatsapp: string;
  phone: string | null;
  address: string;
  hours: string;
  open: boolean;
  delivery: boolean;
  pickup: boolean;
  deliveryFee: number;
  minOrderValue: number;
  mapUrl: string | null;
}

type Cart = Record<string, number>;

export function Storefront({
  store,
  groups,
}: {
  store: StoreInfo;
  groups: StorefrontGroup[];
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [cart, setCart] = useState<Cart>({});
  const [open, setOpen] = useState(false);
  const [buyer, setBuyer] = useState({
    name: "",
    address: "",
    pickup: !store.delivery,
  });
  const storageKey = `onboarder:cart:${store.name}`;

  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem(storageKey) ?? "{}"));
    } catch {
      /* ignore */
    }
  }, [storageKey]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart, storageKey]);

  const options = useMemo(
    () =>
      new Map(
        groups.flatMap((g) => g.options.map((o) => [o.id, { g, o }] as const)),
      ),
    [groups],
  );
  const categories = ["All", ...new Set(groups.map((g) => g.category))];
  const visible = groups.filter(
    (g) =>
      (cat === "All" || g.category === cat) &&
      (!q || g.name.toLowerCase().includes(q.toLowerCase())),
  );
  const lines = Object.entries(cart).flatMap(([id, n]) => {
    const hit = options.get(id);
    return n > 0 && hit ? [{ ...hit, n }] : [];
  });
  const subtotal = lines.reduce((s, l) => s + l.o.price * l.n, 0);
  const fee = buyer.pickup ? 0 : store.deliveryFee;
  const count = lines.reduce((s, l) => s + l.n, 0);
  const add = (id: string, d: number) =>
    setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + d) }));

  const message = [
    `Hello ${store.name}, I'd like to order:`,
    ...lines.map(
      (l) =>
        `• ${l.n} × ${l.g.name}${l.o.label ? ` (${l.o.label})` : ""}: ${inr(l.o.price * l.n)}`,
    ),
    `Total: ${inr(subtotal + fee)}${fee ? ` incl. ${inr(fee)} delivery` : ""}`,
    buyer.pickup
      ? "I'll pick it up from the shop."
      : `Deliver to: ${buyer.address || "(address)"}`,
    buyer.name ? `Name: ${buyer.name}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const waUrl = `https://wa.me/91${store.whatsapp}?text=${encodeURIComponent(message)}`;
  const belowMin = store.minOrderValue > 0 && subtotal < store.minOrderValue;

  const accent = store.brandColor ?? undefined;
  return (
    <div
      className="min-h-dvh bg-background"
      style={
        accent
          ? ({ "--primary": accent, "--ring": accent } as React.CSSProperties)
          : undefined
      }
    >
      <header className="border-b bg-card">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
          <div className="flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary text-2xl font-semibold text-primary-foreground">
              {store.logoUrl ? (
                <img
                  src={store.logoUrl}
                  alt=""
                  className="size-full bg-white object-cover"
                />
              ) : (
                store.name.slice(0, 1)
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
                {store.name}
              </h1>
              {store.tagline ? (
                <p className="text-muted-foreground">{store.tagline}</p>
              ) : null}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  "size-2 rounded-full",
                  store.open ? "bg-success" : "bg-muted-foreground/50",
                )}
              />
              <span className={store.open ? "font-medium text-foreground" : ""}>
                {store.open ? "Open now" : "Closed"}
              </span>
              <Clock className="ml-1 size-3.5" /> {store.hours}
            </span>
            {store.delivery ? (
              <span className="inline-flex items-center gap-1.5">
                <Truck className="size-3.5" /> Home delivery
                {store.deliveryFee ? ` · ${inr(store.deliveryFee)}` : " · free"}
              </span>
            ) : null}
            {store.address ? (
              <a
                href={store.mapUrl ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                <MapPin className="size-3.5" /> {store.address}
              </a>
            ) : null}
            {store.phone ? (
              <a
                href={`tel:${store.phone}`}
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                <Phone className="size-3.5" /> {store.phone}
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-5xl space-y-3 px-4 py-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${store.name}`}
              className="pl-9"
            />
          </div>
          {categories.length > 2 ? (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-sm",
                    cat === c
                      ? "border-foreground bg-foreground text-background"
                      : "bg-card",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6 pb-32">
        {visible.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">
            {groups.length
              ? "Nothing matches your search."
              : "This shop is setting up its catalog. Check back soon!"}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((g) => (
              <ProductCard key={g.key} g={g} cart={cart} onAdd={add} />
            ))}
          </div>
        )}
      </main>

      {count > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mx-auto flex w-full max-w-md items-center justify-between rounded-2xl bg-primary px-5 py-3.5 text-primary-foreground shadow-xl"
          >
            <span className="inline-flex items-center gap-2 font-medium">
              <ShoppingBag className="size-5" /> {count} item
              {count > 1 ? "s" : ""}
            </span>
            <span className="font-semibold tabular">
              {inr(subtotal)} · View order
            </span>
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-30 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close order"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Your order"
            className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your order</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <ul className="divide-y">
              {lines.map((l) => (
                <li
                  key={l.o.id}
                  className="flex items-center gap-3 py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{l.g.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.o.label}
                    </div>
                  </div>
                  <Stepper n={l.n} onChange={(d) => add(l.o.id, d)} />
                  <span className="w-16 text-right tabular">
                    {inr(l.o.price * l.n)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-3">
              {store.delivery && store.pickup ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    [false, "Deliver to me"],
                    [true, "I'll pick up"],
                  ].map(([v, l]) => (
                    <button
                      key={String(v)}
                      type="button"
                      onClick={() =>
                        setBuyer({ ...buyer, pickup: v as boolean })
                      }
                      className={cn(
                        "rounded-lg border py-2",
                        buyer.pickup === v
                          ? "border-primary bg-primary/10 font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {l as string}
                    </button>
                  ))}
                </div>
              ) : null}
              <Input
                placeholder="Your name"
                value={buyer.name}
                onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
              />
              {!buyer.pickup ? (
                <Input
                  placeholder="Delivery address"
                  value={buyer.address}
                  onChange={(e) =>
                    setBuyer({ ...buyer, address: e.target.value })
                  }
                />
              ) : null}
              <div className="space-y-1 border-t pt-3 text-sm">
                {fee ? (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery</span>
                    <span className="tabular">{inr(fee)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="tabular">{inr(subtotal + fee)}</span>
                </div>
              </div>
              {belowMin ? (
                <p className="text-sm text-destructive">
                  Minimum order is {inr(store.minOrderValue)}.
                </p>
              ) : null}
              {store.whatsapp.length === 10 ? (
                <a
                  href={belowMin ? undefined : waUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={belowMin}
                  className={cn(
                    "flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] font-medium text-white",
                    belowMin && "pointer-events-none opacity-50",
                  )}
                >
                  Send order on WhatsApp
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Call {store.phone ?? "the shop"} to place this order.
                </p>
              )}
              <p className="text-center text-xs text-muted-foreground">
                The shop confirms your order and payment on WhatsApp.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 hover:text-foreground"
        >
          <LogoMark className="size-4" /> Shop online with Onboarder
        </a>
      </footer>
    </div>
  );
}

function Stepper({
  n,
  onChange,
}: {
  n: number;
  onChange: (d: number) => void;
}) {
  return (
    <div className="flex h-8 items-center rounded-lg border">
      <button
        type="button"
        className="grid size-8 place-items-center"
        onClick={() => onChange(-1)}
        aria-label="Remove one"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-5 text-center text-sm tabular">{n}</span>
      <button
        type="button"
        className="grid size-8 place-items-center"
        onClick={() => onChange(1)}
        aria-label="Add one"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function ProductCard({
  g,
  cart,
  onAdd,
}: {
  g: StorefrontGroup;
  cart: Cart;
  onAdd: (id: string, d: number) => void;
}) {
  const [sel, setSel] = useState(
    g.options.find((o) => o.inStock)?.id ?? g.options[0].id,
  );
  const o = g.options.find((x) => x.id === sel) ?? g.options[0];
  const n = cart[o.id] ?? 0;
  const off =
    o.mrp && o.mrp > o.price ? Math.round((1 - o.price / o.mrp) * 100) : 0;
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <div className="relative aspect-square bg-white">
        <img
          src={g.imageUrl || `/api/placeholder/${g.options[0].id}`}
          alt=""
          loading="lazy"
          className="size-full object-cover"
        />
        {off ? (
          <span className="absolute top-2 left-2 rounded-md bg-success px-1.5 py-0.5 text-[11px] font-semibold text-success-foreground">
            {off}% off
          </span>
        ) : null}
        {g.vegType ? (
          <span
            title={g.vegType === "veg" ? "Vegetarian" : "Non-vegetarian"}
            className={cn(
              "absolute top-2 right-2 grid size-4 place-items-center border-2 bg-white",
              g.vegType === "veg" ? "border-green-700" : "border-red-700",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                g.vegType === "veg" ? "bg-green-700" : "bg-red-700",
              )}
            />
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <div className="line-clamp-2 text-sm font-medium">{g.name}</div>
        {g.options.length > 1 ? (
          <select
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            className="mt-2 h-8 rounded-md border bg-transparent px-2 text-xs"
          >
            {g.options.map((x) => (
              <option key={x.id} value={x.id} disabled={!x.inStock}>
                {x.label} · {inr(x.price)}
                {x.inStock ? "" : " (out of stock)"}
              </option>
            ))}
          </select>
        ) : o.label ? (
          <div className="mt-1 text-xs text-muted-foreground">{o.label}</div>
        ) : null}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <div className="font-semibold tabular">{inr(o.price)}</div>
            {off ? (
              <div className="text-xs text-muted-foreground line-through tabular">
                {inr(o.mrp)}
              </div>
            ) : null}
          </div>
          {!o.inStock ? (
            <span className="text-xs text-muted-foreground">Out of stock</span>
          ) : n ? (
            <Stepper n={n} onChange={(d) => onAdd(o.id, d)} />
          ) : (
            <button
              type="button"
              onClick={() => onAdd(o.id, 1)}
              className="h-8 rounded-lg border border-primary px-3 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
