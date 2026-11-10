import assert from "node:assert/strict";
import { test } from "node:test";
import {
  blake2b512,
  createAuthorizationHeader,
  decryptChallenge,
  encryptChallenge,
  generateKeySet,
  parseAuthorizationHeader,
  signingString,
  signMessage,
  verifyAuthorizationHeader,
} from "../lib/ondc/crypto.ts";

// Test vector from ONDC-Official/developer-docs registry/signing-verification.md
const BODY =
  '{"context":{"domain":"nic2004:60212","country":"IND","city":"Kochi","action":"search","core_version":"0.9.1","bap_id":"bap.stayhalo.in","bap_uri":"https://8f9f-49-207-209-131.ngrok.io/protocol/","transaction_id":"e6d9f908-1d26-4ff3-a6d1-3af3d3721054","message_id":"a2fe6d52-9fe4-4d1a-9d0b-dccb8b48522d","timestamp":"2022-01-04T09:17:55.971Z","ttl":"P1M"},"message":{"intent":{"fulfillment":{"start":{"location":{"gps":"10.108768, 76.347517"}},"end":{"location":{"gps":"10.102997, 76.353480"}}}}}}';
const PUB = "awGPjRK6i/Vg/lWr+0xObclVxlwZXvTjWYtlu6NeOHk=";
const PRIV =
  "lP3sHA+9gileOkXYJXh4Jg8tK0gEEMbf9yCPnFpbldhrAY+NErqL9WD+Vav7TE5tyVXGXBle9ONZi2W7o144eQ==";
const CREATED = 1641287875;
const EXPIRES = 1641291475;
const EXPECTED_SIG =
  "cjbhP0PFyrlSCNszJM1F/YmHDVAWsZqJUPzojnE/7TJU3fJ/rmIlgaUHEr5E0/2PIyf0tpSnWtT6cyNNlpmoAQ==";

test("digest matches the ONDC reference vector", () => {
  assert.equal(
    blake2b512(BODY),
    "b6lf6lRgOweajukcvcLsagQ2T60+85kRh/Rd2bdS+TG/5ALebOEgDJfyCrre/1+BMu5nA94o4DT3pTFXuUg7sw==",
  );
});

test("signature matches the ONDC reference vector byte for byte", () => {
  assert.equal(signMessage(signingString(BODY, CREATED, EXPIRES), PRIV), EXPECTED_SIG);
});

test("authorization header round-trips through parse + verify", () => {
  const header = createAuthorizationHeader(BODY, {
    subscriberId: "example-bap.com",
    uniqueKeyId: "bap1234",
    privateKey: PRIV,
    created: CREATED,
    ttlSeconds: EXPIRES - CREATED,
  });
  assert.match(header, /signature="cjbhP0PF/);
  const parsed = parseAuthorizationHeader(header);
  assert.ok(parsed);
  assert.equal(parsed.subscriberId, "example-bap.com");
  assert.equal(parsed.uniqueKeyId, "bap1234");
  assert.ok(verifyAuthorizationHeader(BODY, parsed, PUB, CREATED + 10));
  // tampered body
  assert.ok(!verifyAuthorizationHeader(`${BODY} `, parsed, PUB, CREATED + 10));
  // expired
  assert.ok(!verifyAuthorizationHeader(BODY, parsed, PUB, EXPIRES + 1));
});

test("generated keys sign/verify and complete the on_subscribe challenge", () => {
  const ours = generateKeySet();
  const registry = generateKeySet();
  const header = parseAuthorizationHeader(
    createAuthorizationHeader("{}", {
      subscriberId: "onboarder.store",
      uniqueKeyId: "k1",
      privateKey: ours.signingPrivateKey,
    }),
  );
  assert.ok(header && verifyAuthorizationHeader("{}", header, ours.signingPublicKey));

  const challenge = encryptChallenge(
    "challenge-1234",
    registry.encryptionPrivateKey,
    ours.encryptionPublicKey,
  );
  assert.equal(
    decryptChallenge(challenge, ours.encryptionPrivateKey, registry.encryptionPublicKey),
    "challenge-1234",
  );
});

test("accepts the published ONDC registry public key format", () => {
  const ours = generateKeySet();
  // Pre-prod registry key from the onboarding guide; only checks it parses as X25519 SPKI.
  const preprod = "MCowBQYDK2VuAyEARa/WcMCzNQp4DWjvTI4DK7vHL6EdaHqN4GjFIu9wxxM=";
  assert.throws(() => decryptChallenge("AAAAAAAAAAAAAAAAAAAAAA==", ours.encryptionPrivateKey, preprod), /bad decrypt|wrong final block/i);
});
