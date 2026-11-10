import { Barcode, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const BARCODE_BARS = Array.from({ length: 28 }, (_, n) => ({
  id: `bar-${n}`,
  width: [1, 2, 1, 3][n % 4],
}));

/** Hero visual: a scan queue filling up, with channels lighting up beneath. */
export function ScanQueueVisual() {
  const rows = [
    {
      name: "Tata Salt Iodised",
      size: "1 kg",
      price: "₹28",
      stock: 40,
      tone: "bg-[#E6EEF5] text-[#1E3A5F]",
      code: "8904043901015",
    },
    {
      name: "Parle-G Gold Biscuits",
      size: "1 kg",
      price: "₹140",
      stock: 12,
      tone: "bg-[#FFF4CC] text-[#7A5A00]",
      code: "8901719104046",
    },
    {
      name: "Aashirvaad Atta",
      size: "5 kg",
      price: "₹289",
      stock: 8,
      tone: "bg-[#F4EBDD] text-[#7A3E12]",
      code: "8901725121203",
    },
    {
      name: "Toor Dal",
      size: "500 g · 1 kg · 5 kg",
      price: "₹80+",
      stock: null,
      tone: "bg-[#E8F0E3] text-[#2F5D2B]",
      code: "loose",
    },
  ];
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/15 via-transparent to-success/10 blur-2xl"
      />
      <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-stone-900/10">
        <div className="relative h-36 overflow-hidden bg-stone-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,#44403c_0,#0c0a09_70%)]" />
          <div className="absolute top-1/2 left-1/2 flex h-20 w-56 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border-2 border-white/70">
            <div className="flex gap-[3px]">
              {BARCODE_BARS.map((bar) => (
                <span
                  key={bar.id}
                  className="h-10 bg-white/85"
                  style={{ width: bar.width }}
                />
              ))}
            </div>
            <span className="absolute inset-x-2 top-1 h-0.5 animate-scan bg-primary shadow-[0_0_14px_3px] shadow-primary/70 [--scan-distance:72px]" />
          </div>
          <span className="absolute bottom-2 left-3 rounded bg-black/50 px-2 py-0.5 font-mono text-[10px] text-stone-300">
            scanning shelf 3 · Biscuits
          </span>
        </div>
        <ul className="divide-y">
          {rows.map((r, i) => (
            <li
              key={r.name}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{ animation: `fade-in 0.5s ${0.3 + i * 0.35}s both` }}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-md text-xs font-semibold",
                  r.tone,
                )}
              >
                {r.name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{r.name}</div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">
                  {r.code === "loose" ? "loose · 3 pack sizes" : r.code} ·{" "}
                  {r.size}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold tabular">{r.price}</div>
                <div className="text-[11px] text-muted-foreground">
                  {r.stock === null ? "by weight" : `${r.stock} in stock`}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-1.5 border-t bg-muted/40 px-4 py-3 text-[11px]">
          <span className="mr-1 text-muted-foreground">Live on</span>
          {["ONDC", "Storefront", "Shopify", "Amazon.in"].map((c, i) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 font-medium text-success"
              style={{ animation: `fade-in 0.4s ${1.8 + i * 0.2}s both` }}
            >
              <Check className="size-3" /> {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LanePackaged() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-16 shrink-0 place-items-center rounded-xl border bg-background">
        <Barcode className="size-8 text-foreground/70" />
      </div>
      <Arrow />
      <div className="min-w-0 flex-1 rounded-xl border bg-background p-3 text-xs">
        <div className="font-medium">Surf Excel Easy Wash 1 kg</div>
        <div className="mt-1 flex justify-between text-muted-foreground">
          <span>Brand · size · photo</span>
          <span className="font-medium text-foreground">₹140</span>
        </div>
      </div>
    </div>
  );
}

export function LaneLoose() {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 rounded-xl border bg-background px-3 py-2 text-xs">
        <div className="font-medium">
          Toor Dal{" "}
          <span lang="hi" className="text-muted-foreground">
            तूर दाल
          </span>
        </div>
        <div className="mt-0.5 text-muted-foreground">₹160 / kg</div>
      </div>
      <Arrow />
      <div className="flex flex-1 flex-wrap gap-1.5">
        {[
          ["500 g", "₹80"],
          ["1 kg", "₹160"],
          ["5 kg", "₹800"],
        ].map(([s, p]) => (
          <span
            key={s}
            className="rounded-md border border-primary/40 bg-primary/8 px-2 py-1 text-xs"
          >
            <span className="font-medium">{s}</span>{" "}
            <span className="tabular text-muted-foreground">{p}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function LaneHandmade() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border bg-[repeating-linear-gradient(45deg,#d6c7b0_0,#d6c7b0_6px,#c9b79c_6px,#c9b79c_12px)]">
        <span className="absolute inset-x-3 inset-y-2 rounded-sm bg-[#8b3a2b]" />
      </div>
      <Arrow />
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border bg-gradient-to-b from-[#f7f3ec] to-[#ece4d6]">
        <span className="absolute inset-x-4 top-2 bottom-3 rounded-sm bg-[#8b3a2b] shadow-[0_6px_10px_-4px_rgba(0,0,0,0.4)]" />
        <Sparkles className="absolute top-1 right-1 size-3.5 text-primary" />
      </div>
      <div className="min-w-0 flex-1 text-xs text-muted-foreground">
        <div className="font-medium text-foreground">
          Block-print Cotton Kurta
        </div>
        Title, description and studio photo, written for you.
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <svg
      viewBox="0 0 24 12"
      className="w-6 shrink-0 text-muted-foreground"
      aria-hidden="true"
    >
      <path
        d="M0 6h20m-5-5 5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function OndcChecklistVisual() {
  const items = [
    ["Shop address & map pin", true],
    ["GSTIN", true],
    ["FSSAI licence", true],
    ["Customer care contact", true],
    ["212 products categorised", true],
  ] as const;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-stone-100">Ready for ONDC</div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-300" /> Live in
          Bengaluru
        </span>
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map(([label]) => (
          <li
            key={label}
            className="flex items-center gap-2.5 text-sm text-stone-300"
          >
            <span className="grid size-5 place-items-center rounded-full bg-emerald-400/90 text-stone-950">
              <Check className="size-3" />
            </span>
            {label}
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-xl bg-stone-950/60 p-3 font-mono text-[11px] leading-relaxed text-stone-400">
        <div>
          <span className="text-amber-300">on_search</span> → paytm.com · 212
          items
        </div>
        <div>
          <span className="text-amber-300">on_confirm</span> → order OB-7K3QX9 ·
          ₹396
        </div>
        <div>
          <span className="text-amber-300">on_status</span> → Out for delivery
        </div>
      </div>
    </div>
  );
}
