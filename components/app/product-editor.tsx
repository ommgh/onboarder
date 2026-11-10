"use client";

import { Check, ExternalLink, ImagePlus, Loader2, Sparkles, Star, Trash2, Wand2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api, shrinkImage, toastError, uploadFile } from "@/components/app/api";
import { Field, MoneyInput, NativeSelect, OndcCategorySelect, UnitSelect } from "@/components/app/fields";
import { PageHeader, Section } from "@/components/app/page-header";
import { LISTING_STATUS, Pill } from "@/components/app/status";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { productIssues } from "@/lib/ondc/readiness";
import { qualityBand, scoreListing } from "@/lib/products/quality";
import type { ProductDTO } from "@/lib/products/serialize";
import { cn } from "@/lib/utils";

type Form = {
  name: string;
  description: string;
  type: ProductDTO["type"];
  status: ProductDTO["status"];
  brand: string;
  sku: string;
  barcode: string;
  price: string;
  mrp: string;
  trackStock: boolean;
  stock: string;
  unit: string | null;
  unitValue: string;
  imageUrl: string;
  images: string[];
  ondcCategory: string | null;
  category: string;
  vegType: string | null;
  manufacturer: string;
  manufacturerAddress: string;
  commonName: string;
  hsnCode: string;
  gstRate: string;
};

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function toForm(p?: ProductDTO): Form {
  return {
    name: p?.name ?? "",
    description: p?.description ?? "",
    type: p?.type ?? "PACKAGED",
    status: p?.status ?? "ACTIVE",
    brand: s(p?.brand),
    sku: s(p?.sku),
    barcode: s(p?.barcode),
    price: s(p?.price),
    mrp: s(p?.mrp),
    trackStock: p ? p.stock !== null : true,
    stock: s(p?.stock ?? (p ? "" : 10)),
    unit: p?.unit ?? null,
    unitValue: s(p?.unitValue),
    imageUrl: p?.imageUrl ?? "",
    images: p?.images ?? [],
    ondcCategory: p?.ondcCategory ?? null,
    category: p?.category ?? "General",
    vegType: p?.vegType ?? null,
    manufacturer: s(p?.manufacturer),
    manufacturerAddress: s(p?.manufacturerAddress),
    commonName: s(p?.commonName),
    hsnCode: s(p?.hsnCode),
    gstRate: s(p?.gstRate),
  };
}

function toPayload(f: Form) {
  return {
    name: f.name,
    description: f.description,
    type: f.type,
    status: f.status,
    brand: f.brand,
    sku: f.sku,
    barcode: f.barcode,
    price: f.price,
    mrp: f.mrp,
    stock: f.trackStock ? f.stock || "0" : null,
    unit: f.unit,
    unitValue: f.unitValue,
    imageUrl: f.imageUrl,
    images: f.images,
    ondcCategory: f.ondcCategory,
    category: f.category || "General",
    vegType: f.vegType,
    manufacturer: f.manufacturer,
    manufacturerAddress: f.manufacturerAddress,
    commonName: f.commonName,
    hsnCode: f.hsnCode,
    gstRate: f.gstRate,
  };
}

interface Props {
  product?: ProductDTO;
  store: { fssaiLicense: string | null; ondcEnabled: boolean };
  connected: { SHOPIFY: boolean; AMAZON: boolean };
}

