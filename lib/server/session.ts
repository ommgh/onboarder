import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { limitsFor } from "@/lib/plans";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

/**
 * The signed-in user, verified to still exist. A JWT session outlives its user when the
 * account is deleted from another device, so the token alone is not enough.
 */
const currentUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const exists = await db.user.findUnique({
    where: { id },
    select: { id: true },
  });
  return exists ? (session.user as typeof session.user & { id: string }) : null;
});

/** For route handlers and server actions: returns the user id or throws a 401. */
export async function requireUserId(): Promise<string> {
  const user = await currentUser();
  if (!user)
    throw new HttpError(401, "Please sign in to continue.", "UNAUTHENTICATED");
  return user.id;
}

/** For server components: redirects to login when signed out or the account is gone. */
export async function getUserOrRedirect() {
  const user = await currentUser();
  if (!user) redirect("/auth/login?expired=1");
  return user;
}

export async function getSubscription(userId: string) {
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (sub) return sub;
  return db.subscription.create({ data: { userId } });
}

export async function getPlan(userId: string) {
  const sub = await getSubscription(userId);
  return { subscription: sub, limits: limitsFor(sub.name) };
}
