import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { getPlan, getUserOrRedirect } from "@/lib/server/session";
import { CatalogView } from "./catalog-view";

export const metadata: Metadata = { title: "Catalog" };

export default async function CatalogPage() {
  const user = await getUserOrRedirect();
  const [connections, { limits }] = await Promise.all([
    db.marketplaceConnection.findMany({
      where: { userId: user.id },
      select: { provider: true },
    }),
    getPlan(user.id),
  ]);
  const has = (p: string) => connections.some((c) => c.provider === p);
  return (
    <Suspense>
      <CatalogView
        connected={{ SHOPIFY: has("SHOPIFY"), AMAZON: has("AMAZON") }}
        limit={limits.products}
      />
    </Suspense>
  );
}