export function ProductEditor({ product, store, connected }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(() => toForm(product));
  const [saved, setSaved] = useState<Form>(() => toForm(product));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiBusy, setAiBusy] = useState<null | "copy" | "enhance" | "photo">(null);
  const [suggestion, setSuggestion] = useState<{ name: string; description: string } | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [listings, setListings] = useState(product?.listings ?? []);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  const numeric = (v: string) => (v === "" ? null : Number(v));
  const quality = useMemo(
    () =>
      scoreListing({
        ...form,
        price: numeric(form.price),
        mrp: numeric(form.mrp),
        stock: form.trackStock ? Number(form.stock || 0) : null,
        unitValue: numeric(form.unitValue),
      }),
    [form],
  );
  const ondcIssues = useMemo(
    () =>
      productIssues(
        {
          ...form,
          id: product?.id ?? "new",
          price: numeric(form.price),
          mrp: numeric(form.mrp),
          stock: form.trackStock ? Number(form.stock || 0) : null,
          unitValue: numeric(form.unitValue),
          countryOfOrigin: "IND",
          updatedAt: new Date(),
        },
        store,
      ),
    [form, product?.id, store],
  );

  const save = async () => {
    if (!form.name.trim()) return toast.error("Give the product a name.");
    setSaving(true);
    try {
      if (product) {
        const { product: p } = await api<{ product: ProductDTO }>(`/api/products/${product.id}`, { method: "PATCH", json: toPayload(form) });
        const next = toForm(p);
        setForm(next);
        setSaved(next);
        setListings(p.listings ?? []);
        toast.success("Saved");
        router.refresh();
      } else {
        const { product: p } = await api<{ product: ProductDTO }>("/api/products", { method: "POST", json: toPayload(form) });
        toast.success("Product added");
        router.replace(`/dashboard/catalog/${p.id}`);
      }
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };

  const addPhotos = async (files: FileList) => {
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of [...files].slice(0, 6)) urls.push(await uploadFile((await shrinkImage(f)).file));
      setForm((cur) => {
        const all = [cur.imageUrl, ...cur.images, ...urls].filter(Boolean);
        return { ...cur, imageUrl: all[0] ?? "", images: all.slice(1, 10) };
      });
    } catch (e) {
      toastError(e);
    } finally {
      setUploading(false);
    }
  };

  const photos = [form.imageUrl, ...form.images].filter(Boolean);
  const makeMain = (url: string) => setForm((f) => ({ ...f, imageUrl: url, images: [f.imageUrl, ...f.images].filter((u) => u && u !== url) }));
  const removePhoto = (url: string) =>
    setForm((f) => {
      const rest = [f.imageUrl, ...f.images].filter((u) => u && u !== url);
      return { ...f, imageUrl: rest[0] ?? "", images: rest.slice(1) };
    });

  const enhanceMain = async () => {
    if (!form.imageUrl) return;
    setAiBusy("enhance");
    try {
      const { url } = await api<{ url: string }>("/api/ai/enhance", { method: "POST", json: { image: form.imageUrl, name: form.name } });
      setForm((f) => ({ ...f, imageUrl: url, images: [f.imageUrl, ...f.images].slice(0, 9) }));
      toast.success("Enhanced photo added as the main image. The original is kept.");
    } catch (e) {
      toastError(e);
    } finally {
      setAiBusy(null);
    }
  };

  const generatePhoto = async () => {
    if (!product) return;
    if (dirty) await save();
    setAiBusy("photo");
    try {
      const { url } = await api<{ url: string }>("/api/ai/photo", { method: "POST", json: { productId: product.id } });
      setForm((f) => ({ ...f, imageUrl: url }));
      setSaved((f) => ({ ...f, imageUrl: url }));
      toast.success("Photo created");
    } catch (e) {
      toastError(e);
    } finally {
      setAiBusy(null);
    }
  };

  const improveCopy = async () => {
    if (!product) return toast.message("Save the product first, then AI can improve it.");
    if (dirty) await save();
    setAiBusy("copy");
    try {
      setSuggestion(await api<{ name: string; description: string }>("/api/ai/copy", { method: "POST", json: { productId: product.id } }));
    } catch (e) {
      toastError(e);
    } finally {
      setAiBusy(null);
    }
  };

  const publish = async (provider: "shopify" | "amazon") => {
    if (!product) return;
    if (dirty) await save();
    setPublishing(provider);
    try {
      const r = await api<{ results: { ok: boolean; message?: string }[] }>(`/api/channels/${provider}/publish`, {
        method: "POST",
        json: { productIds: [product.id] },
      });
      const res = r.results[0];
      if (res?.ok) toast.success(`Live on ${provider === "shopify" ? "Shopify" : "Amazon"}`);
      else toast.error(res?.message ?? "Couldn't publish");
      const { product: p } = await api<{ product: ProductDTO }>(`/api/products/${product.id}`);
      setListings(p.listings ?? []);
    } catch (e) {
      toastError(e);
    } finally {
      setPublishing(null);
    }
  };

  const remove = async () => {
    if (!product) return;
    try {
      await api(`/api/products/${product.id}`, { method: "DELETE" });
      toast.success("Product deleted");
      router.replace("/dashboard/catalog");
    } catch (e) {
      toastError(e);
    }
  };

  const band = qualityBand(quality.score);
  const listing = (p: string) => listings.find((l) => l.provider === p);

  return (
    <>
      <PageHeader
        back={{ href: "/dashboard/catalog", label: "Catalog" }}
        title={product ? form.name || "Untitled product" : "New product"}
        actions={
          <>
            {product ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Delete product">
                    <Trash2 />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this product?</AlertDialogTitle>
                    <AlertDialogDescription>It's removed from your catalog and stops showing on ONDC. Listings already pushed to Shopify or Amazon stay there until you remove them.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={remove}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            <Button onClick={save} disabled={saving || (!dirty && Boolean(product))}>
              {saving ? <Loader2 className="animate-spin" /> : <Check />} {product ? (dirty ? "Save changes" : "Saved") : "Add product"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Section title="Photos" description="The first photo is the main image on every channel.">
            <div className="flex flex-wrap gap-3 p-5">
              {photos.map((url, i) => (
                <div key={url} className="group relative size-28 overflow-hidden rounded-lg border bg-white">
                  <img src={url} alt="" className="size-full object-cover" />
                  {i === 0 ? <span className="absolute top-1 left-1 rounded bg-black/60 px-1.5 text-[10px] text-white">Main</span> : null}
                  <div className="absolute inset-x-1 bottom-1 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    {i > 0 ? (
                      <button type="button" onClick={() => makeMain(url)} className="grid size-7 place-items-center rounded bg-white/90 text-stone-800 shadow" aria-label="Make main photo">
                        <Star className="size-3.5" />
                      </button>
                    ) : null}
                    <button type="button" onClick={() => removePhoto(url)} className="grid size-7 place-items-center rounded bg-white/90 text-stone-800 shadow" aria-label="Remove photo">
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <label className="grid size-28 cursor-pointer place-items-center rounded-lg border-2 border-dashed text-center text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">
                {uploading ? <Loader2 className="size-5 animate-spin" /> : (
                  <span className="flex flex-col items-center gap-1">
                    <ImagePlus className="size-5" /> Add photos
                  </span>
                )}
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => e.target.files && addPhotos(e.target.files)} />
              </label>
            </div>
            <div className="flex flex-wrap gap-2 border-t px-5 py-3">
              <Button variant="outline" size="sm" disabled={!form.imageUrl || Boolean(aiBusy)} onClick={enhanceMain}>
                {aiBusy === "enhance" ? <Loader2 className="animate-spin" /> : <Sparkles />} Enhance main photo
              </Button>
              {product && !photos.length ? (
                <Button variant="outline" size="sm" disabled={Boolean(aiBusy)} onClick={generatePhoto}>
                  {aiBusy === "photo" ? <Loader2 className="animate-spin" /> : <Wand2 />} Create a photo with AI
                </Button>
              ) : null}
              {form.type === "APPAREL" && product ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/studio?tab=tryon&product=${product.id}`}>Show on a model</Link>
                </Button>
              ) : null}
            </div>
          </Section>

          <Section
            title="Details"
            actions={
              <Button variant="outline" size="sm" onClick={improveCopy} disabled={Boolean(aiBusy)}>
                {aiBusy === "copy" ? <Loader2 className="animate-spin" /> : <Wand2 />} Improve with AI
              </Button>
            }
          >
            <div className="space-y-4 p-5">
              {suggestion ? (
                <div className="space-y-3 rounded-lg border border-primary/30 bg-accent/40 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="size-4 text-primary" /> Suggested listing
                  </div>
                  <div className="text-sm font-medium">{suggestion.name}</div>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">{suggestion.description}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setForm((f) => ({ ...f, name: suggestion.name, description: suggestion.description }));
                        setSuggestion(null);
                      }}
                    >
                      Use this
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSuggestion(null)}>
                      Keep mine
                    </Button>
                  </div>
                </div>
              ) : null}
              <Field label="Name" hint="Brand + product + size works best, e.g. “Tata Salt Iodised 1 kg”.">
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Description">
                <Textarea rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What it is, why it's good, how to use or store it." />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category on ONDC & marketplaces">
                  <OndcCategorySelect value={form.ondcCategory} onChange={(v) => set("ondcCategory", v)} />
                </Field>
                <Field label="Your shelf / group" hint="Your own grouping, e.g. “Counter 2”.">
                  <Input value={form.category} onChange={(e) => set("category", e.target.value)} />
                </Field>
                <Field label="Kind of product">
                  <NativeSelect value={form.type} onChange={(e) => set("type", e.target.value as Form["type"])}>
                    <option value="PACKAGED">Packaged (barcode)</option>
                    <option value="LOOSE">Loose (by weight)</option>
                    <option value="HANDMADE">Handmade / custom</option>
                    <option value="APPAREL">Apparel</option>
                  </NativeSelect>
                </Field>
                <Field label="Veg / non-veg" hint="Required on ONDC for food.">
                  <NativeSelect value={form.vegType ?? ""} onChange={(e) => set("vegType", e.target.value || null)}>
                    <option value="">Not food / not set</option>
                    <option value="veg">Veg</option>
                    <option value="nonveg">Non-veg</option>
                    <option value="egg">Contains egg</option>
                  </NativeSelect>
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Price & stock">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Selling price">
                <MoneyInput value={form.price} onChange={(v) => set("price", v)} placeholder="0.00" />
              </Field>
              <Field label="MRP" hint={Number(form.mrp) > Number(form.price) && Number(form.price) > 0 ? `${Math.round((1 - Number(form.price) / Number(form.mrp)) * 100)}% off shown to buyers` : "Printed maximum retail price"}>
                <MoneyInput value={form.mrp} onChange={(v) => set("mrp", v)} placeholder="0.00" />
              </Field>
              <Field label="Pack size">
                <div className="flex gap-2">
                  <Input inputMode="decimal" value={form.unitValue} onChange={(e) => set("unitValue", e.target.value.replace(/[^\d.]/g, ""))} placeholder="1" className="w-24" />
                  <UnitSelect value={form.unit} onChange={(v) => set("unit", v)} className="flex-1" />
                </div>
              </Field>
              <Field label="Stock">
                <div className="flex items-center gap-3">
                  <Input
                    inputMode="numeric"
                    value={form.trackStock ? form.stock : ""}
                    disabled={!form.trackStock}
                    placeholder={form.trackStock ? "0" : "Always available"}
                    onChange={(e) => set("stock", e.target.value.replace(/\D/g, ""))}
                    className="w-28"
                  />
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch checked={form.trackStock} onCheckedChange={(v) => set("trackStock", v)} /> Track
                  </label>
                </div>
              </Field>
              <Field label="Status" className="sm:col-span-2">
                <div className="inline-flex rounded-lg border p-0.5 text-sm">
                  {(["ACTIVE", "DRAFT", "ARCHIVED"] as const).map((st) => (
                    <button key={st} type="button" onClick={() => set("status", st)} className={cn("rounded-md px-3 py-1", form.status === st && "bg-muted font-medium")}>
                      {st === "ACTIVE" ? "Active" : st === "DRAFT" ? "Draft" : "Archived"}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </Section>

          <Section title="Identifiers & compliance" description="Marketplaces use these to match and verify your product.">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Brand">
                <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} />
              </Field>
              <Field label="Barcode (EAN / UPC)">
                <Input value={form.barcode} inputMode="numeric" onChange={(e) => set("barcode", e.target.value.replace(/\D/g, ""))} className="font-mono" />
              </Field>
              <Field label="SKU" hint="Your own code. Auto-generated for marketplaces if empty.">
                <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} className="font-mono" />
              </Field>
              <Field label="Common or generic name" hint="Legal Metrology: e.g. “Whole wheat flour”.">
                <Input value={form.commonName} onChange={(e) => set("commonName", e.target.value)} />
              </Field>
              <Field label="Manufacturer / packer">
                <Input value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} />
              </Field>
              <Field label="Manufacturer address">
                <Input value={form.manufacturerAddress} onChange={(e) => set("manufacturerAddress", e.target.value)} />
              </Field>
              <Field label="HSN code">
                <Input value={form.hsnCode} inputMode="numeric" onChange={(e) => set("hsnCode", e.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label="GST %">
                <NativeSelect value={form.gstRate} onChange={(e) => set("gstRate", e.target.value)}>
                  <option value="">Not set</option>
                  {["0", "5", "12", "18", "28"].map((r) => (
                    <option key={r} value={r}>
                      {r}%
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Section>
            <div className="p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Listing score</span>
                <span className={cn("text-2xl font-semibold tabular", band === "great" ? "text-success" : band === "weak" ? "text-destructive" : "")}>
                  {quality.score}
                  <span className="text-sm font-normal text-muted-foreground">/100</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full transition-all", band === "great" ? "bg-success" : band === "weak" ? "bg-destructive" : "bg-warning")} style={{ width: `${quality.score}%` }} />
              </div>
              {quality.suggestions.length ? (
                <ul className="mt-4 space-y-2.5">
                  {quality.suggestions.slice(0, 5).map((sg) => (
                    <li key={sg.id} className="flex gap-2 text-sm">
                      <span className="mt-0.5 shrink-0 text-xs font-semibold text-primary tabular">+{sg.points}</span>
                      <span className="text-muted-foreground">{sg.message}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Complete listing. Buyers have everything they need.</p>
              )}
            </div>
          </Section>

          {product ? (
            <Section title="Channels">
              <ul className="divide-y text-sm">
                <li className="flex items-center justify-between gap-2 px-5 py-3">
                  <div>
                    <div className="font-medium">ONDC</div>
                    <div className="text-xs text-muted-foreground">
                      {!store.ondcEnabled
                        ? "Store not live on ONDC yet"
                        : ondcIssues.some((i) => i.blocking)
                          ? ondcIssues.find((i) => i.blocking)?.message
                          : "Served to buyer apps automatically"}
                    </div>
                  </div>
                  {store.ondcEnabled && !ondcIssues.some((i) => i.blocking) ? (
                    <Pill tone="success" dot>
                      Ready
                    </Pill>
                  ) : (
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/dashboard/channels/ondc">Fix</Link>
                    </Button>
                  )}
                </li>
                {(["SHOPIFY", "AMAZON"] as const).map((prov) => {
                  const l = listing(prov);
                  const name = prov === "SHOPIFY" ? "Shopify" : "Amazon.in";
                  return (
                    <li key={prov} className="space-y-2 px-5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{name}</div>
                        {l ? <Pill tone={LISTING_STATUS[l.status].tone}>{LISTING_STATUS[l.status].label}</Pill> : null}
                      </div>
                      {l?.message ? <p className="text-xs text-muted-foreground">{l.message}</p> : null}
                      <div className="flex gap-2">
                        {connected[prov] ? (
                          <Button size="sm" variant="outline" disabled={Boolean(publishing)} onClick={() => publish(prov === "SHOPIFY" ? "shopify" : "amazon")}>
                            {publishing === prov.toLowerCase() ? <Loader2 className="animate-spin" /> : null}
                            {l ? "Sync now" : "Publish"}
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="ghost">
                            <Link href="/dashboard/channels">Connect {name}</Link>
                          </Button>
                        )}
                        {l?.externalUrl ? (
                          <Button asChild size="sm" variant="ghost">
                            <a href={l.externalUrl} target="_blank" rel="noreferrer">
                              View <ExternalLink />
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
