"use client";

import { Check, Download, ImageUp, Loader2, Plus, Sparkles, Trash2, UserRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api, shrinkImage, toastError, uploadFile } from "@/components/app/api";
import { PageHeader, Section } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Model {
  id: string;
  name: string;
  imageUrl: string;
}

const POSES = ["Three-quarter turn to the left", "Side profile", "Walking towards camera", "Back view", "Close-up on the garment"];

export function StudioView({ models: initialModels, modelLimit, product }: {
  models: Model[];
  modelLimit: number;
  product: { id: string; name: string; imageUrl: string; images: string[] } | null;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState(params.get("tab") === "tryon" ? "tryon" : "enhance");
  return (
    <>
      <PageHeader
        title="Photo studio"
        description="Studio-quality product photos without a studio. Each generation uses AI credits from your plan."
        actions={
          <div className="inline-flex rounded-lg border bg-card p-0.5 text-sm">
            {[
              ["enhance", "Enhance a photo"],
              ["tryon", "Clothes on a model"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id);
                  router.replace(`?tab=${id}${product ? `&product=${product.id}` : ""}`, { scroll: false });
                }}
                className={cn("rounded-md px-3 py-1.5", tab === id ? "bg-muted font-medium" : "text-muted-foreground")}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />
      {tab === "enhance" ? <Enhance /> : <TryOn initialModels={initialModels} modelLimit={modelLimit} product={product} />}
    </>
  );
}

function ImagePicker({ label, value, onPick, busy, aspect = "aspect-square" }: { label: string; value: string | null; onPick: (f: File) => void; busy?: boolean; aspect?: string }) {
  return (
    <label className={cn("relative grid cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed bg-card text-center hover:border-primary/50", aspect)}>
      {value ? (
        <img src={value} alt="" className="absolute inset-0 size-full object-contain" />
      ) : (
        <span className="flex flex-col items-center gap-2 p-6 text-sm text-muted-foreground">
          <ImageUp className="size-6" /> {label}
        </span>
      )}
      {busy ? (
        <span className="absolute inset-0 grid place-items-center bg-background/60">
          <Loader2 className="size-6 animate-spin" />
        </span>
      ) : null}
      <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
    </label>
  );
}

function ResultActions({ url, name }: { url: string; name: string }) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const createProduct = async () => {
    setSaving(true);
    try {
      const { product } = await api<{ product: { id: string } }>("/api/products", {
        method: "POST",
        json: { name, type: "HANDMADE", status: "DRAFT", imageUrl: url, aiGenerated: true },
      });
      router.push(`/dashboard/catalog/${product.id}`);
    } catch (e) {
      toastError(e);
      setSaving(false);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" asChild>
        <a href={url} target="_blank" rel="noreferrer" download>
          <Download /> Download
        </a>
      </Button>
      <Button size="sm" onClick={createProduct} disabled={saving}>
        {saving ? <Loader2 className="animate-spin" /> : <Plus />} New product from this
      </Button>
    </div>
  );
}

function Enhance() {
  const [original, setOriginal] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [direction, setDirection] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<string | null>(null);

  const pick = async (f: File) => {
    const { dataUrl } = await shrinkImage(f);
    setOriginal(dataUrl);
    setFile(dataUrl);
    setResult(null);
  };
  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await api<{ url: string }>("/api/ai/enhance", { method: "POST", json: { image: file, prompt: direction || undefined } });
      setResult(url);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3">
        <ImagePicker label="Upload a product photo" value={original} onPick={pick} />
        <Input value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="Optional direction, e.g. “on a wooden table with diyas”" />
        <Button className="w-full" size="lg" disabled={!file || busy} onClick={run}>
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} Enhance · 2 credits
        </Button>
      </div>
      <div className="space-y-3">
        <div className="relative grid aspect-square place-items-center overflow-hidden rounded-xl border bg-muted/40">
          {result ? <img src={result} alt="Enhanced" className="absolute inset-0 size-full object-contain" /> : (
            <span className="text-sm text-muted-foreground">{busy ? "Working on it… (about 15 seconds)" : "Your enhanced photo appears here"}</span>
          )}
        </div>
        {result ? <ResultActions url={result} name="Untitled product" /> : null}
      </div>
    </div>
  );
}

