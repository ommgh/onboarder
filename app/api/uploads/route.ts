import { handler, ok } from "@/lib/server/api";
import { HttpError, requireUserId } from "@/lib/server/session";
import { storeImage } from "@/lib/server/storage";

// POST multipart/form-data { file } -> { url }
export const POST = handler(async (req: Request) => {
  await requireUserId();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File))
    throw new HttpError(400, "Attach an image file.");
  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const url = await storeImage(
    `data:${file.type || "image/jpeg"};base64,${b64}`,
    file.name.replace(/\.\w+$/, ""),
  );
  return ok({ url });
});
