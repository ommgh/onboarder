import { z } from "zod";
import { db } from "@/lib/db";
import { formatQuantity } from "@/lib/products/units";
import {
  consumeAiCredits,
  firstImage,
  gemini,
  IMAGE_MODEL,
  refundAiCredits,
} from "@/lib/server/ai";
import { photoPrompt } from "@/lib/server/ai-prompts";
import { handler, ok, parseJson } from "@/lib/server/api";
import { HttpError, requireUserId } from "@/lib/server/session";
import { storeImage } from "@/lib/server/storage";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby limit

// Generates a photo for a product that has none (typically loose staples) and applies it
// to every pack size in the same variant group.
const input = z.object({ productId: z.string() });

export const POST = handler(async (req: Request) => {
  const userId = await requireUserId();
  const { productId } = await parseJson(req, input);
  const product = await db.product.findFirst({
    where: { id: productId, userId },
  });
  if (!product) throw new HttpError(404, "Product not found.");
  await consumeAiCredits(userId, 2);
  try {
    const baseName = product.variantGroup
      ? product.name.replace(/\s*[-–]\s*[\d.]+\s*\w+$/, "")
      : product.name;
    const result = await gemini("generation").models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        {
          text: photoPrompt(
            baseName,
            product.variantGroup
              ? undefined
              : formatQuantity(Number(product.unitValue), product.unit),
          ),
        },
      ],
      config: { responseModalities: ["TEXT", "IMAGE"] },
    });
    const img = firstImage(result);
    const url = await storeImage(
      `data:${img.mimeType};base64,${img.data}`,
      baseName,
    );
    const r = await db.product.updateMany({
      where: product.variantGroup
        ? { userId, variantGroup: product.variantGroup, imageUrl: "" }
        : { id: product.id },
      data: { imageUrl: url, aiGenerated: true },
    });
    return ok({ url, updated: r.count });
  } catch (e) {
    await refundAiCredits(userId, 2);
    throw e;
  }
});
