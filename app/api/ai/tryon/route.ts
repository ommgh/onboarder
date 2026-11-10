import { z } from "zod";
import {
  consumeAiCredits,
  firstImage,
  gemini,
  IMAGE_MODEL,
  refundAiCredits,
} from "@/lib/server/ai";
import { TRYON_PROMPTS } from "@/lib/server/ai-prompts";
import { handler, ok, parseJson } from "@/lib/server/api";
import { requireUserId } from "@/lib/server/session";
import { imagePart, storeImage } from "@/lib/server/storage";

export const runtime = "nodejs";
export const maxDuration = 120;

const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("model"), person: z.string().min(20) }),
  z.object({
    action: z.literal("tryOn"),
    model: z.string().min(20),
    garment: z.string().min(20),
  }),
  z.object({
    action: z.literal("pose"),
    image: z.string().min(20),
    instruction: z.string().min(3).max(200),
  }),
]);

export const POST = handler(async (req: Request) => {
  const userId = await requireUserId();
  const body = await parseJson(req, input);
  await consumeAiCredits(userId, 2);
  try {
    const contents =
      body.action === "model"
        ? [await imagePart(body.person), { text: TRYON_PROMPTS.model }]
        : body.action === "tryOn"
          ? [
              await imagePart(body.model),
              await imagePart(body.garment),
              { text: TRYON_PROMPTS.tryOn },
            ]
          : [
              await imagePart(body.image),
              { text: TRYON_PROMPTS.pose(body.instruction) },
            ];
    const result = await gemini("model").models.generateContent({
      model: IMAGE_MODEL,
      contents,
      config: { responseModalities: ["TEXT", "IMAGE"] },
    });
    const img = firstImage(result);
    return ok({
      url: await storeImage(
        `data:${img.mimeType};base64,${img.data}`,
        body.action,
      ),
    });
  } catch (e) {
    await refundAiCredits(userId, 2);
    throw e;
  }
});
