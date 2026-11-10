"use client";

import { Barcode, Check, Leaf, Sparkles } from "lucide-react";
import { useState } from "react";
import { ScanQueueVisual } from "@/components/marketing/visuals";
import { cn } from "@/lib/utils";

const TABS = [
  {
    id: "packaged",
    icon: Barcode,
    label: "Packaged",
    short: "Packaged",
    title: "Scan the shelf",
    steps: [
      "Point your phone or barcode gun at a packet",
      "Name, brand, size and photo fill themselves in",
      "Scan it again to count stock",
    ],
    stat: ["~5 sec", "per item"],
  },
  {
    id: "loose",
    icon: Leaf,
    label: "Loose staples",
    short: "Loose",
    title: "Tick and price",
    steps: [
      "100+ staples listed in English and Hindi",
      "Enter your rate per kg once",
      "Pick pack sizes; AI makes the photos",
    ],
    stat: ["40 items", "in 10 minutes"],
  },
  {
    id: "handmade",
    icon: Sparkles,
    label: "Handmade",
    short: "Handmade",
    title: "Take a photo",
    steps: [
      "Snap the piece on your counter",
      "AI writes a title and a listing that sells",
      "Your photo becomes a studio shot",
    ],
    stat: ["~1 min", "per piece"],
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ProductTour() {
  const [tab, setTab] = useState<TabId>("packaged");
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  return (
    <div className="rounded-3xl border bg-band p-2 sm:p-3">
      <div
        role="tablist"
        aria-label="Ways to add products"
        className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs font-medium text-muted-foreground transition-all sm:text-sm",
              tab === t.id
                ? "bg-card text-foreground shadow-soft"
                : "hover:text-foreground",
            )}
          >
            <t.icon className="hidden size-4 sm:block" />
            <span className="sm:hidden">{t.short}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div
        key={tab}
        className="mt-2 grid gap-2 rounded-2xl border bg-card/60 p-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-500 sm:mt-3 sm:p-4 lg:grid-cols-[1.25fr_1fr]"
      >
        <div className="min-w-0">
          {tab === "packaged" ? <ScanQueueVisual /> : null}
          {tab === "loose" ? <LooseVisual /> : null}
          {tab === "handmade" ? <HandmadeVisual /> : null}
        </div>
        <div className="flex flex-col gap-2">
          <div className="rounded-2xl border bg-card p-5">
            <div className="text-lg font-semibold">{active.title}</div>
            <ol className="mt-4 space-y-3">
              {active.steps.map((s, i) => (
                <li key={s} className="flex gap-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-muted-foreground">{s}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex items-end justify-between rounded-2xl border bg-card p-5">
            <div>
              <div className="text-xs text-muted-foreground">Time to list</div>
              <div className="mt-1 text-2xl font-semibold tabular">
                {active.stat[0]}
              </div>
            </div>
            <span className="rounded-full border border-sage/60 bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {active.stat[1]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const STAPLES = [
  ["Toor Dal", "तूर दाल", "₹160", true],
  ["Basmati Rice", "बासमती चावल", "₹120", true],
  ["Chana Dal", "चना दाल", "₹110", true],
  ["Sugar", "चीनी", "₹46", true],
  ["Jeera", "जीरा", "₹640", false],
  ["Haldi Powder", "हल्दी", "₹280", false],
] as const;

function LooseVisual() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="text-sm font-semibold">Loose staples</div>
        <span className="text-xs text-muted-foreground">4 of 112 selected</span>
      </div>
      <ul className="divide-y">
        {STAPLES.map(([en, hi, rate, on], i) => (
          <li
            key={en}
            className="flex items-center gap-3 px-4 py-2.5"
            style={{ animation: `fade-in 0.4s ${0.1 + i * 0.08}s both` }}
          >
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-md border",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card",
              )}
            >
              {on ? <Check className="size-3" strokeWidth={3} /> : null}
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <span className="font-medium">{en}</span>{" "}
              <span lang="hi" className="text-muted-foreground">
                {hi}
              </span>
            </div>
            <span
              className={cn(
                "rounded-md border px-2 py-0.5 text-xs tabular",
                on ? "bg-card" : "border-dashed text-muted-foreground",
              )}
            >
              {rate} / kg
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-1.5 border-t bg-muted/60 px-4 py-3 text-xs">
        <span className="mr-1 text-muted-foreground">Pack sizes</span>
        {["250 g", "500 g", "1 kg", "5 kg"].map((s) => (
          <span
            key={s}
            className="rounded-full border border-sage/60 bg-secondary px-2 py-0.5 font-medium text-secondary-foreground"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function HandmadeVisual() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card p-4 shadow-soft">
      <div className="grid grid-cols-2 gap-3">
        <figure>
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl border bg-[repeating-linear-gradient(45deg,#d6c7b0_0,#d6c7b0_8px,#c9b79c_8px,#c9b79c_16px)]">
            <span className="absolute inset-x-[22%] inset-y-[14%] -rotate-3 rounded-md bg-[#8b3a2b]" />
          </div>
          <figcaption className="mt-2 text-xs text-muted-foreground">
            Your phone photo
          </figcaption>
        </figure>
        <figure>
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl border bg-gradient-to-b from-[#f7f3ec] to-[#e6dccb]">
            <span className="absolute inset-x-[24%] top-[12%] bottom-[18%] rounded-md bg-[#8b3a2b] shadow-[0_14px_22px_-10px_rgba(0,0,0,0.45)]" />
            <span className="absolute inset-x-[18%] bottom-[12%] h-2 rounded-full bg-black/10 blur-sm" />
            <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-medium text-primary">
              <Sparkles className="size-3" /> AI
            </span>
          </div>
          <figcaption className="mt-2 text-xs text-muted-foreground">
            Studio shot
          </figcaption>
        </figure>
      </div>
      <div className="mt-4 rounded-xl border bg-muted/50 p-3 text-sm">
        <div className="font-semibold">Hand Block-Printed Cotton Kurta</div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Breathable cotton, printed by hand in Sanganer with natural dyes.
          Relaxed fit, three-quarter sleeves.
        </p>
        <div className="mt-2 flex gap-1.5 text-[11px]">
          {["Women · Kurtas", "Cotton", "₹1,450"].map((t) => (
            <span key={t} className="rounded-md border bg-card px-1.5 py-0.5">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
