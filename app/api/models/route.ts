import { z } from "zod";
import { db } from "@/lib/db";
import { handler, ok, parseJson } from "@/lib/server/api";
import { getPlan, HttpError, requireUserId } from "@/lib/server/session";

export const GET = handler(async () => {
  const userId = await requireUserId();
  const models = await db.models.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return ok({ models });
});

export const POST = handler(async (req: Request) => {
  const userId = await requireUserId();
  const { name, imageUrl } = await parseJson(
    req,
    z.object({
      name: z.string().trim().min(1).max(60),
      imageUrl: z.string().url(),
    }),
  );
  const [{ limits }, count] = await Promise.all([
    getPlan(userId),
    db.models.count({ where: { userId } }),
  ]);
  if (count >= limits.models) {
    throw new HttpError(
      402,
      `Your ${limits.label} plan includes ${limits.models} models. Delete one or upgrade.`,
      "MODEL_LIMIT",
    );
  }
  return ok(
    { model: await db.models.create({ data: { name, imageUrl, userId } }) },
    { status: 201 },
  );
});
