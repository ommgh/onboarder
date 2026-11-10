"use client";

import { Check, Loader2, Plus, Search, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, toastError } from "@/components/app/api";
import {
  MoneyInput,
  NativeSelect,
  OndcCategorySelect,
} from "@/components/app/fields";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { inr } from "@/lib/format";
import {
  LOOSE_GROUPS,
  LOOSE_ITEMS,
  type LooseItem,
  looseVegType,
  type Pack,
} from "@/lib/products/kirana-catalog";
import { formatQuantity } from "@/lib/products/units";
import { cn } from "@/lib/utils";

interface Pick {
  rate: string;
  packs: number[];
}

const RATE_LABEL: Record<LooseItem["rateUnit"], string> = {
  kg: "per kg",
  l: "per litre",
  piece: "per piece",
  dozen: "per dozen",
};

function priceFor(
  rate: number,
  rateUnit: LooseItem["rateUnit"],
  pack: Pack,
): number {
  let factor = pack.value;
  if (pack.unit === "g" || pack.unit === "ml") factor = pack.value / 1000;
  if (rateUnit === "dozen" && pack.unit === "piece") factor = pack.value / 12;
  return Math.round(rate * factor * 100) / 100;
}

export default function LoosePage() {
  const router = useRouter();
  const [group, setGroup] = useState<string>("All");
  const [q, setQ] = useState("");
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [custom, setCustom] = useState<LooseItem[]>([]);
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [makePhotos, setMakePhotos] = useState(true);
  const [busy, setBusy] = useState<null | {
    label: string;
    done: number;
    total: number;
  }>(null);

  useEffect(() => {
    api<{ products: { variantGroup: string | null }[] }>(
      "/api/products?type=LOOSE&limit=200",
    )
      .then(({ products }) =>
        setExisting(
          new Set(
            products.map((p) => p.variantGroup).filter(Boolean) as string[],
          ),
        ),
      )
      .catch(() => undefined);
  }, []);

  const all = useMemo(() => [...custom, ...LOOSE_ITEMS], [custom]);
  const visible = all.filter(
    (i) =>
      (group === "All" || i.group === group) &&
      (!q || `${i.name} ${i.hindi}`.toLowerCase().includes(q.toLowerCase())),
  );
  const chosen = all.filter((i) => picks[i.key]);
  const skuCount = chosen.reduce((s, i) => s + picks[i.key].packs.length, 0);
  const unpriced = chosen.filter((i) => !Number(picks[i.key].rate)).length;

  const toggle = (item: LooseItem) =>
    setPicks((p) => {
      const next = { ...p };
      if (next[item.key]) delete next[item.key];
      else next[item.key] = { rate: "", packs: item.defaultPacks };
      return next;
    });

  const save = async () => {
    const products = chosen.flatMap((item) => {
      const pick = picks[item.key];
      const rate = Number(pick.rate) || 0;
      return pick.packs.map((idx) => {
        const pack = item.packs[idx];
        const size = formatQuantity(pack.value, pack.unit);
        return {
          name: `${item.name} - ${size}`,
          description: `${item.name} (${item.hindi}), weighed and packed fresh at our store. Pack size: ${size}.`,
          type: "LOOSE",
          status: rate ? "ACTIVE" : "DRAFT",
          category: item.group,
          ondcCategory: item.ondcCategory,
          vegType: looseVegType(item),
          unit: pack.unit,
          unitValue: pack.value,
          price: rate ? priceFor(rate, item.rateUnit, pack) : null,
          mrp: rate ? priceFor(rate, item.rateUnit, pack) : null,
          stock: null,
          variantGroup: item.key,
          variantLabel: size,
        };
      });
    });
    if (!products.length) return;
    setBusy({ label: "Saving", done: 0, total: products.length });
    try {
      const { ids } = await api<{ ids: string[] }>("/api/products/bulk", {
        method: "POST",
        json: { products },
      });
      toast.success(`${ids.length} products added from ${chosen.length} items`);
      if (makePhotos) {
        // One photo per item, applied to all its pack sizes.
        const leadIds: string[] = [];
        let offset = 0;
        for (const item of chosen) {
          leadIds.push(ids[offset]);
          offset += picks[item.key].packs.length;
        }
        let failed = 0;
        for (let i = 0; i < leadIds.length; i++) {
          setBusy({ label: "Creating photos", done: i, total: leadIds.length });
          try {
            await api("/api/ai/photo", {
              method: "POST",
              json: { productId: leadIds[i] },
            });
          } catch (e) {
            failed++;
            if ((e as { status?: number }).status === 402) {
              toastError(e);
              break;
            }
          }
        }
        if (failed)
          toast.message(
            `${failed} photo${failed > 1 ? "s" : ""} couldn't be created. You can retry from the catalog.`,
          );
      }
      router.push("/dashboard/catalog?type=LOOSE");
    } catch (e) {
      toastError(e);
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        back={{ href: "/dashboard/add", label: "Add products" }}
        title="Add loose staples"
        description="Tick what you weigh out by hand, enter your rate, and pick the pack sizes you sell. Each pack becomes its own product, grouped together on every channel."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search: atta, दाल, onion…"
            className="pl-9"
          />
        </div>
        <CustomItemDialog
          onAdd={(item) => {
            setCustom((c) => [item, ...c]);
            setPicks((p) => ({
              ...p,
              [item.key]: { rate: "", packs: item.defaultPacks },
            }));
          }}
        />
      </div>
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {["All", ...LOOSE_GROUPS].map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroup(g)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
              group === g
                ? "border-foreground bg-foreground text-background"
                : "bg-card hover:bg-muted",
            )}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => {
          const pick = picks[item.key];
          const added = existing.has(item.key);
          return (
            <div
              key={item.key}
              className={cn(
                "rounded-xl border bg-card transition-colors",
                pick && "border-primary ring-1 ring-primary/30",
              )}
            >
              <button
                type="button"
                disabled={added}
                onClick={() => toggle(item)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-60"
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded border",
                    pick
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background",
                  )}
                >
                  {pick || added ? <Check className="size-3.5" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.hindi} ·{" "}
                    {added ? "already in your catalog" : item.group}
                  </span>
                </span>
              </button>
              {pick ? (
                <div className="space-y-3 border-t px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MoneyInput
                      value={pick.rate}
                      onChange={(rate) =>
                        setPicks((p) => ({
                          ...p,
                          [item.key]: { ...pick, rate },
                        }))
                      }
                      placeholder="Your rate"
                      className="w-32"
                      aria-label={`Rate ${RATE_LABEL[item.rateUnit]}`}
                      autoFocus
                    />
                    <span className="text-sm text-muted-foreground">
                      {RATE_LABEL[item.rateUnit]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.packs.map((pack, idx) => {
                      const on = pick.packs.includes(idx);
                      const price = Number(pick.rate)
                        ? priceFor(Number(pick.rate), item.rateUnit, pack)
                        : null;
                      return (
                        <button
                          key={`${pack.value}${pack.unit}`}
                          type="button"
                          onClick={() =>
                            setPicks((p) => ({
                              ...p,
                              [item.key]: {
                                ...pick,
                                packs: on
                                  ? pick.packs.filter((x) => x !== idx)
                                  : [...pick.packs, idx].sort(),
                              },
                            }))
                          }
                          className={cn(
                            "rounded-md border px-2 py-1 text-xs transition-colors",
                            on
                              ? "border-primary bg-primary/10 text-foreground"
                              : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          <span className="font-medium">
                            {formatQuantity(pack.value, pack.unit)}
                          </span>
                          {price !== null && on ? (
                            <span className="ml-1 tabular">{inr(price)}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {chosen.length ? (
        <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 mt-6 rounded-xl border bg-card/95 shadow-lg backdrop-blur md:bottom-4">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
            <div className="flex-1 text-sm">
              <span className="font-medium">
                {chosen.length} items → {skuCount} products
              </span>
              {unpriced ? (
                <span className="text-muted-foreground">
                  {" "}
                  · {unpriced} without a rate save as drafts
                </span>
              ) : null}
              <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={makePhotos}
                  onCheckedChange={(v) => setMakePhotos(Boolean(v))}
                />
                <Sparkles className="size-3.5 text-primary" /> Create a photo
                for each item with AI ({chosen.length * 2} credits)
              </label>
            </div>
            <Button
              size="lg"
              onClick={save}
              disabled={Boolean(busy) || skuCount === 0}
            >
              {busy ? (
                <>
                  <Loader2 className="animate-spin" /> {busy.label}{" "}
                  {busy.total > 1 ? `${busy.done}/${busy.total}` : ""}
                </>
              ) : (
                <>Add {skuCount} products</>
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CustomItemDialog({ onAdd }: { onAdd: (item: LooseItem) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string | null>("Masala & Seasoning");
  const [rateUnit, setRateUnit] = useState<LooseItem["rateUnit"]>("kg");
  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus /> Item not listed?
      </Button>
    );
  }
  const packs: Pack[] =
    rateUnit === "kg"
      ? [
          { value: 250, unit: "g" },
          { value: 500, unit: "g" },
          { value: 1, unit: "kg" },
          { value: 5, unit: "kg" },
        ]
      : rateUnit === "l"
        ? [
            { value: 500, unit: "ml" },
            { value: 1, unit: "l" },
            { value: 5, unit: "l" },
          ]
        : [
            { value: 1, unit: "piece" },
            { value: 6, unit: "piece" },
            { value: 12, unit: "piece" },
          ];
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Kasuri Methi"
        className="sm:w-44"
        autoFocus
      />
      <OndcCategorySelect
        value={category}
        onChange={setCategory}
        className="sm:w-48"
      />
      <NativeSelect
        value={rateUnit}
        onChange={(e) => setRateUnit(e.target.value as LooseItem["rateUnit"])}
        className="sm:w-32"
      >
        <option value="kg">by kg</option>
        <option value="l">by litre</option>
        <option value="piece">by piece</option>
      </NativeSelect>
      <div className="flex gap-2">
        <Button
          disabled={name.trim().length < 2 || !category}
          onClick={() => {
            const key = `custom-${name
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}`;
            onAdd({
              key,
              name: name.trim(),
              hindi: "",
              group: "Your items",
              ondcCategory: category ?? "Foodgrains",
              rateUnit,
              packs,
              defaultPacks: [1, 2],
            });
            setName("");
            setOpen(false);
          }}
        >
          Add
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(false)}
          aria-label="Cancel"
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
