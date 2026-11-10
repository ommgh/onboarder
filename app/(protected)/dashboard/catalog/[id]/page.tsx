import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/app/product-editor";
import { db } from "@/lib/db";
import { toProductDTO } from "@/lib/products/serialize";
import { getUserOrRedirect } from "@/lib/server/session";
import { ensureStore } from "@/lib/server/store";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await db.product.findUnique({ where: { id: (await params).id }, select: { name: true } });
  return { title: p?.name ?? "Product" };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUserOrRedirect();
  const { id } = await params;
  const [product, store, connections] = await Promise.all([
    db.product.findFirst({ where: { id, userId: user.id }, include: { listings: true } }),
    ensureStore(user.id),
    db.marketplaceConnection.findMany({ where: { userId: user.id }, select: { provider: true } }),
  ]);
  if (!product) notFound();
  const has = (p: string) => connections.some((c) => c.provider === p);
  return (
    <ProductEditor
      key={product.updatedAt.toISOString()}
      product={toProductDTO(product)}
      store={{ fssaiLicense: store.fssaiLicense, ondcEnabled: store.ondcEnabled }}
      connected={{ SHOPIFY: has("SHOPIFY"), AMAZON: has("AMAZON") }}
    />
  );
}
