# Onboarder

Onboarder takes India's neighbourhood shops online. A kirana stocks well over a thousand
items; Onboarder turns that shelf into an online catalog in an afternoon and sells it on
ONDC, Shopify, Amazon.in, Flipkart and a free WhatsApp storefront.

Live at <https://onboarder.store>.

## Three lanes for three kinds of products

| Lane | For | How |
| --- | --- | --- |
| **Packaged** (organised) | Anything with a barcode | Continuous camera scanning (native `BarcodeDetector`, zxing fallback) or a USB scanner. Barcodes resolve via go-upc and Open Food Facts; scanning twice counts stock. |
| **Loose** (un-organised) | Atta, dal, rice, spices, vegetables | A 100+ item starter catalog with Hindi names. Enter a rate per kg, pick pack sizes; each pack becomes a SKU grouped as variants. AI creates the photos. |
| **Handmade** (custom) | Art, craft, apparel, décor | Photograph it; AI names it, writes the listing and produces a studio image. Apparel can be shown on a model with virtual try-on. |

Plus CSV import (Excel, Tally, Vyapar, Marg) and manual entry.

## Selling

- **ONDC**: Onboarder is a seller app on the network. See [docs/ondc.md](docs/ondc.md).
- **Shopify**: OAuth (expiring offline tokens), products pushed with `productSet` (pack sizes become a Size option), recent orders imported.
- **Amazon.in**: SP-API; barcode products are matched to existing ASINs and listed as offers.
- **Flipkart**: generates a listing sheet for Seller Hub (Flipkart has no open listing API for new products).
- **Storefront**: `/s/<shop>`, a public mobile catalog with WhatsApp ordering.

The dashboard also covers orders (including counter / WhatsApp sales), analytics with
plain-language recommendations, listing-quality scores, a photo studio and a brand kit.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 4 · shadcn/ui · Prisma + Postgres ·
Auth.js · Google Gemini · UploadThing · Resend · Dodo Payments · Biome.

## Development

```sh
pnpm install
cp .env.example .env.local        # fill in the Core block at minimum
docker run -d --name onboarder-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=onboarder -p 54329:5432 postgres:17-alpine
pnpm db:push
pnpm seed:demo                    # demo@onboarder.local / demo1234
pnpm dev
```

| Command | |
| --- | --- |
| `pnpm test` | Unit tests (ONDC crypto vs. official test vector, catalog, quotes, units, CSV, quality) |
| `pnpm test:ondc` | End-to-end ONDC transaction against a mock buyer app ([docs/ondc.md](docs/ondc.md#testing-locally)) |
| `pnpm lint` | Biome |
| `pnpm build` | Production build |

## Database changes

The schema is applied with `prisma db push`. Every change is kept **additive** (new tables,
nullable or defaulted columns, `@map` for renames) so pushing to production never drops
data. When editing `prisma/schema.prisma`, push to a copy of production first and make sure
Prisma reports no data-loss warnings.

## Project layout

```
app/(landing)        marketing site
app/(protected)      seller dashboard
app/s/[slug]         public storefronts
app/api              JSON API, ONDC endpoints, channel OAuth callbacks
lib/ondc             ONDC protocol (pure modules are unit-tested)
lib/channels         Shopify, Amazon, Flipkart
lib/products         schema, quality scoring, units, CSV, kirana catalog
lib/server           auth guards, AI, storage, analytics (server-only)
scripts              seeding, ONDC keys / subscribe / e2e
```
