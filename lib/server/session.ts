import "server-only";
import { redirect } from "next/navigation";
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

/** For route handlers and server actions: returns the user id or throws a 401. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new HttpError(401, "Please sign in to continue.", "UNAUTHENTICATED");
  return id;
}

/** For server components: redirects to login when signed out. */
export async function getUserOrRedirect() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  return session.user as typeof session.user & { id: string };
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
