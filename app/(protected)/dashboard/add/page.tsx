import {
  ArrowRight,
  Barcode,
  FileSpreadsheet,
  Hand,
  PenLine,
  Shirt,
  Wheat,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "Add products" };

const LANES = [
  {
    href: "/dashboard/add/packaged",
    icon: Barcode,
    kicker: "Organised",
    title: "Packaged goods",
    body: "Biscuits, soap, atta packets: anything with a barcode. Scan shelf after shelf; name, brand, size and photo fill themselves in.",
    examples: "Parle-G · Tata Salt · Surf Excel",
    speed: "~5 seconds per product",
  },
  {
    href: "/dashboard/add/loose",
    icon: Wheat,
    kicker: "Un-organised",
    title: "Loose staples",
    body: "What you weigh out by hand. Pick from 100+ common items, enter your rate per kg, choose pack sizes, and AI makes the photos.",
    examples: "Chakki atta · Toor dal · Onions",
    speed: "40 items in ~10 minutes",
  },
  {
    href: "/dashboard/add/handmade",
    icon: Hand,
    kicker: "Custom",
    title: "Handmade & unique",
    body: "Art, crafts, clothes, home décor. Take a photo; AI identifies it, writes the listing and creates a studio-quality image.",
    examples: "Madhubani painting · Block-print kurta",
    speed: "About a minute each",
  },
];

export default function AddHub() {
  return (
    <>
      <PageHeader
        title="Add products"
        description="Pick the way that matches what you sell. Most shops use more than one: scan the packaged shelves, then add loose staples."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {LANES.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group flex flex-col rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <l.icon className="size-5" />
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {l.kicker}
              </span>
            </div>
            <h2 className="mt-5 text-lg font-semibold">{l.title}</h2>
            <p className="mt-1.5 flex-1 text-sm text-muted-foreground text-pretty">
              {l.body}
            </p>
            <div className="mt-5 border-t pt-3 text-xs text-muted-foreground">
              {l.examples}
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-medium text-primary">{l.speed}</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          {
            href: "/dashboard/add/import",
            icon: FileSpreadsheet,
            title: "Import a spreadsheet",
            body: "CSV from Excel, Tally, Vyapar or Marg",
          },
          {
            href: "/dashboard/studio?tab=tryon",
            icon: Shirt,
            title: "Clothing on a model",
            body: "Virtual try-on with your own models",
          },
          {
            href: "/dashboard/catalog/new",
            icon: PenLine,
            title: "Type it in",
            body: "Add a single product by hand",
          },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:bg-accent/30"
          >
            <l.icon className="size-5 shrink-0 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{l.title}</div>
              <div className="text-xs text-muted-foreground">{l.body}</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
