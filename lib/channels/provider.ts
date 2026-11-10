import "server-only";
import type { MarketplaceProvider } from "@prisma/client";
import { HttpError } from "@/lib/server/session";

export function parseProvider(
  raw: string,
): Extract<MarketplaceProvider, "SHOPIFY" | "AMAZON"> {
  const p = raw.toUpperCase();
  if (p === "SHOPIFY" || p === "AMAZON") return p;
  throw new HttpError(404, "Unknown channel.");
}
