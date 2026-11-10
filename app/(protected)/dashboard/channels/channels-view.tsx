"use client";

import { Check, Copy, Download, ExternalLink, Loader2, Store } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, toastError } from "@/components/app/api";
import { PageHeader } from "@/components/app/page-header";
import { Pill } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ChannelId, ChannelInfo } from "@/lib/channels/catalog";
import { num, timeAgo } from "@/lib/format";

interface ChannelState {
  connected: boolean;
  configured: boolean;
  account: string | null;
  lastSyncAt: string | null;
  live: number;
  issues: number;
}

export function ChannelsView({ channels, state, storefront, channelLimit, planLabel }: {
  channels: ChannelInfo[];
  state: Record<ChannelId, ChannelState>;
  storefront: { slug: string; enabled: boolean };
  channelLimit: number;
  planLabel: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [shopifyOpen, setShopifyOpen] = useState(false);
  const [shop, setShop] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const storeUrl = typeof window !== "undefined" ? `${window.location.origin}/s/${storefront.slug}` : `/s/${storefront.slug}`;

  useEffect(() => {
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected) toast.success(`${connected === "shopify" ? "Shopify" : "Amazon"} connected. Publish products from your catalog.`);
    if (error) toast.error(error);
    if (connected || error) router.replace("/dashboard/channels");
  }, [params, router]);

  const connect = async (provider: "shopify" | "amazon", body?: object) => {
    setBusy(provider);
    try {
      const { url } = await api<{ url: string }>(`/api/channels/${provider}/connect`, { method: "POST", json: body ?? {} });
      window.location.assign(url);
    } catch (e) {
      toastError(e);
      setBusy(null);
    }
  };

  const disconnect = async (provider: "shopify" | "amazon") => {
    setBusy(provider);
    try {
      await api(`/api/channels/${provider}`, { method: "DELETE" });
      toast.success("Disconnected");
      router.refresh();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(null);
    }
  };

  const connectedMarketplaces = (["SHOPIFY", "AMAZON"] as const).filter((p) => state[p].connected).length;

  return (
    <>
      <PageHeader
        title="Channels"
        description={`Where your products are sold. ONDC and your storefront are free; your ${planLabel} plan includes ${channelLimit} marketplace connection${channelLimit === 1 ? "" : "s"} (${connectedMarketplaces} used).`}
      />

      <div className="mb-6 flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Store className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium">Your storefront</div>
          <div className="truncate text-sm text-muted-foreground">
            A free web shop with WhatsApp ordering. Share the link on your WhatsApp status, Google Business profile or shop board.
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(storeUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check /> : <Copy />} Copy link
          </Button>
          <Button asChild variant="outline">
            <a href={`/s/${storefront.slug}`} target="_blank" rel="noreferrer">
              Open <ExternalLink />
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {channels.map((c) => {
          const s = state[c.id];
          return (
            <div key={c.id} className="flex flex-col rounded-xl border bg-card">
              <div className="flex items-start gap-4 p-5">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white p-2">
                  <img src={c.logo} alt="" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{c.name}</h2>
                    {s.connected ? (
                      <Pill tone="success" dot>
                        {c.id === "ONDC" ? "Live" : "Connected"}
                      </Pill>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{c.tagline}</p>
                </div>
              </div>
              <div className="flex-1 px-5 pb-4 text-sm">
                <div className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">{c.modeLabel}</div>
                <p className="text-muted-foreground">{c.detail}</p>
                {s.connected ? (
                  <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground">{c.id === "ONDC" ? "Store" : "Account"}</dt>
                      <dd className="truncate font-medium">{s.account}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Live products</dt>
                      <dd className="font-medium tabular">{num(s.live)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{s.issues ? "Need action" : "Last sync"}</dt>
                      <dd className={s.issues ? "font-medium text-destructive" : "font-medium"}>
                        {s.issues ? (
                          <Link href="/dashboard/catalog?filter=needs-action" className="underline">
                            {s.issues}
                          </Link>
                        ) : s.lastSyncAt ? (
                          timeAgo(s.lastSyncAt)
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                  </dl>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 border-t px-5 py-3">
                {c.id === "ONDC" ? (
                  <Button asChild variant={s.connected ? "outline" : "default"}>
                    <Link href="/dashboard/channels/ondc">{s.connected ? "Manage ONDC" : "Go live on ONDC"}</Link>
                  </Button>
                ) : c.id === "FLIPKART" ? (
                  <>
                    <Button asChild variant="outline">
                      <a href="/api/products/export?format=flipkart">
                        <Download /> Download listing sheet
                      </a>
                    </Button>
                    <Button asChild variant="ghost">
                      <a href="https://seller.flipkart.com" target="_blank" rel="noreferrer">
                        Seller Hub <ExternalLink />
                      </a>
                    </Button>
                  </>
                ) : !s.configured ? (
                  <p className="text-xs text-muted-foreground">Not available yet. The {c.name} app is awaiting approval.</p>
                ) : s.connected ? (
                  <>
                    <Button asChild variant="outline">
                      <Link href="/dashboard/catalog">Publish products</Link>
                    </Button>
                    <Button variant="ghost" disabled={busy !== null} onClick={() => disconnect(c.id === "SHOPIFY" ? "shopify" : "amazon")}>
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    disabled={busy !== null}
                    onClick={() => (c.id === "SHOPIFY" ? setShopifyOpen(true) : connect("amazon"))}
                  >
                    {busy === c.id.toLowerCase() ? <Loader2 className="animate-spin" /> : null} Connect {c.name}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={shopifyOpen} onOpenChange={setShopifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect your Shopify store</DialogTitle>
            <DialogDescription>
              Enter your store's Shopify address. You'll approve access on Shopify and come straight back here.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              connect("shopify", { shop });
            }}
            className="space-y-2"
          >
            <div className="flex items-center rounded-md border focus-within:ring-[3px] focus-within:ring-ring/50">
              <Input value={shop} onChange={(e) => setShop(e.target.value)} placeholder="your-store" className="border-0 shadow-none focus-visible:ring-0" autoFocus />
              <span className="pr-3 text-sm text-muted-foreground">.myshopify.com</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Don't have a Shopify store?{" "}
              <a href="https://www.shopify.com/in/free-trial" target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                Start one
              </a>
              , then come back.
            </p>
            <DialogFooter>
              <Button type="submit" disabled={!shop.trim() || busy === "shopify"}>
                {busy === "shopify" ? <Loader2 className="animate-spin" /> : null} Continue to Shopify
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
