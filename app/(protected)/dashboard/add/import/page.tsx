"use client";

import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api, toastError } from "@/components/app/api";
import { NativeSelect } from "@/components/app/fields";
import { PageHeader, Section } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { guessOndcCategory } from "@/lib/ondc/taxonomy";
import { guessColumn, parseCsv, toCsv } from "@/lib/products/csv";
import { parseQuantity } from "@/lib/products/units";

const FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "name", label: "Product name", required: true },
  { key: "price", label: "Selling price" },
  { key: "mrp", label: "MRP" },
  { key: "stock", label: "Stock" },
  { key: "barcode", label: "Barcode / EAN" },
  { key: "sku", label: "SKU / item code" },
  { key: "brand", label: "Brand" },
  { key: "category", label: "Category / group" },
  { key: "unit", label: "Pack size (e.g. 500 g)" },
  { key: "description", label: "Description" },
  { key: "hsnCode", label: "HSN code" },
  { key: "gstRate", label: "GST %" },
  { key: "imageUrl", label: "Image URL" },
];

const BATCH = 400;
const money = (v: string | undefined) => {
  const n = Number((v ?? "").replace(/[₹,\s]|rs\.?/gi, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export default function ImportPage() {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [progress, setProgress] = useState<null | { done: number; total: number }>(null);

  const header = rows[0] ?? [];
  const body = rows.slice(1);

  const onFile = async (file: File) => {
    if (/\.xlsx?$/i.test(file.name)) {
      toast.error("Excel files need to be saved as CSV first: File → Save As → CSV.");
      return;
    }
    const parsed = parseCsv(await file.text());
    if (parsed.length < 2) {
      toast.error("That file has no product rows.");
      return;
    }
    setFileName(file.name);
    setRows(parsed);
    const auto: Record<string, number | null> = {};
    parsed[0].forEach((h, i) => {
      const f = guessColumn(h);
      if (f && auto[f] === undefined) auto[f] = i;
    });
    setMapping(auto);
  };

  const products = useMemo(() => {
    const col = (r: string[], k: string) => (mapping[k] !== undefined && mapping[k] !== null ? r[mapping[k] as number]?.trim() : undefined);
    return body
      .map((r) => {
        const name = col(r, "name");
        if (!name) return null;
        const qty = parseQuantity(col(r, "unit")) ?? parseQuantity(name);
        const barcode = col(r, "barcode")?.replace(/\D/g, "") || null;
        const price = money(col(r, "price"));
        const stockRaw = col(r, "stock");
        const stock = stockRaw ? Math.max(0, Math.trunc(Number(stockRaw.replace(/[^\d.-]/g, "")) || 0)) : null;
        const category = col(r, "category") || "General";
        const image = col(r, "imageUrl");
        return {
          name: name.slice(0, 200),
          price,
          mrp: money(col(r, "mrp")) ?? price,
          stock,
          barcode: barcode && barcode.length >= 8 ? barcode : null,
          sku: col(r, "sku")?.slice(0, 64) || null,
          brand: col(r, "brand") || null,
          category: category.slice(0, 100),
          ondcCategory: guessOndcCategory(category, name),
          description: col(r, "description") ?? "",
          hsnCode: col(r, "hsnCode")?.slice(0, 12) || null,
          gstRate: money(col(r, "gstRate")),
          imageUrl: image && /^https:\/\//.test(image) ? image : "",
          unit: qty?.unit ?? null,
          unitValue: qty?.value ?? null,
          type: "PACKAGED",
          status: price ? "ACTIVE" : "DRAFT",
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [body, mapping]);

  const run = async () => {
    setProgress({ done: 0, total: products.length });
    let created = 0;
    try {
      for (let i = 0; i < products.length; i += BATCH) {
        const r = await api<{ created: number }>("/api/products/bulk", { method: "POST", json: { products: products.slice(i, i + BATCH) } });
        created += r.created;
        setProgress({ done: created, total: products.length });
      }
      toast.success(`Imported ${created} products`);
      router.push("/dashboard/catalog");
    } catch (e) {
      toastError(e);
      if (created) toast.message(`${created} products were imported before the error.`);
      setProgress(null);
    }
  };

  const template = () => {
    const csv = toCsv([
      ["Item Name", "Barcode", "MRP", "Selling Price", "Stock", "Pack Size", "Brand", "Category"],
      ["Aashirvaad Whole Wheat Atta", "8901725121203", "310", "289", "12", "5 kg", "Aashirvaad", "Atta"],
      ["Tata Salt", "8904043901015", "28", "28", "40", "1 kg", "Tata", "Salt"],
    ]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "onboarder-import-template.csv";
    a.click();
  };

  return (
    <>
      <PageHeader
        back={{ href: "/dashboard/add", label: "Add products" }}
        title="Import from a spreadsheet"
        description="Bring your whole stock list across in one go: exports from Tally, Vyapar, Marg, Busy, or any Excel sheet saved as CSV."
        actions={
          <Button variant="outline" onClick={template}>
            <FileSpreadsheet /> Download template
          </Button>
        }
      />

      {!rows.length ? (
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-card px-6 py-16 text-center hover:border-primary/50">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Upload className="size-6" />
          </span>
          <span className="font-medium">Choose a CSV file</span>
          <span className="max-w-sm text-sm text-muted-foreground">
            The first row should be column names. We'll match them to product fields automatically.
          </span>
          <input type="file" accept=".csv,text/csv,.txt,.xls,.xlsx" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      ) : (
        <div className="space-y-6">
          <Section
            title="Match your columns"
            description={`${fileName} · ${body.length} rows`}
            actions={
              <Button variant="ghost" size="sm" onClick={() => setRows([])}>
                Choose another file
              </Button>
            }
          >
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <div className="text-sm font-medium">
                    {f.label}
                    {f.required ? <span className="text-primary"> *</span> : null}
                  </div>
                  <NativeSelect
                    value={mapping[f.key] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value === "" ? null : Number(e.target.value) }))}
                  >
                    <option value="">Don't import</option>
                    {header.map((h, i) => (
                      <option key={`${h}-${i}`} value={i}>
                        {h || `Column ${i + 1}`}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Preview" description={`${products.length} products will be imported${products.some((p) => !p.price) ? "; rows without a price are saved as drafts" : ""}.`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    {["Name", "Price", "MRP", "Stock", "Size", "Barcode", "Category"].map((h) => (
                      <th key={h} className="px-4 py-2 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.slice(0, 8).map((p, i) => (
                    <tr key={`${p.name}-${i}`}>
                      <td className="max-w-64 truncate px-4 py-2">{p.name}</td>
                      <td className="px-4 py-2 tabular">{p.price ?? "—"}</td>
                      <td className="px-4 py-2 tabular">{p.mrp ?? "—"}</td>
                      <td className="px-4 py-2 tabular">{p.stock ?? "—"}</td>
                      <td className="px-4 py-2">{p.unitValue ? `${p.unitValue} ${p.unit}` : "—"}</td>
                      <td className="px-4 py-2 font-mono text-xs">{p.barcode ?? "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{p.ondcCategory ?? p.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="flex justify-end">
            <Button size="lg" disabled={!products.length || mapping.name == null || Boolean(progress)} onClick={run}>
              {progress ? (
                <>
                  <Loader2 className="animate-spin" /> Importing {progress.done}/{progress.total}
                </>
              ) : (
                <>Import {products.length} products</>
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
