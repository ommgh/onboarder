import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { storeChecks } from "@/lib/ondc/readiness";
import { toOndcStore } from "@/lib/ondc/server";
import { FOOD_CATEGORIES } from "@/lib/ondc/taxonomy";
import { storeInput } from "@/lib/store-schema";
import { handler, ok, parseJson } from "@/lib/server/api";
import { encrypt } from "@/lib/server/crypto";
import { HttpError, requireUserId } from "@/lib/server/session";
import { ensureStore, updateStore } from "@/lib/server/store";

function publicStore(s: Awaited<ReturnType<typeof ensureStore>>) {
  const { bankAccountEncrypted: _omit, ...rest } = s;
  return { ...rest, deliveryFee: Number(s.deliveryFee), minOrderValue: Number(s.minOrderValue) };
}

export const GET = handler(async () => {
  const userId = await requireUserId();
  return ok({ store: publicStore(await ensureStore(userId)) });
});

export const PATCH = handler(async (req: Request) => {
  const userId = await requireUserId();
  const { bankAccountNumber, ...input } = await parseJson(req, storeInput);
  const data: Prisma.StoreUpdateInput = { ...input };
  if (bankAccountNumber !== undefined) {
    data.bankAccountEncrypted = bankAccountNumber ? encrypt(bankAccountNumber) : null;
    data.bankAccountLast4 = bankAccountNumber ? bankAccountNumber.slice(-4) : null;
  }

  // Going live on ONDC requires a complete, compliant store profile.
  if (input.ondcEnabled) {
    const current = await ensureStore(userId);
    const merged = toOndcStore({ ...current, ...(input as object) } as typeof current);
    const sellsFood = Boolean(
      await db.product.findFirst({
        where: { userId, status: "ACTIVE", ondcCategory: { in: [...FOOD_CATEGORIES] } },
        select: { id: true },
      }),
    );
    const missing = storeChecks(merged, sellsFood).filter((c) => !c.ok);
    if (missing.length) {
      throw new HttpError(422, `Before going live on ONDC, add: ${missing.map((m) => m.label.toLowerCase()).join(", ")}.`);
    }
  }
  return ok({ store: publicStore(await updateStore(userId, data as never)) });
});
