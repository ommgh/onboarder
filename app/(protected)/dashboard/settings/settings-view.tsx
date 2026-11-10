"use client";

import { Check, ImagePlus, Loader2, LocateFixed, LogOut } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, shrinkImage, toastError, uploadFile } from "@/components/app/api";
import { Field, MoneyInput, NativeSelect } from "@/components/app/fields";
import { PageHeader, Section } from "@/components/app/page-header";
import { Pill } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { num } from "@/lib/format";
import { STATES, stdCodeForCity } from "@/lib/india";
import { cn } from "@/lib/utils";

// biome-ignore lint/suspicious/noExplicitAny: store is a wide flat record edited field by field
type StoreData = Record<string, any>;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const toTime = (hhmm: string) => `${hhmm.slice(0, 2)}:${hhmm.slice(2)}`;
const fromTime = (t: string) => t.replace(":", "").padStart(4, "0");

/** Each section edits its own subset of fields and saves independently. */
function useSection(store: StoreData, fields: string[]) {
  const router = useRouter();
  const NUMERIC_NULLABLE = new Set(["latitude", "longitude"]);
  const pick = (s: StoreData) =>
    Object.fromEntries(
      fields.map((f) => [f, s[f] ?? (NUMERIC_NULLABLE.has(f) ? null : "")]),
    );
  const [values, setValues] = useState(() => pick(store));
  const [base, setBase] = useState(() => pick(store));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(base);
  const set = (k: string, v: unknown) =>
    setValues((cur) => ({ ...cur, [k]: v }));
  const save = async (extra?: StoreData) => {
    setSaving(true);
    try {
      const { store: next } = await api<{ store: StoreData }>("/api/store", {
        method: "PATCH",
        json: { ...values, ...extra },
      });
      const fresh = pick(next);
      setValues(fresh);
      setBase(fresh);
      toast.success("Saved");
      router.refresh();
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };
  return { values, set, dirty, saving, save };
}

function SaveBar({
  dirty,
  saving,
  onSave,
  label = "Save",
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  label?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-3 border-t px-5 py-3">
      {dirty ? (
        <span className="text-xs text-muted-foreground">Unsaved changes</span>
      ) : null}
      <Button size="sm" onClick={onSave} disabled={!dirty || saving}>
        {saving ? <Loader2 className="animate-spin" /> : <Check />} {label}
      </Button>
    </div>
  );
}

export function SettingsView({
  store,
  account,
  plan,
  plans,
}: {
  store: StoreData;
  account: { name: string; email: string };
  plan: {
    name: string;
    label: string;
    status: string | null;
    nextBillingDate: string | null;
    usage: { label: string; used: number; limit: number; note?: string }[];
  };
  plans: {
    id: string;
    label: string;
    products: number;
    aiCredits: number;
    channels: number;
    models: number;
  }[];
}) {
  const params = useSearchParams();
  useEffect(() => {
    if (params.get("upgraded"))
      toast.success(
        "Thanks for upgrading! Your new limits apply as soon as payment confirms.",
      );
  }, [params]);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your shop details appear on ONDC, your storefront and every marketplace."
      />
      <nav className="-mx-4 mb-6 flex gap-1 overflow-x-auto px-4 text-sm sm:mx-0 sm:px-0">
        {[
          ["store", "Shop"],
          ["location", "Location"],
          ["operations", "Delivery & hours"],
          ["compliance", "Compliance"],
          ["payouts", "Payouts"],
          ["plan", "Plan"],
          ["account", "Account"],
        ].map(([id, l]) => (
          <a
            key={id}
            href={`#${id}`}
            className="shrink-0 rounded-full border bg-card px-3 py-1 text-muted-foreground hover:text-foreground"
          >
            {l}
          </a>
        ))}
      </nav>
      <div className="space-y-6">
        <ShopSection store={store} />
        <LocationSection store={store} />
        <OperationsSection store={store} />
        <ComplianceSection store={store} />
        <PayoutSection store={store} />
        <PlanSection plan={plan} plans={plans} />
        <AccountSection account={account} />
      </div>
    </>
  );
}

