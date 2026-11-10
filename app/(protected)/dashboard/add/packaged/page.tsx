"use client";

import { AlertCircle, Barcode, CheckCircle2, Keyboard, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, toastError } from "@/components/app/api";
import { BarcodeScanner } from "@/components/app/barcode-scanner";
import { EmptyState } from "@/components/app/empty-state";
import { MoneyInput, OndcCategorySelect } from "@/components/app/fields";
import { PageHeader } from "@/components/app/page-header";
import { ProductThumb } from "@/components/app/product-thumb";
import { Pill } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { guessOndcCategory } from "@/lib/ondc/taxonomy";
import { formatQuantity } from "@/lib/products/units";

interface Lookup {
  barcode: string;
  existing: { id: string; name: string } | null;
  product: {
    name: string;
    brand: string | null;
    description: string;
    category: string | null;
    imageUrl: string | null;
    unit: string | null;
    unitValue: number | null;
    manufacturer: string | null;
    vegType: string | null;
  } | null;
}

interface Row {
  barcode: string;
  status: "loading" | "found" | "unknown" | "exists" | "error";
  existingId?: string;
  name: string;
  brand: string | null;
  description: string;
  imageUrl: string | null;
  unit: string | null;
  unitValue: number | null;
  manufacturer: string | null;
  vegType: string | null;
  ondcCategory: string | null;
  price: string;
  mrp: string;
  count: number;
}

const STORAGE_KEY = "onboarder:scan-queue";

