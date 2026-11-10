"use client";

import { Check, Loader2, Sparkles, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api, toastError } from "@/components/app/api";
import { Field } from "@/components/app/fields";
import { PageHeader, Section } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface Kit {
  names: string[];
  tagline: string;
  story: string;
  palette: { name: string; hex: string }[];
  voice: string[];
  logoPrompt: string;
  logoUrl?: string;
}

export function BrandView({
  kit: initial,
  store,
}: {
  kit: Kit | null;
  store: {
    name: string;
    city: string | null;
    tagline: string | null;
    brandColor: string | null;
    logoUrl: string | null;
    slug: string;
  };
}) {
  const router = useRouter();
  const [kit, setKit] = useState<Kit | null>(initial);
  const [brief, setBrief] = useState({
    businessName: store.name,
    wantsNames: false,
    sells: "",
    audience: "",
    city: store.city ?? "",
    feel: "",
    withLogo: true,
  });
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [primary, setPrimary] = useState(0);

  const generate = async () => {
    setBusy(true);
    try {
      const { kit: k } = await api<{ kit: Kit }>("/api/ai/brand", {
        method: "POST",
        json: brief,
      });
      setKit(k);
      setPrimary(0);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const apply = async (name?: string) => {
    if (!kit) return;
    setApplying(true);
    try {
      await api("/api/store", {
        method: "PATCH",
        json: {
          ...(name ? { name } : {}),
          tagline: kit.tagline,
          description: kit.story,
          brandColor: kit.palette[primary]?.hex ?? null,
          ...(kit.logoUrl ? { logoUrl: kit.logoUrl } : {}),
        },
      });
      toast.success("Applied to your shop and storefront", {
        action: {
          label: "View storefront",
          onClick: () => window.open(`/s/${store.slug}`, "_blank"),
        },
      });
      router.refresh();
    } catch (e) {
      toastError(e);
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Brand kit"
        description="A name, tagline, story, colours and logo that make your shop recognisable online, even if you've never had a brand before."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Section title="Tell us about your business">
          <div className="space-y-4 p-5">
            <Field
              label="Business name"
              hint="Leave blank and tick below if you want ideas."
            >
              <Input
                value={brief.businessName}
                onChange={(e) =>
                  setBrief({ ...brief, businessName: e.target.value })
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={brief.wantsNames}
                onCheckedChange={(v) =>
                  setBrief({ ...brief, wantsNames: Boolean(v) })
                }
              />{" "}
              Suggest name ideas
            </label>
            <Field label="What do you sell?">
              <Textarea
                rows={3}
                value={brief.sells}
                onChange={(e) => setBrief({ ...brief, sells: e.target.value })}
                placeholder="e.g. Hand-block-printed cotton kurtas and dupattas made by women artisans in Bagru"
              />
            </Field>
            <Field label="Who buys from you?">
              <Input
                value={brief.audience}
                onChange={(e) =>
                  setBrief({ ...brief, audience: e.target.value })
                }
                placeholder="e.g. Working women in cities, 25–45"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City">
                <Input
                  value={brief.city}
                  onChange={(e) => setBrief({ ...brief, city: e.target.value })}
                />
              </Field>
              <Field label="Feel">
                <Input
                  value={brief.feel}
                  onChange={(e) => setBrief({ ...brief, feel: e.target.value })}
                  placeholder="earthy, premium…"
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={brief.withLogo}
                onCheckedChange={(v) =>
                  setBrief({ ...brief, withLogo: Boolean(v) })
                }
              />{" "}
              Design a logo mark too
            </label>
            <Button
              className="w-full"
              size="lg"
              disabled={busy || brief.sells.trim().length < 3}
              onClick={generate}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Wand2 />}{" "}
              {kit ? "Generate again" : "Create my brand"} ·{" "}
              {brief.withLogo ? 3 : 1} credits
            </Button>
          </div>
        </Section>

        {kit ? (
          <div className="space-y-6">
            <section
              className="overflow-hidden rounded-xl border"
              style={{
                background: kit.palette[2]?.hex ?? "#faf7f2",
                color: kit.palette[3]?.hex ?? "#1c1917",
              }}
            >
              <div className="flex items-center gap-4 p-6">
                {kit.logoUrl ? (
                  <img
                    src={kit.logoUrl}
                    alt="Logo"
                    className="size-20 rounded-xl bg-white object-contain p-1"
                  />
                ) : null}
                <div>
                  <div className="font-serif text-3xl">
                    {brief.businessName || store.name}
                  </div>
                  <div className="mt-1 text-sm opacity-80">{kit.tagline}</div>
                </div>
              </div>
              <div className="px-6 pb-6 text-sm leading-relaxed opacity-90">
                {kit.story}
              </div>
              <div className="flex gap-2 px-6 pb-6">
                <span
                  className="rounded-full px-4 py-2 text-sm font-medium text-white"
                  style={{ background: kit.palette[primary]?.hex }}
                >
                  Order on WhatsApp
                </span>
              </div>
            </section>

            <Section
              title="Colours"
              description="Pick the main colour for buttons and highlights."
            >
              <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
                {kit.palette.map((c, i) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setPrimary(i)}
                    className="text-left"
                  >
                    <div
                      className="relative h-16 rounded-lg border"
                      style={{ background: c.hex }}
                    >
                      {primary === i ? (
                        <Check className="absolute top-2 right-2 size-5 rounded-full bg-white p-0.5 text-black" />
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs font-medium">{c.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {c.hex}
                    </div>
                  </button>
                ))}
              </div>
            </Section>

            {kit.voice?.length ? (
              <Section title="How your brand speaks">
                <div className="flex flex-wrap gap-2 p-5">
                  {kit.voice.map((v) => (
                    <span
                      key={v}
                      className="rounded-full bg-muted px-3 py-1 text-sm"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </Section>
            ) : null}

            {kit.names?.length ? (
              <Section title="Name ideas">
                <ul className="divide-y">
                  {kit.names.map((n) => (
                    <li
                      key={n}
                      className="flex items-center justify-between px-5 py-2.5 text-sm"
                    >
                      {n}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={applying}
                        onClick={() => apply(n)}
                      >
                        Use this name
                      </Button>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            <Button
              size="lg"
              className="w-full"
              disabled={applying}
              onClick={() => apply()}
            >
              {applying ? <Loader2 className="animate-spin" /> : <Sparkles />}{" "}
              Apply to my shop
            </Button>
          </div>
        ) : (
          <div className="grid place-items-center rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Fill in the brief and your brand appears here, previewed the way
            buyers will see it.
          </div>
        )}
      </div>
    </>
  );
}
