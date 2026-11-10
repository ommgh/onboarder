import { z } from "zod";
import {
  consumeAiCredits,
  firstImage,
  gemini,
  IMAGE_MODEL,
  refundAiCredits,
} from "@/lib/server/ai";
import { ENHANCE_DEFAULT } from "@/lib/server/ai-prompts";
import { handler, ok, parseJson } from "@/lib/server/api";
import { requireUserId } from "@/lib/server/session";
import { imagePart, storeImage } from "@/lib/server/storage";

export const runtime = "nodejs";
export const maxDuration = 120;

const input = z.object({
  image: z.string().min(20),
  prompt: z.string().max(2000).optional(),
  name: z.string().max(80).optional(),
});

export const POST = handler(async (req: Request) => {
  const userId = await requireUserId();
  const { image, prompt, name } = await parseJson(req, input);
  await consumeAiCredits(userId, 2);
  try {
    const result = await gemini("generation").models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        {
          text: `${ENHANCE_DEFAULT}\n\nSpecific direction for this product: ${prompt ?? "none"}`,
        },
        await imagePart(image),
      ],
      config: { responseModalities: ["TEXT", "IMAGE"] },
    });
    const img = firstImage(result);
    const url = await storeImage(
      `data:${img.mimeType};base64,${img.data}`,
      name ?? "enhanced",
    );
    return ok({ url });
  } catch (e) {
    await refundAiCredits(userId, 2);
    throw e;
  }
});
