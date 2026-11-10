import { z } from "zod";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { handler, ok, parseJson } from "@/lib/server/api";
import { HttpError } from "@/lib/server/session";

// Permanently deletes the account and everything it owns (cascades through the schema).
export const DELETE = handler(async (req: Request) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new HttpError(401, "Please sign in.");
  const { confirm } = await parseJson(req, z.object({ confirm: z.string() }));
  if (
    confirm.trim().toLowerCase() !== (session.user.email ?? "").toLowerCase()
  ) {
    throw new HttpError(400, "Type your email address exactly to confirm.");
  }
  await db.user.delete({ where: { id: userId } });
  await signOut({ redirect: false }).catch(() => undefined);
  return ok({ deleted: true });
});
