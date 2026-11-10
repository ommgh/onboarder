import { NextResponse } from "next/server";
import { decryptChallenge } from "@/lib/ondc/crypto";
import { ondcConfig } from "@/lib/ondc/server";

export const runtime = "nodejs";

// Called by the ONDC registry during /subscribe. We prove ownership of our encryption key
// by decrypting the challenge with the X25519 shared secret and answering synchronously.
export async function POST(req: Request) {
  const c = ondcConfig();
  const body = (await req.json().catch(() => null)) as { challenge?: string } | null;
  if (!body?.challenge) return NextResponse.json({ error: "challenge missing" }, { status: 400 });
  try {
    const answer = decryptChallenge(body.challenge, c.encryptionPrivateKey, c.registry.encryptionPublicKey);
    return NextResponse.json({ answer });
  } catch (e) {
    console.error("[ondc] on_subscribe challenge failed", e);
    return NextResponse.json({ error: "could not decrypt challenge" }, { status: 400 });
  }
}
