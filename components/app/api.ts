"use client";
import { toast } from "sonner";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

/** fetch wrapper for our JSON API: throws ApiError with the server's friendly message. */
export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status, data.code);
  return data as T;
}

/** Shows an error toast with an upgrade action when the error is a plan limit. */
export function toastError(e: unknown, fallback = "Something went wrong") {
  const err = e instanceof ApiError ? e : null;
  const message = err?.message ?? (e instanceof Error ? e.message : fallback);
  if (err?.status === 402) {
    toast.error(message, { action: { label: "See plans", onClick: () => window.location.assign("/dashboard/settings#plan") } });
  } else {
    toast.error(message);
  }
}

export async function uploadFile(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const { url } = await api<{ url: string }>("/api/uploads", { method: "POST", body });
  return url;
}

/** Downscales a photo in the browser before upload/AI calls; phone photos are often 5-10 MB. */
export async function shrinkImage(file: File, maxSide = 1600, quality = 0.85): Promise<{ file: File; dataUrl: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob: Blob = await new Promise((r) => canvas.toBlob((b) => r(b as Blob), "image/jpeg", quality));
  const out = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  const dataUrl: string = await new Promise((r) => {
    const fr = new FileReader();
    fr.onload = () => r(fr.result as string);
    fr.readAsDataURL(out);
  });
  return { file: out, dataUrl };
}
