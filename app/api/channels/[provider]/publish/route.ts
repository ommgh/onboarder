import { z } from "zod";
import { publishToAmazon } from "@/lib/channels/amazon";
import { parseProvider } from "@/lib/channels/provider";
import { publishToShopify } from "@/lib/channels/shopify";
import { db } from "@/lib/db";
import { handler, ok, parseJson } from "@/lib/server/api";
import { requireUserId } from "@/lib/server/session";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby limit

// POST /api/channels/:provider/publish { productIds } -> per-product results
export const POST = handler(
  async (req: Request, ctx: { params: Promise<{ provider: string }> }) => {
    const userId = await requireUserId();
    const provider = parseProvider((await ctx.params).provider);
    const { productIds } = await parseJson(
      req,
      // Capped so one request finishes within the 60s function limit.
      z.object({ productIds: z.array(z.string()).min(1).max(25) }),
    );
    let products = await db.product.findMany({
      where: { userId, id: { in: productIds }, status: { not: "ARCHIVED" } },
    });
    // Publishing one pack size publishes its siblings too, so variants stay together.
    const groups = [
      ...new Set(products.map((p) => p.variantGroup).filter(Boolean)),
    ] as string[];
    if (provider === "SHOPIFY" && groups.length) {
      products = await db.product.findMany({
        where: {
          userId,
          status: { not: "ARCHIVED" },
          OR: [{ id: { in: productIds } }, { variantGroup: { in: groups } }],
        },
      });
    }
    const results =
      provider === "SHOPIFY"
        ? await publishToShopify(userId, products)
        : await publishToAmazon(userId, products);
    const now = new Date();
    await db.$transaction(
      results.map((r) =>
        db.channelListing.upsert({
          where: { productId_provider: { productId: r.productId, provider } },
          create: {
            productId: r.productId,
            provider,
            status: r.ok ? "LIVE" : "NEEDS_ACTION",
            externalId: r.externalId,
            externalUrl: r.externalUrl,
            message: r.message,
            syncedAt: now,
          },
          update: {
            status: r.ok ? "LIVE" : "NEEDS_ACTION",
            message: r.message ?? null,
            syncedAt: now,
            ...(r.externalId
              ? { externalId: r.externalId, externalUrl: r.externalUrl }
              : {}),
          },
        }),
      ),
    );
    return ok({
      results,
      published: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
    });
  },
);
