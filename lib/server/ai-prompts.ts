import "server-only";
import { ONDC_DOMAINS } from "@/lib/ondc/taxonomy";

const CATEGORY_LIST = ONDC_DOMAINS.map((d) => `${d.label}: ${d.categories.join(", ")}`).join("\n");

export const DETECT_PROMPT = `You are cataloguing a product for a small Indian shop that is going online.
Look at the photo and return ONLY a JSON object:
{
  "name": "marketable title: brand (if visible) + product + size, max 90 chars, Title Case",
  "description": "2-3 sentences for an Indian shopper: what it is, material/ingredients, use. No hype.",
  "brand": "brand printed on the product, or null",
  "type": "PACKAGED if sealed retail pack with a label, LOOSE if sold by weight, APPAREL if clothing/fabric worn on the body, else HANDMADE",
  "ondcCategory": "exactly one value from the list below, or null",
  "vegType": "veg | nonveg | egg | null (only for food)",
  "unit": "kg | g | l | ml | piece | pack | dozen | null",
  "unitValue": number or null,
  "barcode": "digits if a barcode number is legible, else null",
  "enhancementPrompt": "specific instructions to turn this photo into a clean e-commerce image: background, lighting, setting that suits THIS product. Must keep the product itself unchanged.",
  "confidence": 0.0-1.0
}
Categories:
${CATEGORY_LIST}`;

export const ENHANCE_DEFAULT = `Turn this raw photo into a professional e-commerce product image.
Isolate the product, keep its exact shape, colours, text and proportions unchanged.
Place it on a clean, softly lit background suited to the product (seamless light backdrop for packs;
a styled, realistic setting for art, decor and furniture). Natural soft shadow, no added text, logos or watermarks.`;

export const photoPrompt = (name: string, size?: string) =>
  `A clean, realistic e-commerce photo of ${name}${size ? ` (${size})` : ""} as sold loose at an Indian kirana store:
the product heaped in a simple steel bowl or neat pile on a plain off-white background, soft daylight,
shot from a 45 degree angle, sharp focus, true-to-life colours. No packaging, no text, no labels, no hands.`;

export const COPY_PROMPT = `You write product listings for small Indian sellers on ONDC, Amazon.in and Shopify.
Rewrite the listing below to sell better while staying strictly truthful to the given facts.
Title: brand + product + key attribute + size, max 90 characters, Title Case, no emojis, no ALL CAPS, no claims like "best".
Description: 2 short paragraphs (what it is and why it's good; usage/storage/care), then 3-5 bullet highlights starting with "• ".
Write in simple English an Indian shopper understands. Do not invent certifications, origins or numbers.
Return ONLY JSON: {"name": "...", "description": "..."}`;

export const BRAND_PROMPT = `You are a brand designer for a small Indian business going online.
From the details below, return ONLY JSON:
{
  "names": ["3 short, memorable shop name ideas (only if the seller asked for name ideas, else [])"],
  "tagline": "one line, max 8 words",
  "story": "a warm 2-sentence 'about us' the owner would be proud to put on their storefront",
  "palette": [{"name": "...", "hex": "#RRGGBB"} x4: primary, accent, background, ink; primary must have >=4.5:1 contrast on the background],
  "voice": ["3 adjectives describing how the brand speaks"],
  "logoPrompt": "a prompt for a flat, simple vector-style logo mark (no text) that fits the business"
}`;

export const TRYON_PROMPTS = {
  model:
    "You are an expert fashion photographer. Transform the person in this image into a full-body e-commerce model photo on a clean light-grey studio backdrop (#f0f0f0). Preserve identity, features and body type; relaxed standing pose; photorealistic. Return only the image.",
  tryOn: `You are an expert virtual try-on system. Image 1 is the model, image 2 is the garment.
Create a photorealistic image of the person from image 1 wearing the garment from image 2.
Completely replace the clothing item it covers; keep face, hair, body, pose and background unchanged;
fit the garment naturally with realistic folds, drape and lighting; preserve the garment's exact colour, print and texture. Return only the image.`,
  pose: (instruction: string) =>
    `Regenerate this fashion photo from a different perspective: "${instruction}". The person, clothing and background style must remain identical. Return only the image.`,
};
