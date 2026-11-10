import { z } from "zod";
import {
  consumeAiCredits,
  gemini,
  parseModelJson,
  refundAiCredits,
  TEXT_MODEL,
} from "@/lib/server/ai";
import { DETECT_PROMPT } from "@/lib/server/ai-prompts";
import { handler, ok, parseJson } from "@/lib/server/api";
import { requireUserId } from "@/lib/server/session";
import { imagePart } from "@/lib/server/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const input = z.object({ image: z.string().min(20) });

export const POST = handler(async (req: Request) => {
  const userId = await requireUserId();
  const { image } = await parseJson(req, input);
  await consumeAiCredits(userId, 1);
  try {
    const result = await gemini("detection").models.generateContent({
      model: TEXT_MODEL,
      contents: [{ text: DETECT_PROMPT }, await imagePart(image)],
      config: { responseMimeType: "application/json" },
    });
    return ok({ detection: parseModelJson(result.text) });
  } catch (e) {
    await refundAiCredits(userId, 1);
    throw e;
  }
});
