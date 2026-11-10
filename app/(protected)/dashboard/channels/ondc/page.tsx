import type { Metadata } from "next";
import { appUrl } from "@/lib/config";
import { db } from "@/lib/db";
import { buildProvider, productDomain } from "@/lib/ondc/catalog";
import { productIssues, storeChecks } from "@/lib/ondc/readiness";
import {
  isOndcConfigured,
  ondcConfig,
  placeholderImage,
  toOndcProduct,
  toOndcStore,
} from "@/lib/ondc/server";
import { FOOD_CATEGORIES, ONDC_DOMAINS } from "@/lib/ondc/taxonomy";
import { getUserOrRedirect } from "@/lib/server/session";
import { ensureStore } from "@/lib/server/store";
import { OndcView } from "./ondc-view";

export const metadata: Metadata = { title: "ONDC" };

export default async function OndcPage() {
  const user = await getUserOrRedirect();
  const [store, products, orders] = await Promise.all([
    ensureStore(user.id),
    db.product.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
    }),
    db.order.aggregate({
      where: { userId: user.id, source: "ONDC", status: { not: "CANCELLED" } },
      _count: true,
      _sum: { total: true },
    }),
  ]);
  const s = toOndcStore(store);
  const ps = products.map(toOndcProduct);
  const sellsFood = ps.some(
    (p) => p.ondcCategory && FOOD_CATEGORIES.has(p.ondcCategory),
  );
  const checks = storeChecks(s, sellsFood);

  const withIssues = ps.map((p) => ({ p, issues: productIssues(p, s) }));
  const ready = withIssues.filter(
    (x) => !x.issues.some((i) => i.blocking) && productDomain(x.p),
  );
  const blocked = withIssues.filter((x) => x.issues.some((i) => i.blocking));
  const domainsInUse = new Set(ready.map((x) => productDomain(x.p)));

  const preview = buildProvider(
    s,
    ready.slice(0, 3).map((x) => x.p),
    {
      domain: [...domainsInUse][0] ?? "ONDC:RET10",
      placeholderImage,
      sellerAppName: "Onboarder",
      sellerAppSymbol: `${appUrl()}/favicon/web-app-manifest-512x512.png`,
    },
  );

  return (
    <OndcView
      store={{
        ondcEnabled: store.ondcEnabled,
        ondcDomains: store.ondcDomains,
        name: store.name,
        city: store.city,
        stdCode: store.stdCode,
      }}
      network={{ configured: isOndcConfigured(), env: ondcConfig().env }}
      checks={checks}
      domains={ONDC_DOMAINS.map((d) => ({
        code: d.code,
        label: d.label,
        products: ready.filter((x) => productDomain(x.p) === d.code).length,
      }))}
      products={{ total: ps.length, ready: ready.length }}
      blocked={blocked.slice(0, 25).map((x) => ({
        id: x.p.id,
        name: x.p.name,
        imageUrl: x.p.imageUrl,
        issue: x.issues.find((i) => i.blocking)?.message ?? "",
      }))}
      blockedCount={blocked.length}
      orders={{ count: orders._count, total: Number(orders._sum.total ?? 0) }}
      preview={JSON.stringify(preview, null, 2)}
    />
  );
}
