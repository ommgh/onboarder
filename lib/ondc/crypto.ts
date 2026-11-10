// ONDC / Beckn cryptography. Kept free of path aliases and framework imports so it can be
// unit-tested with `node --test` directly.
//
// Spec: https://github.com/ONDC-Official/developer-docs/blob/main/registry/signing-verification.md
//   digest  = base64(BLAKE2b-512(raw body))
//   signing string = "(created): <c>\n(expires): <e>\ndigest: BLAKE-512=<digest>"
//   signature = base64(Ed25519(signing string))
//   header  = Signature keyId="<subscriber_id>|<unique_key_id>|ed25519",algorithm="ed25519",
//             created="<c>",expires="<e>",headers="(created) (expires) digest",signature="<sig>"

import crypto from "node:crypto";

const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const X25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b656e04220420", "hex");
const X25519_SPKI_PREFIX = Buffer.from("302a300506032b656e032100", "hex");

/** Accepts a libsodium 64-byte secret key (seed||public), a 32-byte seed, or PKCS#8 DER. */
export function ed25519PrivateKey(b64: string): crypto.KeyObject {
  const raw = Buffer.from(b64, "base64");
  if (raw.length === 64 || raw.length === 32) {
    const seed = raw.subarray(0, 32);
    return crypto.createPrivateKey({
      key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]),
      format: "der",
      type: "pkcs8",
    });
  }
  return crypto.createPrivateKey({ key: raw, format: "der", type: "pkcs8" });
}

/** Accepts a raw 32-byte public key (what the ONDC registry stores) or SPKI DER. */
export function ed25519PublicKey(b64: string): crypto.KeyObject {
  const raw = Buffer.from(b64, "base64");
  const der = raw.length === 32 ? Buffer.concat([ED25519_SPKI_PREFIX, raw]) : raw;
  return crypto.createPublicKey({ key: der, format: "der", type: "spki" });
}

function x25519PrivateKey(b64: string): crypto.KeyObject {
  const raw = Buffer.from(b64, "base64");
  const der = raw.length === 32 ? Buffer.concat([X25519_PKCS8_PREFIX, raw]) : raw;
  return crypto.createPrivateKey({ key: der, format: "der", type: "pkcs8" });
}

function x25519PublicKey(b64: string): crypto.KeyObject {
  const raw = Buffer.from(b64, "base64");
  const der = raw.length === 32 ? Buffer.concat([X25519_SPKI_PREFIX, raw]) : raw;
  return crypto.createPublicKey({ key: der, format: "der", type: "spki" });
}

export function blake2b512(body: string): string {
  return crypto.createHash("blake2b512").update(body, "utf8").digest("base64");
}

export function signingString(body: string, created: number, expires: number): string {
  return `(created): ${created}\n(expires): ${expires}\ndigest: BLAKE-512=${blake2b512(body)}`;
}

export function signMessage(message: string, privateKeyB64: string): string {
  return crypto.sign(null, Buffer.from(message, "utf8"), ed25519PrivateKey(privateKeyB64)).toString("base64");
}

export function verifyMessage(message: string, signatureB64: string, publicKeyB64: string): boolean {
  try {
    return crypto.verify(
      null,
      Buffer.from(message, "utf8"),
      ed25519PublicKey(publicKeyB64),
      Buffer.from(signatureB64, "base64"),
    );
  } catch {
    return false;
  }
}

export interface SignOptions {
  subscriberId: string;
  uniqueKeyId: string;
  privateKey: string;
  created?: number;
  /** seconds the signature stays valid */
  ttlSeconds?: number;
}

export function createAuthorizationHeader(body: string, opts: SignOptions): string {
  const created = opts.created ?? Math.floor(Date.now() / 1000);
  const expires = created + (opts.ttlSeconds ?? 3600);
  const signature = signMessage(signingString(body, created, expires), opts.privateKey);
  return (
    `Signature keyId="${opts.subscriberId}|${opts.uniqueKeyId}|ed25519",algorithm="ed25519",` +
    `created="${created}",expires="${expires}",headers="(created) (expires) digest",` +
    `signature="${signature}"`
  );
}

