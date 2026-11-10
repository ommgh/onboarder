# Taking Onboarder live on ONDC

Onboarder participates in ONDC as a **seller app** (a BPP, registered as `sellerApp` with
`msn: true`, a marketplace hosting many shops). Each Onboarder store is an ONDC *provider*;
its products are served to every buyer app that searches in the store's city.

The code is complete and tested end to end against a mock buyer app (`pnpm test:ondc`).
What remains is network onboarding, which needs your legal entity and can't be automated.

## What's implemented

| Piece | Where |
| --- | --- |
| Ed25519 + BLAKE2b request signing and verification (matches ONDC's published test vector) | `lib/ondc/crypto.ts`, `tests/ondc-crypto.test.mts` |
| Registry lookup (v2.0, signed) with a 1 h key cache | `lib/ondc/server.ts` |
| `/ondc-site-verification.html` (signed `ONDC_REQUEST_ID`) | `app/ondc-site-verification.html/route.ts` |
| `/api/ondc/on_subscribe` challenge (X25519 + AES-256-ECB) | `app/api/ondc/on_subscribe/route.ts` |
| `search`, `select`, `init`, `confirm`, `status`, `cancel`, `track`, `support` (ACK now, signed callback after) | `lib/ondc/handlers.ts` |
| Unsolicited `on_status` / `on_cancel` when a seller updates an order | `pushOrderUpdate` in `lib/ondc/handlers.ts` |
| Retail v1.2 catalog builder (variant groups, statutory fields, FSSAI, veg tags, serviceability) | `lib/ondc/catalog.ts` |
| Quote engine (stock, radius, delivery fee, minimum order) | `lib/ondc/quote.ts` |
| Store and product readiness rules shown to sellers | `lib/ondc/readiness.ts` |
| Every request and callback logged for certification | `OndcLog` table |

Domains covered: RET10 Grocery, RET12 Fashion, RET13 Beauty & Personal Care, RET14
Electronics, RET16 Home & Kitchen, RET18 Health & Wellness. `update` (returns and part
cancellations) is not implemented yet and is NACKed explicitly.

## Steps to go live

1. **Register on the ONDC portal** at <https://portal.ondc.org>, complete your profile
   100%, and raise an *environment access request* to whitelist your subscriber id
   (e.g. `onboarder.store`) for **pre-production**. The staging registry has been retired.
2. **Generate keys** and store them as production secrets (never commit them):
   ```sh
   pnpm ondc:keys
   ```
   Set the printed `ONDC_*` values plus `ONDC_ENV=preprod` and
   `ONDC_SUBSCRIBER_ID=onboarder.store` in your hosting provider.
3. **Deploy**, then confirm both endpoints respond:
   - `https://onboarder.store/ondc-site-verification.html` shows a meta tag with a signature
   - `POST https://onboarder.store/api/ondc/on_subscribe` is reachable
4. **Subscribe.** Put the entity fields (legal name, GSTIN, PAN, signatory, contact) in
   `.env.production.local`, check the payload, then send it:
   ```sh
   node --env-file=.env.production.local scripts/ondc-subscribe.mts --dry-run
   pnpm ondc:subscribe
   ```
   > The payload in `scripts/ondc-subscribe.mts` follows ONDC's onboarding guide, but
   > validate it against the current [SwaggerHub spec](https://app.swaggerhub.com/apis-docs/ONDC/ONDC-Registry-Onboarding/2.0.5)
   > before sending; ONDC revises required fields from time to time.
5. **Verify** your entry with a registry lookup, then run ONDC's
   [log validation utility](https://github.com/ONDC-Official/log-validation-utility)
   against transactions with the pre-prod reference buyer app. Export flows from the
   `OndcLog` table.
6. Demo to ONDC, clear the pre-prod checklist, repeat steps 2–4 with `ONDC_ENV=prod`.

## Testing locally

```sh
pnpm seed:demo                                   # fresh demo shop
pnpm ondc:keys >> .env.local                     # local-only keys
echo "ONDC_SUBSCRIBER_ID=localhost:3000" >> .env.local
echo "ONDC_VERIFY_SIGNATURES=false" >> .env.local  # mock BAP isn't in the registry
pnpm dev &
node scripts/ondc-mock-bap.mjs /tmp/ondc-callbacks.jsonl &
pnpm test:ondc /tmp/ondc-callbacks.jsonl
```

The test drives a full transaction (compliance gate → search → select → init → confirm →
seller status push → status → cancel) and asserts on signatures, quotes, serviceability,
stock movement and idempotency. Run it against a freshly seeded database.

## Known gaps before certification

- **Returns / `update`**: needed for categories with return windows.
- **Logistics**: sellers deliver themselves or offer pickup. Integrating an ONDC logistics
  provider (LSP) for hyperlocal delivery is the natural next step.
- **IGM (issue & grievance)** and **RSF (settlement reconciliation)** flows are not built.
- **Incremental catalog refresh** (pushing price/stock changes proactively) is not built;
  buyer apps currently see changes on their next search.