function ShopSection({ store }: { store: StoreData }) {
  const s = useSection(store, [
    "name",
    "slug",
    "tagline",
    "description",
    "logoUrl",
    "phone",
    "whatsapp",
    "email",
  ]);
  const [uploading, setUploading] = useState(false);
  return (
    <Section id="store" title="Shop" description="How buyers see you.">
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="flex items-center gap-4 sm:col-span-2">
          <label className="relative grid size-16 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed text-muted-foreground hover:border-primary/50">
            {s.values.logoUrl ? (
              <img
                src={s.values.logoUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : uploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ImagePlus className="size-5" />
            )}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setUploading(true);
                try {
                  s.set(
                    "logoUrl",
                    await uploadFile((await shrinkImage(f, 600)).file),
                  );
                } catch (err) {
                  toastError(err);
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
          <div className="text-sm text-muted-foreground">
            Shop logo or a photo of your shopfront. Square works best.
          </div>
        </div>
        <Field label="Shop name">
          <Input
            value={s.values.name}
            onChange={(e) => s.set("name", e.target.value)}
          />
        </Field>
        <Field
          label="Storefront address"
          hint={`onboarder.store/s/${s.values.slug || "your-shop"}`}
        >
          <Input
            value={s.values.slug}
            onChange={(e) =>
              s.set(
                "slug",
                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
              )
            }
          />
        </Field>
        <Field label="Tagline" className="sm:col-span-2">
          <Input
            value={s.values.tagline}
            onChange={(e) => s.set("tagline", e.target.value)}
            placeholder="e.g. Fresh groceries in Jayanagar since 1987"
          />
        </Field>
        <Field label="About the shop" className="sm:col-span-2">
          <Textarea
            rows={3}
            value={s.values.description}
            onChange={(e) => s.set("description", e.target.value)}
          />
        </Field>
        <Field label="Phone">
          <Input
            inputMode="tel"
            value={s.values.phone}
            onChange={(e) => s.set("phone", e.target.value)}
            placeholder="98xxxxxxxx"
          />
        </Field>
        <Field
          label="WhatsApp"
          hint="Storefront orders arrive here. Leave empty to use your phone."
        >
          <Input
            inputMode="tel"
            value={s.values.whatsapp}
            onChange={(e) => s.set("whatsapp", e.target.value)}
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={s.values.email}
            onChange={(e) => s.set("email", e.target.value)}
          />
        </Field>
      </div>
      <SaveBar dirty={s.dirty} saving={s.saving} onSave={() => s.save()} />
    </Section>
  );
}

function LocationSection({ store }: { store: StoreData }) {
  const s = useSection(store, [
    "addressLine",
    "locality",
    "city",
    "state",
    "pincode",
    "stdCode",
    "latitude",
    "longitude",
  ]);
  const [locating, setLocating] = useState(false);
  const locate = () => {
    if (!navigator.geolocation)
      return toast.error("Location isn't available in this browser.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        s.set("latitude", Number(pos.coords.latitude.toFixed(6)));
        s.set("longitude", Number(pos.coords.longitude.toFixed(6)));
        setLocating(false);
        toast.success("Location captured. Save to keep it.");
      },
      () => {
        setLocating(false);
        toast.error(
          "Couldn't get your location. Allow location access, or enter it manually.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  return (
    <Section
      id="location"
      title="Location"
      description="Used to show your shop to buyers within your delivery radius."
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Shop address" className="sm:col-span-2">
          <Input
            value={s.values.addressLine}
            onChange={(e) => s.set("addressLine", e.target.value)}
            placeholder="Shop no., building, street"
          />
        </Field>
        <Field label="Area / locality">
          <Input
            value={s.values.locality}
            onChange={(e) => s.set("locality", e.target.value)}
          />
        </Field>
        <Field label="City">
          <Input
            value={s.values.city}
            onChange={(e) => {
              s.set("city", e.target.value);
              const std = stdCodeForCity(e.target.value);
              if (std) s.set("stdCode", std);
            }}
          />
        </Field>
        <Field label="State">
          <NativeSelect
            value={s.values.state}
            onChange={(e) => s.set("state", e.target.value)}
          >
            <option value="">Choose state…</option>
            {STATES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Pincode">
          <Input
            inputMode="numeric"
            maxLength={6}
            value={s.values.pincode}
            onChange={(e) =>
              s.set("pincode", e.target.value.replace(/\D/g, ""))
            }
          />
        </Field>
        <Field
          label="ONDC city code"
          hint="Filled in from your city. Your city's STD code, e.g. std:080."
        >
          <Input
            value={s.values.stdCode}
            onChange={(e) => s.set("stdCode", e.target.value)}
            placeholder="std:080"
            className="font-mono"
          />
        </Field>
        <Field
          label="Map location"
          hint={
            s.values.latitude
              ? `${s.values.latitude}, ${s.values.longitude}`
              : "Stand in your shop and tap the button."
          }
        >
          <Button variant="outline" onClick={locate} disabled={locating}>
            {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}{" "}
            {s.values.latitude ? "Update location" : "Use my current location"}
          </Button>
        </Field>
      </div>
      <SaveBar dirty={s.dirty} saving={s.saving} onSave={() => s.save()} />
    </Section>
  );
}

function OperationsSection({ store }: { store: StoreData }) {
  const s = useSection(store, [
    "openTime",
    "closeTime",
    "openDays",
    "deliveryEnabled",
    "pickupEnabled",
    "serviceRadiusKm",
    "timeToShipMinutes",
    "deliveryFee",
    "minOrderValue",
    "codEnabled",
    "returnable",
    "returnWindowHours",
  ]);
  const days = new Set(String(s.values.openDays).split(",").filter(Boolean));
  return (
    <Section id="operations" title="Delivery & hours">
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Open days" className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => {
              const key = String(i + 1);
              const on = days.has(key);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    const next = new Set(days);
                    on ? next.delete(key) : next.add(key);
                    if (next.size)
                      s.set("openDays", [...next].sort().join(","));
                  }}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm",
                    on
                      ? "border-primary bg-primary/10 font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Opens at">
          <Input
            type="time"
            value={toTime(s.values.openTime)}
            onChange={(e) => s.set("openTime", fromTime(e.target.value))}
          />
        </Field>
        <Field label="Closes at">
          <Input
            type="time"
            value={toTime(s.values.closeTime)}
            onChange={(e) => s.set("closeTime", fromTime(e.target.value))}
          />
        </Field>
        <label className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
          <span>
            <span className="font-medium">Home delivery</span>
            <span className="block text-xs text-muted-foreground">
              You or your delivery person drops orders off
            </span>
          </span>
          <Switch
            checked={s.values.deliveryEnabled}
            onCheckedChange={(v) => s.set("deliveryEnabled", v)}
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
          <span>
            <span className="font-medium">Store pickup</span>
            <span className="block text-xs text-muted-foreground">
              Buyers collect from your counter
            </span>
          </span>
          <Switch
            checked={s.values.pickupEnabled}
            onCheckedChange={(v) => s.set("pickupEnabled", v)}
          />
        </label>
        <Field label="Delivery radius (km)">
          <Input
            inputMode="decimal"
            value={s.values.serviceRadiusKm}
            onChange={(e) =>
              s.set("serviceRadiusKm", Number(e.target.value) || 0)
            }
          />
        </Field>
        <Field label="Time to pack an order (minutes)">
          <Input
            inputMode="numeric"
            value={s.values.timeToShipMinutes}
            onChange={(e) =>
              s.set(
                "timeToShipMinutes",
                Number(e.target.value.replace(/\D/g, "")) || 0,
              )
            }
          />
        </Field>
        <Field label="Delivery charge">
          <MoneyInput
            value={s.values.deliveryFee}
            onChange={(v) => s.set("deliveryFee", Number(v) || 0)}
          />
        </Field>
        <Field label="Minimum order">
          <MoneyInput
            value={s.values.minOrderValue}
            onChange={(v) => s.set("minOrderValue", Number(v) || 0)}
          />
        </Field>
        <label className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
          <span className="font-medium">Accept cash on delivery</span>
          <Switch
            checked={s.values.codEnabled}
            onCheckedChange={(v) => s.set("codEnabled", v)}
          />
        </label>
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
          <span className="font-medium">Accept returns</span>
          <div className="flex items-center gap-2">
            {s.values.returnable ? (
              <>
                <Input
                  inputMode="numeric"
                  className="h-8 w-16"
                  value={s.values.returnWindowHours}
                  onChange={(e) =>
                    s.set(
                      "returnWindowHours",
                      Number(e.target.value.replace(/\D/g, "")) || 0,
                    )
                  }
                  aria-label="Return window in hours"
                />
                <span className="text-xs text-muted-foreground">hours</span>
              </>
            ) : null}
            <Switch
              checked={s.values.returnable}
              onCheckedChange={(v) => s.set("returnable", v)}
            />
          </div>
        </div>
      </div>
      <SaveBar dirty={s.dirty} saving={s.saving} onSave={() => s.save()} />
    </Section>
  );
}

function ComplianceSection({ store }: { store: StoreData }) {
  const s = useSection(store, [
    "legalName",
    "gstin",
    "fssaiLicense",
    "consumerCareName",
    "consumerCarePhone",
    "consumerCareEmail",
  ]);
  return (
    <Section
      id="compliance"
      title="Compliance"
      description="Required by ONDC and marketplaces. Kept private except where the law requires it on invoices and listings."
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Legal business name" hint="As on your GST registration.">
          <Input
            value={s.values.legalName}
            onChange={(e) => s.set("legalName", e.target.value)}
          />
        </Field>
        <Field label="GSTIN">
          <Input
            value={s.values.gstin}
            onChange={(e) => s.set("gstin", e.target.value.toUpperCase())}
            maxLength={15}
            className="font-mono"
            placeholder="29ABCDE1234F1Z5"
          />
        </Field>
        <Field
          label="FSSAI licence"
          hint="Needed if you sell food or groceries."
        >
          <Input
            value={s.values.fssaiLicense}
            onChange={(e) =>
              s.set("fssaiLicense", e.target.value.replace(/\D/g, ""))
            }
            maxLength={14}
            className="font-mono"
          />
        </Field>
        <div />
        <Field label="Customer care name">
          <Input
            value={s.values.consumerCareName}
            onChange={(e) => s.set("consumerCareName", e.target.value)}
            placeholder="Defaults to shop name"
          />
        </Field>
        <Field label="Customer care phone">
          <Input
            inputMode="tel"
            value={s.values.consumerCarePhone}
            onChange={(e) => s.set("consumerCarePhone", e.target.value)}
            placeholder="Defaults to shop phone"
          />
        </Field>
        <Field label="Customer care email">
          <Input
            type="email"
            value={s.values.consumerCareEmail}
            onChange={(e) => s.set("consumerCareEmail", e.target.value)}
            placeholder="Defaults to shop email"
          />
        </Field>
      </div>
      <SaveBar dirty={s.dirty} saving={s.saving} onSave={() => s.save()} />
    </Section>
  );
}

function PayoutSection({ store }: { store: StoreData }) {
  const s = useSection(store, ["bankAccountName", "bankIfsc", "upiId"]);
  const [account, setAccount] = useState("");
  return (
    <Section
      id="payouts"
      title="Payouts"
      description="Where ONDC buyer apps settle prepaid orders. Your account number is encrypted."
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field
          label="UPI ID"
          hint="Quickest option. Used instead of the bank account when set."
        >
          <Input
            value={s.values.upiId}
            onChange={(e) => s.set("upiId", e.target.value.trim())}
            placeholder="shopname@okaxis"
          />
        </Field>
        <Field label="Account holder name">
          <Input
            value={s.values.bankAccountName}
            onChange={(e) => s.set("bankAccountName", e.target.value)}
          />
        </Field>
        <Field
          label="Account number"
          hint={
            store.bankAccountLast4
              ? `Saved: ••••${store.bankAccountLast4}. Enter a new number to replace it.`
              : undefined
          }
        >
          <Input
            inputMode="numeric"
            value={account}
            onChange={(e) => setAccount(e.target.value.replace(/\D/g, ""))}
            autoComplete="off"
          />
        </Field>
        <Field label="IFSC">
          <Input
            value={s.values.bankIfsc}
            onChange={(e) => s.set("bankIfsc", e.target.value.toUpperCase())}
            maxLength={11}
            className="font-mono"
          />
        </Field>
      </div>
      <SaveBar
        dirty={s.dirty || account.length > 0}
        saving={s.saving}
        onSave={async () => {
          await s.save(account ? { bankAccountNumber: account } : undefined);
          setAccount("");
        }}
      />
    </Section>
  );
}

function PlanSection({
  plan,
  plans,
}: {
  plan: {
    name: string;
    label: string;
    status: string | null;
    nextBillingDate: string | null;
    usage: { label: string; used: number; limit: number; note?: string }[];
  };
  plans: {
    id: string;
    label: string;
    products: number;
    aiCredits: number;
    channels: number;
    models: number;
  }[];
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const upgrade = async (id: string) => {
    setBusy(id);
    try {
      const { url } = await api<{ url: string }>("/api/payments/checkout", {
        method: "POST",
        json: { plan: id },
      });
      window.location.assign(url);
    } catch (e) {
      toastError(e);
      setBusy(null);
    }
  };
  return (
    <Section id="plan" title="Plan & usage">
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-semibold">{plan.label}</span>
          {plan.name !== "FREE" && plan.status ? (
            <Pill tone="success">{plan.status}</Pill>
          ) : null}
          {plan.nextBillingDate ? (
            <span className="text-sm text-muted-foreground">
              Renews{" "}
              {new Date(plan.nextBillingDate).toLocaleDateString("en-IN", {
                dateStyle: "medium",
              })}
            </span>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {plan.usage.map((u) => (
            <div key={u.label}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span>{u.label}</span>
                <span className="text-muted-foreground tabular">
                  {num(u.used)} / {num(u.limit)}
                </span>
              </div>
              <Progress
                value={Math.min(100, (u.used / Math.max(1, u.limit)) * 100)}
                className="h-1.5"
              />
              {u.note ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  {u.note}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {plans.map((p) => {
            const current = p.id === plan.name;
            return (
              <div
                key={p.id}
                className={cn(
                  "rounded-xl border p-4",
                  current && "border-primary ring-1 ring-primary/30",
                )}
              >
                <div className="font-medium">{p.label}</div>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>{num(p.products)} products</li>
                  <li>{num(p.aiCredits)} AI credits / month</li>
                  <li>
                    {p.channels} marketplace{p.channels === 1 ? "" : "s"} + ONDC
                  </li>
                  <li>{p.models} try-on models</li>
                </ul>
                <div className="mt-3">
                  {current ? (
                    <Pill tone="primary">Current plan</Pill>
                  ) : p.id === "FREE" ? null : (
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={Boolean(busy)}
                      onClick={() => upgrade(p.id)}
                    >
                      {busy === p.id ? (
                        <Loader2 className="animate-spin" />
                      ) : null}{" "}
                      Upgrade
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

function AccountSection({
  account,
}: {
  account: { name: string; email: string };
}) {
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  return (
    <Section id="account" title="Account">
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <div className="font-medium">{account.name || "Your account"}</div>
          <div className="text-muted-foreground">{account.email}</div>
        </div>
        <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut /> Sign out
        </Button>
      </div>
      <div className="space-y-3 border-t bg-destructive/5 p-5">
        <div className="text-sm font-medium text-destructive">
          Delete account
        </div>
        <p className="text-sm text-muted-foreground">
          Permanently deletes your shop, catalog, orders and connections.
          Listings already on Shopify or Amazon stay there. Type{" "}
          <span className="font-mono">{account.email}</span> to confirm.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={account.email}
            className="sm:max-w-xs"
          />
          <Button
            variant="destructive"
            disabled={
              confirm.trim().toLowerCase() !== account.email.toLowerCase() ||
              deleting
            }
            onClick={async () => {
              setDeleting(true);
              try {
                await api("/api/account", {
                  method: "DELETE",
                  json: { confirm },
                });
                window.location.assign("/");
              } catch (e) {
                toastError(e);
                setDeleting(false);
              }
            }}
          >
            {deleting ? <Loader2 className="animate-spin" /> : null} Delete
            everything
          </Button>
        </div>
      </div>
    </Section>
  );
}
