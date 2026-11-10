import { AppShell } from "@/components/app/shell/app-shell";
import { db } from "@/lib/db";
import { getPlan, getUserOrRedirect } from "@/lib/server/session";
import { ensureStore } from "@/lib/server/store";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserOrRedirect();
  const [store, { subscription, limits }, openOrders] = await Promise.all([
    ensureStore(user.id),
    getPlan(user.id),
    db.order.count({
      where: {
        userId: user.id,
        status: { in: ["CREATED", "ACCEPTED", "PACKED"] },
      },
    }),
  ]);
  return (
    <AppShell
      user={{
        name: user.name ?? "",
        email: user.email ?? "",
        image: user.image ?? null,
      }}
      store={{
        name: store.name,
        slug: store.slug,
        logoUrl: store.logoUrl,
        ondcEnabled: store.ondcEnabled,
      }}
      plan={limits.label}
      isFree={subscription.name === "FREE"}
      openOrders={openOrders}
    >
      {children}
    </AppShell>
  );
}
