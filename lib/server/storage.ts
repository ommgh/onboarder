import "server-only";
import { UTApi, UTFile } from "uploadthing/server";
import { HttpError } from "./session";

let api: UTApi | null = null;
function utapi() {
  if (!process.env.UPLOADTHING_TOKEN) throw new HttpError(503, "File storage is not configured on this server.");
  api ??= new UTApi();
  return api;
}

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Stores an image (raw base64 or data URL) and returns its public URL. */
export async function storeImage(input: string, name = "image"): Promise<string> {
  const match = input.match(/^data:([^;]+);base64,(.*)$/s);
  const mime = match?.[1] ?? "image/png";
  if (!EXT[mime]) throw new HttpError(400, "Only PNG, JPEG or WebP images are supported.");
  const bytes = Buffer.from(match?.[2] ?? input, "base64");
  if (bytes.length > 8 * 1024 * 1024) throw new HttpError(413, "Images must be smaller than 8 MB.");
  const safe = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "image";
  const file = new UTFile([bytes], `${safe}-${Date.now().toString(36)}.${EXT[mime]}`, { type: mime });
  const res = await utapi().uploadFiles(file);
  if (res.error || !res.data?.ufsUrl) throw new HttpError(502, "Could not save the image. Please try again.");
  return res.data.ufsUrl;
}

/** Fetches a remote image as an inline part for Gemini. Only https URLs are allowed. */
export async function imagePart(input: string): Promise<{ inlineData: { mimeType: string; data: string } }> {
  const data = input.match(/^data:([^;]+);base64,(.*)$/s);
  if (data) return { inlineData: { mimeType: data[1], data: data[2] } };
  if (!/^https:\/\//i.test(input)) {
    // bare base64
    return { inlineData: { mimeType: "image/png", data: input } };
  }
  const res = await fetch(input, { signal: AbortSignal.timeout(15000) });
  const type = (res.headers.get("content-type") ?? "").split(";")[0];
  if (!res.ok || !type.startsWith("image/")) throw new HttpError(400, "That image couldn't be loaded.");
  return { inlineData: { mimeType: type, data: Buffer.from(await res.arrayBuffer()).toString("base64") } };
}
