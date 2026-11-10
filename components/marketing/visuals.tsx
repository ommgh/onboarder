import {
  Barcode,
  Check,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const BARCODE_BARS = Array.from({ length: 28 }, (_, n) => ({
  id: `bar-${n}`,
  width: [1, 2, 1, 3][n % 4],
}));

/** Scan queue filling up, with channels lighting up beneath. */
export function ScanQueueVisual({ className }: { className?: string }) {
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
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-soft",
        className,
      )}
    >
      <div className="relative h-36 overflow-hidden bg-forest">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,oklch(0.36_0.05_148)_0,transparent_70%)]" />
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
          <span className="absolute inset-x-2 top-1 h-0.5 animate-scan bg-[oklch(0.82_0.17_140)] shadow-[0_0_14px_3px] shadow-[oklch(0.82_0.17_140)]/70 [--scan-distance:72px]" />
        </div>
        <span className="absolute bottom-2 left-3 rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-white/75">
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
      <div className="flex flex-wrap items-center gap-1.5 border-t bg-muted/60 px-4 py-3 text-[11px]">
        <span className="mr-1 text-muted-foreground">Live on</span>
        {["ONDC", "Storefront", "Shopify", "Amazon.in"].map((c, i) => (
          <span
            key={c}
            className="inline-flex items-center gap-1 rounded-full border border-sage/60 bg-secondary px-2 py-0.5 font-medium text-secondary-foreground"
            style={{ animation: `fade-in 0.4s ${1.8 + i * 0.2}s both` }}
          >
            <Check className="size-3" /> {c}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Hero float cards ---------- */

function FloatCard({
  className,
  tilt,
  children,
}: {
  className?: string;
  tilt: number;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn("absolute hidden animate-float xl:block", className)}
      style={{ "--tilt": `${tilt}deg` } as React.CSSProperties}
    >
      {/* the stacked "sheet" behind, like a pad of slips */}
      <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-2xl border bg-card/60" />
      <div className="relative w-52 rounded-2xl border bg-card p-4 shadow-soft">
        {children}
      </div>
    </div>
  );
}

const BARS = [38, 62, 30, 74, 52, 88, 66, 94];

export function HeroScannedCard({ className }: { className?: string }) {
  return (
    <FloatCard tilt={-8} className={className}>
      <div className="text-sm font-semibold">Scanned</div>
      <div className="text-xs text-muted-foreground">This morning</div>
      <div className="mt-3 flex h-16 items-end gap-1.5">
        {BARS.map((h, i) => (
          <span
            key={h}
            className={cn(
              "w-full rounded-full",
              i % 2 ? "bg-primary" : "bg-sage/70",
            )}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-xl font-semibold tabular">212</span>
        <span className="text-xs font-medium text-primary">items · 41 min</span>
      </div>
    </FloatCard>
  );
}

export function HeroOrdersCard({ className }: { className?: string }) {
  return (
    <FloatCard tilt={7} className={className}>
      <div className="text-sm font-semibold">ONDC orders</div>
      <div className="text-xs text-muted-foreground">First week</div>
      <svg viewBox="0 0 160 56" className="mt-3 h-14 w-full" aria-hidden="true">
        <path
          d="M0 44 L18 38 L34 42 L52 28 L70 34 L88 20 L106 26 L124 12 L142 18 L160 6"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M0 44 L18 38 L34 42 L52 28 L70 34 L88 20 L106 26 L124 12 L142 18 L160 6 V56 H0 Z"
          fill="var(--primary)"
          opacity="0.08"
        />
      </svg>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-xl font-semibold tabular">₹14,820</span>
        <span className="text-xs font-medium text-primary">+38 orders</span>
      </div>
    </FloatCard>
  );
}

/* ---------- Lane visuals ---------- */

export function LanePackaged() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-16 shrink-0 place-items-center rounded-xl border bg-card">
        <Barcode className="size-8 text-foreground/70" />
      </div>
      <Arrow />
      <div className="min-w-0 flex-1 rounded-xl border bg-card p-3 text-xs">
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
      <div className="shrink-0 rounded-xl border bg-card px-3 py-2 text-xs">
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
            className="rounded-md border border-sage bg-secondary px-2 py-1 text-xs"
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

/* ---------- Channel hub ---------- */

const HUB = [
  { icon: Store, label: "ONDC", angle: -90 },
  { icon: MessageCircle, label: "WhatsApp store", angle: -18 },
  { icon: ShoppingBag, label: "Shopify", angle: 54 },
  { icon: Truck, label: "Amazon.in", angle: 126 },
  { icon: Truck, label: "Flipkart", angle: 198 },
];

/** One catalog in the middle, channels around it, data flowing out along dashed spokes. */
export function ChannelHub({ className }: { className?: string }) {
  const R = 42; // percent of half-size
  return (
    <div
      className={cn(
        "relative mx-auto aspect-square w-full max-w-md",
        className,
      )}
    >
      <div className="absolute inset-[14%] rounded-full border border-dashed border-sage/80" />
      <div className="absolute inset-[30%] rounded-full bg-secondary/60" />
      <svg
        viewBox="-50 -50 100 100"
        className="absolute inset-0 size-full"
        aria-hidden="true"
      >
        {HUB.map((h) => {
          const a = (h.angle * Math.PI) / 180;
          return (
            <line
              key={h.label}
              x1={Math.cos(a) * 9}
              y1={Math.sin(a) * 9}
              x2={Math.cos(a) * (R - 5)}
              y2={Math.sin(a) * (R - 5)}
              stroke="var(--primary)"
              strokeOpacity="0.55"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              className="animate-dash"
            />
          );
        })}
      </svg>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute inset-0 animate-pulse-ring rounded-2xl bg-primary/25" />
        <div className="relative grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
          <LogoMark className="size-8 text-primary-foreground [&_.fill-primary]:fill-primary-foreground [&_.stroke-primary]:stroke-primary-foreground" />
        </div>
      </div>
      {HUB.map((h) => {
        const a = (h.angle * Math.PI) / 180;
        return (
          <div
            key={h.label}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
            style={{
              left: `${50 + Math.cos(a) * R}%`,
              top: `${50 + Math.sin(a) * R}%`,
            }}
          >
            <span className="grid size-11 place-items-center rounded-full border bg-card shadow-soft">
              <h.icon className="size-5 text-primary" />
            </span>
            <span className="whitespace-nowrap rounded-full bg-card/90 px-2 text-[11px] font-medium text-muted-foreground">
              {h.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- ONDC checklist (sits on the forest band) ---------- */

export function OndcChecklistVisual() {
  const items = [
    "Shop address & map pin",
    "GSTIN",
    "FSSAI licence",
    "Customer care contact",
    "212 products categorised",
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Ready for ONDC</div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.82_0.15_140)]/15 px-2.5 py-1 text-xs font-medium text-[oklch(0.86_0.13_140)]">
          <span className="size-1.5 rounded-full bg-[oklch(0.86_0.13_140)]" />{" "}
          Live in Bengaluru
        </span>
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((label) => (
          <li
            key={label}
            className="flex items-center gap-2.5 text-sm text-forest-foreground/80"
          >
            <span className="grid size-5 place-items-center rounded-full bg-[oklch(0.82_0.15_140)] text-forest">
              <Check className="size-3" strokeWidth={3} />
            </span>
            {label}
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-xl bg-black/25 p-3 font-mono text-[11px] leading-relaxed text-forest-foreground/60">
        <div>
          <span className="text-[oklch(0.86_0.13_140)]">on_search</span> →
          paytm.com · 212 items
        </div>
        <div>
          <span className="text-[oklch(0.86_0.13_140)]">on_confirm</span> →
          order OB-7K3QX9 · ₹396
        </div>
        <div>
          <span className="text-[oklch(0.86_0.13_140)]">on_status</span> → Out
          for delivery
        </div>
      </div>
    </div>
  );
}
