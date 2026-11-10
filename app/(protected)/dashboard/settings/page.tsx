import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { AI_PERIOD_MS, PLAN_LIMITS } from "@/lib/plans";
import { getPlan, getUserOrRedirect } from "@/lib/server/session";
import { ensureStore } from "@/lib/server/store";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getUserOrRedirect();
  const [store, { subscription, limits }, products, models, connections] =
    await Promise.all([
      ensureStore(user.id),
      getPlan(user.id),
      db.product.count({
        where: { userId: user.id, status: { not: "ARCHIVED" } },
      }),
      db.models.count({ where: { userId: user.id } }),
      db.marketplaceConnection.count({ where: { userId: user.id } }),
    ]);
  const { bankAccountEncrypted: _secret, ...rest } = store;
  const aiResetsAt = new Date(
    subscription.aiPeriodStart.getTime() + AI_PERIOD_MS,
  );
  const aiUsed = aiResetsAt < new Date() ? 0 : subscription.aiCreditsUsed;
  return (
    <Suspense>
      <SettingsView
        store={{
          ...rest,
          deliveryFee: Number(store.deliveryFee),
          minOrderValue: Number(store.minOrderValue),
          createdAt: "",
          updatedAt: "",
          brandKit: null,
        }}
        account={{ name: user.name ?? "", email: user.email ?? "" }}
        plan={{
          name: subscription.name,
          label: limits.label,
          status: subscription.status,
          nextBillingDate: subscription.nextBillingDate,
          usage: [
            { label: "Products", used: products, limit: limits.products },
            {
              label: "AI credits this month",
              used: aiUsed,
              limit: limits.aiCredits,
              note: `Resets ${aiResetsAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
            },
            {
              label: "Marketplace connections",
              used: connections,
              limit: limits.channels,
            },
            { label: "Try-on models", used: models, limit: limits.models },
          ],
        }}
        plans={Object.entries(PLAN_LIMITS).map(([id, l]) => ({ id, ...l }))}
      />
    </Suspense>
  );
}
