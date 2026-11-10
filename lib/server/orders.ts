import "server-only";
import { randomInt } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I, easy to read out on a call

/** Short, human-friendly order number like "OB-7K3QX9". */
export async function nextOrderNumber(
  tx: PrismaClient | Prisma.TransactionClient,
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
    const orderNumber = `OB-${code}`;
    const clash = await tx.order.findUnique({
      where: { orderNumber },
      select: { id: true },
    });
    if (!clash) return orderNumber;
  }
  throw new Error("Could not allocate an order number");
}
