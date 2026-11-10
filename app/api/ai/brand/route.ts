import { z } from "zod";
import { db } from "@/lib/db";
import { handler, ok, parseJson } from "@/lib/server/api";
import { consumeAiCredits, firstImage, gemini, IMAGE_MODEL, parseModelJson, refundAiCredits, TEXT_MODEL } from "@/lib/server/ai";
import { BRAND_PROMPT } from "@/lib/server/ai-prompts";
import { requireUserId } from "@/lib/server/session";
import { ensureStore } from "@/lib/server/store";
import { storeImage } from "@/lib/server/storage";

export const runtime = "nodejs";
export const maxDuration = 120;

const input = z.object({
  businessName: z.string().max(80).optional(),
  wantsNames: z.boolean().default(false),
  sells: z.string().min(3).max(300),
  audience: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  feel: z.string().max(120).optional(),
  withLogo: z.boolean().default(true),
});

export interface BrandKit {
  names: string[];
  tagline: string;
  story: string;
  palette: { name: string; hex: string }[];
  voice: string[];
  logoPrompt: string;
  logoUrl?: string;
}

export const POST = handler(async (req: Request) => {
  const userId = await requireUserId();
  const brief = await parseJson(req, input);
  const cost = brief.withLogo ? 3 : 1;
  await consumeAiCredits(userId, cost);
  try {
    const text = await gemini("generation").models.generateContent({
      model: TEXT_MODEL,
      contents: [{ text: `${BRAND_PROMPT}\n\nBusiness details:\n${JSON.stringify(brief, null, 2)}` }],
      config: { responseMimeType: "application/json" },
    });
    const kit = parseModelJson<BrandKit>(text.text);
    kit.palette = (kit.palette ?? []).filter((c) => /^#[0-9a-f]{6}$/i.test(c.hex)).slice(0, 4);
    if (brief.withLogo && kit.logoPrompt) {
      const img = await gemini("generation").models.generateContent({
        model: IMAGE_MODEL,
        contents: [{ text: `${kit.logoPrompt}. Flat vector logo mark, centred, solid colours from ${kit.palette.map((p) => p.hex).join(", ")}, plain white background, no text, no mockup.` }],
        config: { responseModalities: ["TEXT", "IMAGE"] },
      });
      const logo = firstImage(img);
      kit.logoUrl = await storeImage(`data:${logo.mimeType};base64,${logo.data}`, "logo");
    }
    const store = await ensureStore(userId);
    await db.store.update({ where: { id: store.id }, data: { brandKit: kit as object } });
    return ok({ kit });
  } catch (e) {
    await refundAiCredits(userId, cost);
    throw e;
  }
});
