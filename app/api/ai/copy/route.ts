import { z } from "zod";
import { db } from "@/lib/db";
import { formatQuantity } from "@/lib/products/units";
import { handler, ok, parseJson } from "@/lib/server/api";
import { consumeAiCredits, gemini, parseModelJson, refundAiCredits, TEXT_MODEL } from "@/lib/server/ai";
import { COPY_PROMPT } from "@/lib/server/ai-prompts";
import { HttpError, requireUserId } from "@/lib/server/session";

export const runtime = "nodejs";

// Suggests a better title and description. Does not save; the seller reviews first.
const input = z.object({ productId: z.string() });

export const POST = handler(async (req: Request) => {
  const userId = await requireUserId();
  const { productId } = await parseJson(req, input);
  const p = await db.product.findFirst({ where: { id: productId, userId } });
  if (!p) throw new HttpError(404, "Product not found.");
  await consumeAiCredits(userId, 1);
  try {
    const facts = {
      title: p.name,
      description: p.description,
      brand: p.brand,
      size: formatQuantity(p.unitValue ? Number(p.unitValue) : null, p.unit),
      category: p.ondcCategory ?? p.category,
      type: p.type,
      vegType: p.vegType,
      attributes: p.attributes,
    };
    const result = await gemini("detection").models.generateContent({
      model: TEXT_MODEL,
      contents: [{ text: `${COPY_PROMPT}\n\nListing facts:\n${JSON.stringify(facts, null, 2)}` }],
      config: { responseMimeType: "application/json" },
    });
    const out = parseModelJson<{ name: string; description: string }>(result.text);
    return ok({ name: String(out.name ?? p.name).slice(0, 200), description: String(out.description ?? "").slice(0, 5000) });
  } catch (e) {
    await refundAiCredits(userId, 1);
    throw e;
  }
});
