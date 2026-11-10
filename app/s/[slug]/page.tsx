import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { formatQuantity } from "@/lib/products/units";
import { Storefront, type StorefrontGroup } from "./storefront";

const getStore = cache((slug: string) =>
  db.store.findUnique({ where: { slug } }),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const store = await getStore((await params).slug);
  if (!store || !store.storefrontEnabled) return { title: "Shop not found" };
  const description =
    store.tagline ?? store.description ?? `Order from ${store.name} online.`;
  return {
    title: { absolute: `${store.name}${store.city ? ` · ${store.city}` : ""}` },
    description,
    openGraph: {
      title: store.name,
      description,
      images: store.logoUrl ? [store.logoUrl] : undefined,
    },
  };
}

function openNow(store: {
  openTime: string;
  closeTime: string;
  openDays: string;
}) {
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  const day = ist.getUTCDay() === 0 ? 7 : ist.getUTCDay();
  const hhmm = ist.getUTCHours() * 100 + ist.getUTCMinutes();
  return (
    store.openDays.split(",").includes(String(day)) &&
    hhmm >= Number(store.openTime) &&
    hhmm < Number(store.closeTime)
  );
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const store = await getStore((await params).slug);
  if (!store || !store.storefrontEnabled) notFound();
  const products = await db.product.findMany({
    where: { userId: store.userId, status: "ACTIVE", price: { not: null } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    take: 1000,
  });

  // Collapse pack sizes into one card.
  const groups = new Map<string, StorefrontGroup>();
  for (const p of products) {
    const key = p.variantGroup ?? p.id;
    const g = groups.get(key) ?? {
      key,
      name: p.variantGroup
        ? p.name.replace(/\s*[-–]\s*[\d.]+\s*\w+$/, "")
        : p.name,
      description: p.description,
      imageUrl: p.imageUrl || p.images[0] || "",
      category: p.ondcCategory ?? p.category,
      vegType: p.vegType,
      options: [],
    };
    if (!g.imageUrl && p.imageUrl) g.imageUrl = p.imageUrl;
    g.options.push({
      id: p.id,
      label:
        p.variantLabel ??
        formatQuantity(p.unitValue ? Number(p.unitValue) : null, p.unit) ??
        "",
      price: Number(p.price),
      mrp: p.mrp ? Number(p.mrp) : null,
      inStock: p.stock === null || p.stock > 0,
    });
    groups.set(key, g);
  }

  return (
    <Storefront
      store={{
        name: store.name,
        tagline: store.tagline,
        description: store.description,
        logoUrl: store.logoUrl,
        brandColor: store.brandColor,
        whatsapp: (store.whatsapp || store.phone || "")
          .replace(/\D/g, "")
          .slice(-10),
        phone: store.phone,
        address: [store.addressLine, store.locality, store.city, store.pincode]
          .filter(Boolean)
          .join(", "),
        hours: `${store.openTime.slice(0, 2)}:${store.openTime.slice(2)}–${store.closeTime.slice(0, 2)}:${store.closeTime.slice(2)}`,
        open: openNow(store),
        delivery: store.deliveryEnabled,
        pickup: store.pickupEnabled,
        deliveryFee: Number(store.deliveryFee),
        minOrderValue: Number(store.minOrderValue),
        mapUrl:
          store.latitude != null
            ? `https://maps.google.com/?q=${store.latitude},${store.longitude}`
            : null,
      }}
      groups={[...groups.values()]}
    />
  );
}
