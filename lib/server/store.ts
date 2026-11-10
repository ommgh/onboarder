import "server-only";
import type { Prisma, Store } from "@prisma/client";
import { db } from "@/lib/db";

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "shop"
  );
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const clash = await db.store.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash || clash.id === excludeId) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function getStore(userId: string): Promise<Store | null> {
  return db.store.findUnique({ where: { userId } });
}

/** Returns the user's store, creating a sensible default the first time. */
export async function ensureStore(userId: string): Promise<Store> {
  const existing = await getStore(userId);
  if (existing) return existing;
  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  const name = user?.name ? `${user.name.split(" ")[0]}'s Store` : "My Store";
  return db.store.create({
    data: { userId, name, slug: await uniqueSlug(name), email: user?.email ?? null },
  });
}

export async function updateStore(userId: string, data: Prisma.StoreUpdateInput & { name?: string; slug?: string }) {
  const store = await ensureStore(userId);
  const next = { ...data };
  if (typeof data.slug === "string" && data.slug !== store.slug) {
    next.slug = await uniqueSlug(data.slug, store.id);
  }
  return db.store.update({ where: { id: store.id }, data: next });
}
