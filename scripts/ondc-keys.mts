// Generates the key pairs ONDC needs and prints them as env vars.
//   node scripts/ondc-keys.mts >> .env.production.local   (then keep them secret)
import { randomUUID } from "node:crypto";
import { generateKeySet } from "../lib/ondc/crypto.ts";

const k = generateKeySet();
console.log(`ONDC_UNIQUE_KEY_ID=${randomUUID()}
ONDC_REQUEST_ID=${randomUUID()}
ONDC_SIGNING_PUBLIC_KEY=${k.signingPublicKey}
ONDC_SIGNING_PRIVATE_KEY=${k.signingPrivateKey}
ONDC_ENCRYPTION_PUBLIC_KEY=${k.encryptionPublicKey}
ONDC_ENCRYPTION_PRIVATE_KEY=${k.encryptionPrivateKey}`);
