import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { cancelOrder, pushOrderUpdate } from "@/lib/ondc/handlers";
import { handler, ok, parseJson } from "@/lib/server/api";
import { HttpError, requireUserId } from "@/lib/server/session";

const FLOW = ["CREATED", "ACCEPTED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"] as const;
const input = z.object({
  status: z.enum(["CREATED", "ACCEPTED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED"]).optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "REFUNDED"]).optional(),
});

export const PATCH = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const userId = await requireUserId();
  const { id } = await ctx.params;
  const body = await parseJson(req, input);
  const order = await db.order.findFirst({ where: { id, userId } });
  if (!order) throw new HttpError(404, "Order not found.");
  if (order.status === "CANCELLED") throw new HttpError(409, "This order was cancelled.");

  if (body.status === "CANCELLED") {
    if (["DELIVERED", "RETURNED"].includes(order.status)) throw new HttpError(409, "Delivered orders can't be cancelled.");
    await cancelOrder(id, { cancelled_by: "seller", reason: { id: "002" } });
  } else if (body.status) {
    const from = FLOW.indexOf(order.status as (typeof FLOW)[number]);
    const to = FLOW.indexOf(body.status as (typeof FLOW)[number]);
    if (body.status !== "RETURNED" && to !== -1 && from !== -1 && to < from) {
      throw new HttpError(409, "Orders can only move forward.");
    }
    await db.order.update({ where: { id }, data: { status: body.status } });
  }
  if (body.paymentStatus) await db.order.update({ where: { id }, data: { paymentStatus: body.paymentStatus } });

  // Keep the buyer app informed for network orders.
  if (order.source === "ONDC" && body.status) after(() => pushOrderUpdate(id).then(() => undefined));
  return ok({ updated: true });
});
