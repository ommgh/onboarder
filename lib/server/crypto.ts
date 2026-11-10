import "server-only";
import crypto from "node:crypto";

// AES-256-GCM for secrets at rest (marketplace tokens, bank account numbers).
// Format: v1.<iv b64>.<tag b64>.<ciphertext b64>

function key(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY ?? process.env.AUTH_SECRET;
  if (!raw) {
    throw new Error("APP_ENCRYPTION_KEY is not set");
  }
  // Derive a fixed-length key so any sufficiently random secret works.
  return crypto.createHash("sha256").update(raw).digest();
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64"),
    tag.toString("base64"),
    ct.toString("base64"),
  ].join(".");
}

export function decrypt(payload: string): string {
  const [version, iv, tag, ct] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !ct) {
    throw new Error("Unrecognised encrypted payload");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ct, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}
