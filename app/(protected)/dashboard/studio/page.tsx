import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { getPlan, getUserOrRedirect } from "@/lib/server/session";
import { StudioView } from "./studio-view";

export const metadata: Metadata = { title: "Photo studio" };

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const user = await getUserOrRedirect();
  const { product: productId } = await searchParams;
  const [models, { limits }, product] = await Promise.all([
    db.models.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, imageUrl: true } }),
    getPlan(user.id),
    productId ? db.product.findFirst({ where: { id: productId, userId: user.id }, select: { id: true, name: true, imageUrl: true, images: true } }) : null,
  ]);
  return (
    <Suspense>
      <StudioView models={models} modelLimit={limits.models} product={product} />
    </Suspense>
  );
}