export interface ParsedAuthHeader {
  subscriberId: string;
  uniqueKeyId: string;
  algorithm: string;
  created: number;
  expires: number;
  signature: string;
}

export function parseAuthorizationHeader(header: string | null | undefined): ParsedAuthHeader | null {
  if (!header) return null;
  const params: Record<string, string> = {};
  for (const m of header.replace(/^Signature\s+/i, "").matchAll(/(\w+)="([^"]*)"/g)) {
    params[m[1]] = m[2];
  }
  const [subscriberId, uniqueKeyId, keyAlg] = (params.keyId ?? "").split("|");
  if (!subscriberId || !uniqueKeyId || !params.signature) return null;
  const algorithm = params.algorithm ?? keyAlg;
  if (keyAlg && algorithm && keyAlg !== algorithm) return null;
  return {
    subscriberId,
    uniqueKeyId,
    algorithm,
    created: Number(params.created),
    expires: Number(params.expires),
    signature: params.signature,
  };
}

/**
 * Verifies an incoming request's Authorization (or X-Gateway-Authorization) header against
 * the sender's registered public key. `now` is injectable for tests.
 */
export function verifyAuthorizationHeader(
  body: string,
  header: ParsedAuthHeader,
  publicKeyB64: string,
  now = Math.floor(Date.now() / 1000),
): boolean {
  if (!Number.isFinite(header.created) || !Number.isFinite(header.expires)) return false;
  if (header.expires < now) return false;
  if (header.created > now + 300) return false; // allow modest clock skew
  return verifyMessage(signingString(body, header.created, header.expires), header.signature, publicKeyB64);
}

/** Decrypts the registry's /on_subscribe challenge (X25519 shared key + AES-256-ECB). */
export function decryptChallenge(
  challengeB64: string,
  encryptionPrivateKeyB64: string,
  registryPublicKeyB64: string,
): string {
  const sharedKey = crypto.diffieHellman({
    privateKey: x25519PrivateKey(encryptionPrivateKeyB64),
    publicKey: x25519PublicKey(registryPublicKeyB64),
  });
  const decipher = crypto.createDecipheriv("aes-256-ecb", sharedKey, null);
  return Buffer.concat([
    decipher.update(Buffer.from(challengeB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Inverse of decryptChallenge; used by tests to simulate the registry. */
export function encryptChallenge(
  plaintext: string,
  registryPrivateKeyB64: string,
  subscriberEncryptionPublicKeyB64: string,
): string {
  const sharedKey = crypto.diffieHellman({
    privateKey: x25519PrivateKey(registryPrivateKeyB64),
    publicKey: x25519PublicKey(subscriberEncryptionPublicKeyB64),
  });
  const cipher = crypto.createCipheriv("aes-256-ecb", sharedKey, null);
  return Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]).toString("base64");
}

export interface OndcKeySet {
  signingPublicKey: string; // raw 32 bytes, base64 (registry format)
  signingPrivateKey: string; // libsodium 64-byte format, base64
  encryptionPublicKey: string; // SPKI DER, base64 (registry format)
  encryptionPrivateKey: string; // PKCS#8 DER, base64
}

export function generateKeySet(): OndcKeySet {
  const sign = crypto.generateKeyPairSync("ed25519");
  const signPub = sign.publicKey.export({ format: "der", type: "spki" }).subarray(-32);
  const signSeed = sign.privateKey.export({ format: "der", type: "pkcs8" }).subarray(-32);
  const enc = crypto.generateKeyPairSync("x25519");
  return {
    signingPublicKey: signPub.toString("base64"),
    signingPrivateKey: Buffer.concat([signSeed, signPub]).toString("base64"),
    encryptionPublicKey: enc.publicKey.export({ format: "der", type: "spki" }).toString("base64"),
    encryptionPrivateKey: enc.privateKey.export({ format: "der", type: "pkcs8" }).toString("base64"),
  };
}