function TryOn({ initialModels, modelLimit, product }: { initialModels: Model[]; modelLimit: number; product: { id: string; name: string; imageUrl: string; images: string[] } | null }) {
  const [models, setModels] = useState(initialModels);
  const [model, setModel] = useState<Model | null>(initialModels[0] ?? null);
  const [garment, setGarment] = useState<string | null>(product?.imageUrl || null);
  const [garmentBusy, setGarmentBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [poses, setPoses] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const pickGarment = async (f: File) => {
    setGarmentBusy(true);
    try {
      setGarment(await uploadFile((await shrinkImage(f)).file));
    } catch (e) {
      toastError(e);
    } finally {
      setGarmentBusy(false);
    }
  };

  const tryOn = async () => {
    if (!model || !garment) return;
    setBusy("tryon");
    setPoses([]);
    try {
      const { url } = await api<{ url: string }>("/api/ai/tryon", { method: "POST", json: { action: "tryOn", model: model.imageUrl, garment } });
      setResult(url);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(null);
    }
  };

  const pose = async (instruction: string) => {
    if (!result) return;
    setBusy(instruction);
    try {
      const { url } = await api<{ url: string }>("/api/ai/tryon", { method: "POST", json: { action: "pose", image: result, instruction } });
      setPoses((p) => [...p, url]);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(null);
    }
  };

  const attach = async () => {
    if (!product) return;
    const all = [result, ...poses].filter(Boolean) as string[];
    setBusy("attach");
    try {
      await api(`/api/products/${product.id}`, { method: "PATCH", json: { images: [...product.images, ...all].slice(0, 10), type: "APPAREL" } });
      toast.success(`Added ${all.length} photos to ${product.name}`);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(null);
    }
  };

  const deleteModel = async (m: Model) => {
    try {
      await api(`/api/models/${m.id}`, { method: "DELETE" });
      setModels((ms) => ms.filter((x) => x.id !== m.id));
      if (model?.id === m.id) setModel(null);
    } catch (e) {
      toastError(e);
    }
  };

  return (
    <div className="space-y-6">
      <Section
        title="1. Choose a model"
        description={`Create models from a photo of yourself, staff or family (with their consent). ${models.length}/${modelLimit} used.`}
      >
        <div className="flex gap-3 overflow-x-auto p-5">
          {models.map((m) => (
            <div key={m.id} className="group relative shrink-0">
              <button
                type="button"
                onClick={() => setModel(m)}
                className={cn("block w-28 overflow-hidden rounded-lg border-2 text-left", model?.id === m.id ? "border-primary" : "border-transparent")}
              >
                <img src={m.imageUrl} alt="" className="aspect-[3/4] w-full object-cover" />
                <div className="truncate bg-card px-2 py-1 text-xs">{m.name}</div>
              </button>
              {model?.id === m.id ? <Check className="absolute top-1.5 right-1.5 size-5 rounded-full bg-primary p-0.5 text-primary-foreground" /> : null}
              <button type="button" onClick={() => deleteModel(m)} className="absolute top-1.5 left-1.5 hidden size-6 place-items-center rounded bg-black/60 text-white group-hover:grid" aria-label={`Delete ${m.name}`}>
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setCreating(true)}
            disabled={models.length >= modelLimit}
            className="grid aspect-[3/4] w-28 shrink-0 place-items-center rounded-lg border-2 border-dashed text-center text-xs text-muted-foreground hover:border-primary/50 disabled:opacity-50"
          >
            <span className="flex flex-col items-center gap-1">
              <UserRound className="size-5" /> New model
            </span>
          </button>
        </div>
      </Section>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-medium">2. The garment{product ? ` · ${product.name}` : ""}</h3>
          <ImagePicker label="Upload the clothing, flat-lay or on a hanger" value={garment} onPick={pickGarment} busy={garmentBusy} aspect="aspect-[3/4]" />
          <Button className="w-full" size="lg" disabled={!model || !garment || Boolean(busy)} onClick={tryOn}>
            {busy === "tryon" ? <Loader2 className="animate-spin" /> : <Sparkles />} Put it on {model?.name ?? "the model"} · 2 credits
          </Button>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-medium">3. Result</h3>
          <div className="relative grid aspect-[3/4] place-items-center overflow-hidden rounded-xl border bg-muted/40">
            {result ? <img src={result} alt="Try-on result" className="absolute inset-0 size-full object-cover" /> : (
              <span className="px-6 text-center text-sm text-muted-foreground">{busy === "tryon" ? "Dressing your model… (about 20 seconds)" : "Your photo appears here"}</span>
            )}
          </div>
          {result ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {POSES.map((p) => (
                  <Button key={p} variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => pose(p)}>
                    {busy === p ? <Loader2 className="animate-spin" /> : <Plus />} {p}
                  </Button>
                ))}
              </div>
              {product ? (
                <Button onClick={attach} disabled={Boolean(busy)}>
                  {busy === "attach" ? <Loader2 className="animate-spin" /> : null} Add {1 + poses.length} photos to {product.name}
                </Button>
              ) : (
                <ResultActions url={result} name="Untitled garment" />
              )}
            </>
          ) : null}
        </div>
      </div>

      {poses.length ? (
        <Section title="More angles">
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
            {poses.map((u) => (
              <a key={u} href={u} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border">
                <img src={u} alt="" className="aspect-[3/4] w-full object-cover" />
              </a>
            ))}
          </div>
        </Section>
      ) : null}

      <NewModelDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(m) => {
          setModels((ms) => [m, ...ms]);
          setModel(m);
        }}
      />
    </div>
  );
}

function NewModelDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (m: Model) => void }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const pick = async (f: File) => {
    const { dataUrl } = await shrinkImage(f);
    setPhoto(dataUrl);
    setResult(null);
    setBusy(true);
    try {
      const { url } = await api<{ url: string }>("/api/ai/tryon", { method: "POST", json: { action: "model", person: dataUrl } });
      setResult(url);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (!result) return;
    try {
      const { model } = await api<{ model: Model }>("/api/models", { method: "POST", json: { name: name || "Model", imageUrl: result } });
      onCreated(model);
      onOpenChange(false);
      setPhoto(null);
      setResult(null);
      setName("");
    } catch (e) {
      toastError(e);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a model</DialogTitle>
          <DialogDescription>Upload a clear, full-length photo. We turn it into a clean studio model shot you can reuse. Only use photos of people who've agreed.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <ImagePicker label="Full-length photo" value={photo} onPick={pick} aspect="aspect-[3/4]" />
          <div className="relative grid aspect-[3/4] place-items-center overflow-hidden rounded-xl border bg-muted/40 text-center text-xs text-muted-foreground">
            {result ? <img src={result} alt="" className="absolute inset-0 size-full object-cover" /> : busy ? <Loader2 className="size-5 animate-spin" /> : "Studio version"}
          </div>
        </div>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. Priya" />
        <DialogFooter>
          <Button disabled={!result} onClick={save}>
            Save model
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