export default function ScanPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [manual, setManual] = useState("");
  const [saving, setSaving] = useState(false);
  const manualRef = useRef<HTMLInputElement>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  // Restore an unfinished session.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Row[];
      if (saved.length) setRows(saved.map((r) => (r.status === "loading" ? { ...r, status: "error" } : r)));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch {
      /* storage full or blocked */
    }
  }, [rows]);

  const update = (barcode: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.barcode === barcode ? { ...r, ...patch } : r)));

  const lookup = async (barcode: string) => {
    try {
      const res = await api<Lookup>(`/api/barcode/${encodeURIComponent(barcode)}`);
      const p = res.product;
      update(res.barcode, {
        status: res.existing ? "exists" : p ? "found" : "unknown",
        existingId: res.existing?.id,
        name: p?.name ?? res.existing?.name ?? "",
        brand: p?.brand ?? null,
        description: p?.description ?? "",
        imageUrl: p?.imageUrl ?? null,
        unit: p?.unit ?? null,
        unitValue: p?.unitValue ?? null,
        manufacturer: p?.manufacturer ?? null,
        vegType: p?.vegType ?? null,
        ondcCategory: guessOndcCategory(p?.category, p?.name),
      });
    } catch (e) {
      update(barcode, { status: "error" });
      toastError(e);
    }
  };

  const add = (raw: string) => {
    const barcode = raw.replace(/\D/g, "");
    if (barcode.length < 8 || barcode.length > 14) {
      toast.error("That doesn't look like a product barcode (8–14 digits).");
      return;
    }
    const existing = rowsRef.current.find((r) => r.barcode === barcode);
    if (existing) {
      update(barcode, { count: existing.count + 1 });
      toast.success(`${existing.name || barcode}: ${existing.count + 1} in stock`, { duration: 1200 });
      return;
    }
    setRows((rs) => [
      { barcode, status: "loading", name: "", brand: null, description: "", imageUrl: null, unit: null, unitValue: null, manufacturer: null, vegType: null, ondcCategory: null, price: "", mrp: "", count: 1 },
      ...rs,
    ]);
    lookup(barcode);
  };

  const ready = rows.filter((r) => (r.status === "found" || r.status === "unknown") && r.name.trim());
  const missingPrice = ready.filter((r) => !r.price).length;

  const saveAll = async () => {
    if (!ready.length) return;
    setSaving(true);
    try {
      const { created } = await api<{ created: number }>("/api/products/bulk", {
        method: "POST",
        json: {
          products: ready.map((r) => ({
            name: r.name.trim(),
            description: r.description,
            type: "PACKAGED",
            status: r.price ? "ACTIVE" : "DRAFT",
            barcode: r.barcode,
            brand: r.brand,
            manufacturer: r.manufacturer,
            imageUrl: r.imageUrl && /^https:/.test(r.imageUrl) ? r.imageUrl : "",
            unit: r.unit,
            unitValue: r.unitValue,
            vegType: r.vegType,
            ondcCategory: r.ondcCategory,
            category: r.ondcCategory ?? "General",
            price: r.price || null,
            mrp: r.mrp || r.price || null,
            stock: r.count,
          })),
        },
      });
      setRows((rs) => rs.filter((r) => !ready.includes(r)));
      toast.success(`${created} products added to your catalog`, {
        action: { label: "View", onClick: () => router.push("/dashboard/catalog") },
      });
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        back={{ href: "/dashboard/add", label: "Add products" }}
        title="Scan packaged goods"
        description="Anything with a barcode. We fetch the name, brand, size and photo; you add your price. Works with your phone camera or a USB barcode scanner."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <BarcodeScanner onScan={add} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manual.trim()) add(manual);
              setManual("");
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Keyboard className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={manualRef}
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                inputMode="numeric"
                placeholder="USB scanner or type a barcode"
                className="pl-9 font-mono"
                aria-label="Barcode"
              />
            </div>
            <Button type="submit" variant="outline">
              Add
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Tip: with a USB or Bluetooth scanner, click the box above once and keep scanning. Each beep adds a row.
          </p>
        </div>

        <div>
          {rows.length === 0 ? (
            <EmptyState
              icon={Barcode}
              title="Scanned items appear here"
              description="Scan a shelf at a time. Nothing is saved until you press Save, and your list survives a page refresh."
            />
          ) : (
            <div className="rounded-xl border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                <div className="text-sm">
                  <span className="font-medium">{rows.length} scanned</span>
                  <span className="text-muted-foreground"> · {ready.length} ready to save</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setRows([])}>
                  Clear list
                </Button>
              </div>
              <ul className="divide-y">
                {rows.map((r) => (
                  <ScanRow key={r.barcode} row={r} onChange={(p) => update(r.barcode, p)} onRemove={() => setRows((rs) => rs.filter((x) => x !== r))} />
                ))}
              </ul>
              <div className="sticky bottom-20 flex flex-col gap-2 border-t bg-card/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between md:bottom-0">
                <p className="text-xs text-muted-foreground">
                  {missingPrice ? `${missingPrice} without a price will be saved as drafts.` : "All set. Items go live on your channels right away."}
                </p>
                <Button onClick={saveAll} disabled={!ready.length || saving} size="lg">
                  {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                  Save {ready.length || ""} to catalog
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ScanRow({ row: r, onChange, onRemove }: { row: Row; onChange: (p: Partial<Row>) => void; onRemove: () => void }) {
  return (
    <li className="space-y-3 px-4 py-3">
      <div className="flex items-start gap-3">
        {r.status === "loading" ? (
          <div className="grid size-12 shrink-0 place-items-center rounded-md bg-muted">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ProductThumb src={r.imageUrl} name={r.name || r.barcode} size={48} />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          {r.status === "loading" ? (
            <div className="text-sm text-muted-foreground">Looking up {r.barcode}…</div>
          ) : (
            <Input
              value={r.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Not found online. Type the product name"
              className="h-8 font-medium"
              disabled={r.status === "exists"}
            />
          )}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-mono">{r.barcode}</span>
            {r.unitValue && r.unit ? <span>· {formatQuantity(r.unitValue, r.unit)}</span> : null}
            {r.status === "exists" ? (
              <Pill tone="info">
                Already in catalog ·{" "}
                <Link href={`/dashboard/catalog/${r.existingId}`} className="underline">
                  open
                </Link>
              </Pill>
            ) : r.status === "unknown" ? (
              <Pill tone="warning">
                <AlertCircle className="size-3" /> Not in barcode databases
              </Pill>
            ) : r.status === "error" ? (
              <Pill tone="danger">Lookup failed</Pill>
            ) : null}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={onRemove} aria-label="Remove">
          <Trash2 />
        </Button>
      </div>
      {r.status === "found" || r.status === "unknown" ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto_minmax(0,1.6fr)]">
          <MoneyInput value={r.price} onChange={(price) => onChange({ price })} placeholder="Price" aria-label="Selling price" />
          <MoneyInput value={r.mrp} onChange={(mrp) => onChange({ mrp })} placeholder="MRP" aria-label="MRP" />
          <div className="flex h-9 items-center rounded-md border">
            <button type="button" className="grid h-full w-8 place-items-center text-muted-foreground hover:text-foreground" onClick={() => onChange({ count: Math.max(0, r.count - 1) })} aria-label="Decrease stock">
              <Minus className="size-3.5" />
            </button>
            <span className="min-w-8 text-center text-sm tabular" aria-label="Stock">
              {r.count}
            </span>
            <button type="button" className="grid h-full w-8 place-items-center text-muted-foreground hover:text-foreground" onClick={() => onChange({ count: r.count + 1 })} aria-label="Increase stock">
              <Plus className="size-3.5" />
            </button>
          </div>
          <OndcCategorySelect value={r.ondcCategory} onChange={(ondcCategory) => onChange({ ondcCategory })} placeholder="Category" />
        </div>
      ) : null}
    </li>
  );
}
