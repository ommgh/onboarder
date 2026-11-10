import type { Metadata } from "next";
import { getUserOrRedirect } from "@/lib/server/session";
import { ensureStore } from "@/lib/server/store";
import { BrandView, type Kit } from "./brand-view";

export const metadata: Metadata = { title: "Brand kit" };

export default async function BrandPage() {
  const user = await getUserOrRedirect();
  const store = await ensureStore(user.id);
  return (
    <BrandView
      kit={(store.brandKit as Kit | null) ?? null}
      store={{
        name: store.name,
        city: store.city,
        tagline: store.tagline,
        brandColor: store.brandColor,
        logoUrl: store.logoUrl,
        slug: store.slug,
      }}
    />
  );
}
