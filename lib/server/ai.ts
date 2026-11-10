import "server-only";
import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/db";
import { AI_PERIOD_MS, limitsFor } from "@/lib/plans";
import { HttpError } from "./session";

// One client per purpose so keys can be split for quota/billing, falling back to a single key.
const clients = new Map<string, GoogleGenAI>();
export function gemini(
  purpose: "detection" | "generation" | "model" = "generation",
) {
  const envName = {
    detection: "GEMINI_DETECTION_API_KEY",
    generation: "GEMINI_GENERATION_API_KEY",
    model: "GEMINI_MODEL_API_KEY",
  }[purpose];
  const apiKey = process.env[envName] ?? process.env.GEMINI_API_KEY;
  if (!apiKey)
    throw new HttpError(
      503,
      "AI is not configured on this server.",
      "AI_UNCONFIGURED",
    );
  let client = clients.get(apiKey);
  if (!client) {
    client = new GoogleGenAI({ apiKey });
    clients.set(apiKey, client);
  }
  return client;
}

export const TEXT_MODEL =
  process.env.GEMINI_TEXT_MODEL ?? "gemini-3.1-flash-lite";
export const IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image-preview";

/**
 * Reserve `cost` AI credits for a user, resetting the rolling 30-day window when it has
 * elapsed. Throws 402 when the plan's allowance is used up. Call before the model call.
 */
export async function consumeAiCredits(userId: string, cost = 1) {
  const sub =
    (await db.subscription.findUnique({ where: { userId } })) ??
    (await db.subscription.create({ data: { userId } }));
  const limit = limitsFor(sub.name).aiCredits;
  const periodExpired = Date.now() - sub.aiPeriodStart.getTime() > AI_PERIOD_MS;
  const used = periodExpired ? 0 : sub.aiCreditsUsed;
  if (used + cost > limit) {
    throw new HttpError(
      402,
      `You've used all ${limit} AI credits on your plan this month. Upgrade for more.`,
      "AI_CREDITS_EXHAUSTED",
    );
  }
  await db.subscription.update({
    where: { userId },
    data: periodExpired
      ? { aiCreditsUsed: cost, aiPeriodStart: new Date() }
      : { aiCreditsUsed: { increment: cost } },
  });
}

/** Give credits back when the model call fails, so users aren't charged for errors. */
export async function refundAiCredits(userId: string, cost = 1) {
  await db.subscription
    .update({ where: { userId }, data: { aiCreditsUsed: { decrement: cost } } })
    .catch(() => undefined);
}

/** Extracts and parses the first JSON object from a model text response. */
export function parseModelJson<T>(text: string | undefined | null): T {
  if (!text)
    throw new HttpError(
      502,
      "The AI returned an empty response. Please try again.",
    );
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  try {
    return JSON.parse(
      start >= 0 ? cleaned.slice(start, end + 1) : cleaned,
    ) as T;
  } catch {
    throw new HttpError(
      502,
      "The AI response could not be read. Please try again.",
    );
  }
}

export function firstImage(response: {
  candidates?: {
    content?: {
      parts?: { inlineData?: { data?: string; mimeType?: string } }[];
    };
  }[];
}): { data: string; mimeType: string } {
  for (const c of response.candidates ?? []) {
    for (const p of c.content?.parts ?? []) {
      if (p.inlineData?.data) {
        return {
          data: p.inlineData.data,
          mimeType: p.inlineData.mimeType ?? "image/png",
        };
      }
    }
  }
  throw new HttpError(
    502,
    "The AI didn't return an image. Try a clearer photo or a different angle.",
  );
}
