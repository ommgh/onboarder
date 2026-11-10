import { z } from "zod";
import { db } from "@/lib/db";
import { handler, ok, parseJson } from "@/lib/server/api";
import { nextOrderNumber } from "@/lib/server/orders";
import { HttpError, requireUserId } from "@/lib/server/session";

// Manual orders let a shop log phone / WhatsApp / counter sales so stock and analytics stay true.
const input = z.object({
  customerName: z.string().trim().max(120).optional(),
  customerPhone: z.string().trim().max(20).optional(),
  customerAddress: z.string().trim().max(300).optional(),
  paymentMethod: z.enum(["CASH", "UPI", "COD", "PREPAID"]).default("CASH"),
  paid: z.boolean().default(true),
  deliveryFee: z.number().min(0).default(0),
  notes: z.string().max(500).optional(),
  items: z
    .array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(10000) }))
    .min(1, "Add at least one item"),
});

export const POST = handler(async (req: Request) => {
  const userId = await requireUserId();
  const body = await parseJson(req, input);
  const products = await db.product.findMany({
    where: { userId, id: { in: body.items.map((i) => i.productId) } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = body.items.map((i) => {
    const p = byId.get(i.productId);
    if (!p) throw new HttpError(400, "One of the items is no longer in your catalog.");
    if (p.price === null) throw new HttpError(400, `Set a price for “${p.name}” first.`);
    if (p.stock !== null && p.stock < i.quantity) throw new HttpError(409, `Only ${p.stock} of “${p.name}” in stock.`);
    return { p, quantity: i.quantity, price: Number(p.price) };
  });
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const order = await db.$transaction(async (tx) => {
    for (const l of lines) {
      if (l.p.stock !== null) await tx.product.update({ where: { id: l.p.id }, data: { stock: { decrement: l.quantity } } });
    }
    return tx.order.create({
      data: {
        userId,
        orderNumber: await nextOrderNumber(tx),
        source: "MANUAL",
        status: "DELIVERED",
        paymentMethod: body.paymentMethod,
        paymentStatus: body.paid ? "PAID" : "PENDING",
        customerName: body.customerName || null,
        customerPhone: body.customerPhone || null,
        customerAddress: body.customerAddress || null,
        notes: body.notes || null,
        subtotal,
        deliveryFee: body.deliveryFee,
        total: subtotal + body.deliveryFee,
        items: {
          create: lines.map((l) => ({ productId: l.p.id, name: l.p.name, sku: l.p.sku, quantity: l.quantity, price: l.price })),
        },
      },
    });
  });
  return ok({ order: { id: order.id, orderNumber: order.orderNumber } }, { status: 201 });
});
