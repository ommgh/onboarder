"use client";

import {
  Camera,
  ImageUp,
  Loader2,
  RefreshCw,
  Shirt,
  Sparkles,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { api, shrinkImage, toastError, uploadFile } from "@/components/app/api";
import { Field, MoneyInput, OndcCategorySelect } from "@/components/app/fields";
import { PageHeader } from "@/components/app/page-header";
import { Pill } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Detection {
  name: string;
  description: string;
  brand: string | null;
  type: "PACKAGED" | "LOOSE" | "HANDMADE" | "APPAREL";
  ondcCategory: string | null;
  vegType: string | null;
  enhancementPrompt: string;
  confidence: number;
}

type Phase = "pick" | "working" | "review";

export default function HandmadePage() {
  const [phase, setPhase] = useState<Phase>("pick");
  const [preview, setPreview] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [useEnhanced, setUseEnhanced] = useState(true);
  const [detection, setDetection] = useState<Detection | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    mrp: "",
    stock: "1",
    ondcCategory: null as string | null,
    type: "HANDMADE" as Detection["type"],
  });
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setPhase("pick");
    setPreview(null);
    setOriginalUrl(null);
    setEnhancedUrl(null);
    setDetection(null);
    setForm({
      name: "",
      description: "",
      price: "",
      mrp: "",
      stock: "1",
      ondcCategory: null,
      type: "HANDMADE",
    });
  };

  const enhance = async (image: string, prompt?: string, name?: string) => {
    setEnhancing(true);
    try {
      const { url } = await api<{ url: string }>("/api/ai/enhance", {
        method: "POST",
        json: { image, prompt, name },
      });
      setEnhancedUrl(url);
      setUseEnhanced(true);
    } catch (e) {
      toastError(e, "Couldn't enhance the photo");
      setUseEnhanced(false);
    } finally {
      setEnhancing(false);
    }
  };

  const onFile = async (file: File) => {
    setPhase("working");
    try {
      const { file: small, dataUrl } = await shrinkImage(file);
      setPreview(dataUrl);
      const [url, det] = await Promise.all([
        uploadFile(small),
        api<{ detection: Detection }>("/api/ai/detect", {
          method: "POST",
          json: { image: dataUrl },
        }).then((r) => r.detection),
      ]);
      setOriginalUrl(url);
      setDetection(det);
      setForm((f) => ({
        ...f,
        name: det.name ?? "",
        description: det.description ?? "",
        ondcCategory: det.ondcCategory,
        type:
          det.type === "APPAREL"
            ? "APPAREL"
            : det.type === "PACKAGED"
              ? "PACKAGED"
              : "HANDMADE",
      }));
      setPhase("review");
      enhance(url, det.enhancementPrompt, det.name);
    } catch (e) {
      toastError(e, "Couldn't read that photo");
      reset();
    }
  };

  const save = async (next: boolean) => {
    if (!form.name.trim()) return toast.error("Give the product a name.");
    setSaving(true);
    const main = useEnhanced && enhancedUrl ? enhancedUrl : originalUrl;
    const extra = [enhancedUrl, originalUrl].filter(
      (u): u is string => Boolean(u) && u !== main,
    );
    try {
      const { product } = await api<{ product: { id: string } }>(
        "/api/products",
        {
          method: "POST",
          json: {
            name: form.name.trim(),
            description: form.description,
            type: form.type,
            status: form.price ? "ACTIVE" : "DRAFT",
            ondcCategory: form.ondcCategory,
            category:
              form.ondcCategory ??
              (form.type === "APPAREL" ? "Apparel" : "Handmade"),
            brand: detection?.brand ?? null,
            price: form.price || null,
            mrp: form.mrp || form.price || null,
            stock: form.stock === "" ? null : form.stock,
            imageUrl: main ?? "",
            images: extra,
            aiGenerated: true,
          },
        },
      );
      toast.success("Saved to your catalog", {
        action: next
          ? {
              label: "Open",
              onClick: () =>
                window.location.assign(`/dashboard/catalog/${product.id}`),
            }
          : undefined,
      });
      if (next) reset();
      else window.location.assign(`/dashboard/catalog/${product.id}`);
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
        title="Photograph handmade work"
        description="Art, crafts, clothing, home goods: anything without a barcode. Take a photo; AI names it, writes the listing and creates a studio-quality image."
      />

      {phase === "pick" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <PickTile
            icon={Camera}
            title="Take a photo"
            body="Good light, plain background, whole item in frame."
            capture
          />
          <PickTile
            icon={ImageUp}
            title="Upload from gallery"
            body="JPG, PNG or WebP. Large photos are resized for you."
          />
        </div>
      ) : null}

      {phase === "working" ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
            {preview ? (
              <img
                src={preview}
                alt=""
                className="size-full object-cover opacity-70"
              />
            ) : null}
            <div className="absolute inset-0 grid place-items-center">
              <div className="flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm shadow">
                <Loader2 className="size-4 animate-spin" /> Reading your
                product…
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </div>
      ) : null}

      {phase === "review" ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="relative aspect-square overflow-hidden rounded-xl border bg-white">
              {useEnhanced && enhancedUrl ? (
                <img
                  src={enhancedUrl}
                  alt="Enhanced product"
                  className="size-full object-contain"
                />
              ) : preview ? (
                <img
                  src={preview}
                  alt="Original product"
                  className="size-full object-contain"
                />
              ) : null}
              {enhancing ? (
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-4 text-sm text-white">
                  <Sparkles className="size-4 animate-pulse" /> Creating a
                  studio photo… (about 15 seconds)
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border p-0.5 text-sm">
                <button
                  type="button"
                  onClick={() => setUseEnhanced(false)}
                  className={cn(
                    "rounded-md px-3 py-1",
                    !useEnhanced && "bg-muted font-medium",
                  )}
                >
                  Original
                </button>
                <button
                  type="button"
                  disabled={!enhancedUrl}
                  onClick={() => setUseEnhanced(true)}
                  className={cn(
                    "rounded-md px-3 py-1 disabled:opacity-50",
                    useEnhanced && enhancedUrl && "bg-muted font-medium",
                  )}
                >
                  Enhanced
                </button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={enhancing || !originalUrl}
                onClick={() =>
                  originalUrl &&
                  enhance(originalUrl, detection?.enhancementPrompt, form.name)
                }
              >
                <RefreshCw /> Try again
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Both photos are kept on the product. The one selected becomes the
              main image.
            </p>
          </div>

          <div className="space-y-4">
            {detection ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wand2 className="size-3.5 text-primary" /> Filled in by AI ·
                check before saving
                {detection.confidence < 0.6 ? (
                  <Pill tone="warning">Low confidence</Pill>
                ) : null}
              </div>
            ) : null}
            <Field label="Product name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <Textarea
                rows={5}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Price">
                <MoneyInput
                  value={form.price}
                  onChange={(price) => setForm({ ...form, price })}
                />
              </Field>
              <Field label="MRP">
                <MoneyInput
                  value={form.mrp}
                  onChange={(mrp) => setForm({ ...form, mrp })}
                  placeholder="optional"
                />
              </Field>
              <Field label="In stock">
                <Input
                  inputMode="numeric"
                  value={form.stock}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      stock: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </Field>
            </div>
            <Field
              label="Category"
              hint="Used by ONDC buyer apps for browse and search."
            >
              <OndcCategorySelect
                value={form.ondcCategory}
                onChange={(ondcCategory) => setForm({ ...form, ondcCategory })}
              />
            </Field>
            {form.type === "APPAREL" ? (
              <div className="flex items-start gap-3 rounded-lg border bg-accent/40 p-3 text-sm">
                <Shirt className="mt-0.5 size-4 text-primary" />
                <div>
                  This looks like clothing. After saving, show it on a model in
                  the{" "}
                  <Link
                    href="/dashboard/studio?tab=tryon"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    photo studio
                  </Link>
                  .
                </div>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button
                size="lg"
                onClick={() => save(true)}
                disabled={saving || enhancing}
              >
                {saving ? <Loader2 className="animate-spin" /> : null} Save &
                add next
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => save(false)}
                disabled={saving || enhancing}
              >
                Save & open
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={reset}
                disabled={saving}
              >
                Discard
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  function PickTile({
    icon: Icon,
    title,
    body,
    capture,
  }: {
    icon: typeof Camera;
    title: string;
    body: string;
    capture?: boolean;
  }) {
    return (
      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-card px-6 py-14 text-center transition-colors hover:border-primary/50 hover:bg-accent/30">
        <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-6" />
        </span>
        <span className="font-medium">{title}</span>
        <span className="max-w-xs text-sm text-muted-foreground">{body}</span>
        <input
          type="file"
          accept="image/*"
          capture={capture ? "environment" : undefined}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </label>
    );
  }
}
