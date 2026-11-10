// Registers Onboarder as a seller app (ops_no 2) on the ONDC registry.
//
// Prerequisites (see docs/ondc.md):
//   1. Subscriber id whitelisted on https://portal.ondc.org for the chosen environment
//   2. The app deployed at https://$ONDC_SUBSCRIBER_ID with all ONDC_* env vars set, so
//      /ondc-site-verification.html and /api/ondc/on_subscribe respond
//
// Usage: node --env-file=.env.production.local scripts/ondc-subscribe.mts [--dry-run]
import { randomUUID } from "node:crypto";
import { createAuthorizationHeader } from "../lib/ondc/crypto.ts";

const env = process.env.ONDC_ENV === "prod" ? "prod" : "preprod";
const url = env === "prod" ? "https://prod.registry.ondc.org/subscribe" : "https://preprod.registry.ondc.org/ondc/subscribe";
const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing ${k}`);
  return v;
};

const subscriberId = need("ONDC_SUBSCRIBER_ID");
const now = new Date();
const validUntil = new Date(now.getTime() + 365 * 24 * 3600 * 1000);
const domains = (process.env.ONDC_DOMAINS ?? "ONDC:RET10").split(",");
const cities = (process.env.ONDC_CITIES ?? "*").split(",");

const payload = {
  context: { operation: { ops_no: 2 } },
  message: {
    request_id: need("ONDC_REQUEST_ID"),
    timestamp: now.toISOString(),
    entity: {
      gst: {
        legal_entity_name: need("ONDC_LEGAL_NAME"),
        business_address: need("ONDC_BUSINESS_ADDRESS"),
        city_code: cities,
        gst_no: need("ONDC_GSTIN"),
      },
      pan: {
        name_as_per_pan: need("ONDC_LEGAL_NAME"),
        pan_no: need("ONDC_PAN"),
        date_of_incorporation: need("ONDC_DATE_OF_INCORPORATION"),
      },
      name_of_authorised_signatory: need("ONDC_SIGNATORY_NAME"),
      address_of_authorised_signatory: need("ONDC_BUSINESS_ADDRESS"),
      email_id: need("ONDC_CONTACT_EMAIL"),
      mobile_no: Number(need("ONDC_CONTACT_PHONE")),
      country: "IND",
      subscriber_id: subscriberId,
      unique_key_id: need("ONDC_UNIQUE_KEY_ID"),
      callback_url: "/api/ondc",
      key_pair: {
        signing_public_key: need("ONDC_SIGNING_PUBLIC_KEY"),
        encryption_public_key: need("ONDC_ENCRYPTION_PUBLIC_KEY"),
        valid_from: now.toISOString(),
        valid_until: validUntil.toISOString(),
      },
    },
    network_participant: domains.map((domain) => ({
      subscriber_url: "/api/ondc",
      domain,
      type: "sellerApp",
      msn: true,
      city_code: cities,
    })),
  },
};

const body = JSON.stringify(payload);
if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}
const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: createAuthorizationHeader(body, {
      subscriberId,
      uniqueKeyId: need("ONDC_UNIQUE_KEY_ID"),
      privateKey: need("ONDC_SIGNING_PRIVATE_KEY"),
    }),
    "X-Request-Id": randomUUID(),
  },
  body,
});
console.log(res.status, await res.text());
