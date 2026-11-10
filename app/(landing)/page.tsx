import {
  ArrowRight,
  BarChart3,
  MessageCircle,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { FAQS } from "@/components/marketing/faq-data";
import { PricingCards } from "@/components/marketing/pricing";
import {
  LaneHandmade,
  LaneLoose,
  LanePackaged,
  OndcChecklistVisual,
  ScanQueueVisual,
} from "@/components/marketing/visuals";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const LANES = [
  {
    kicker: "Organised",
    title: "Packaged goods: just scan",
    body: "Point your phone, or the barcode gun at your counter, at a shelf. Name, brand, pack size and photo fill themselves in. Scan an item twice and it counts stock.",
    visual: <LanePackaged />,
    stat: "~5 seconds an item",
  },
  {
    kicker: "Un-organised",
    title: "Loose staples: tick and price",
    body: "Atta, dal, rice, spices, sabzi: 100+ items you weigh out by hand are already listed, in English and Hindi. Enter your rate per kg and choose pack sizes. AI makes the photos.",
    visual: <LaneLoose />,
    stat: "40 items in 10 minutes",
  },
  {
    kicker: "Custom",
    title: "Handmade & unique: take a photo",
    body: "Paintings, pottery, kurtas, décor. AI identifies the piece, writes a listing that sells and turns your phone photo into a studio shot. Clothes can be shown on a model.",
    visual: <LaneHandmade />,
    stat: "About a minute each",
  },
];

const CHANNELS = [
  {
    icon: Store,
    name: "ONDC network",
    body: "Paytm, PhonePe Pincode, Magicpin and every other buyer app, for shoppers near you.",
    tag: "Free",
  },
  {
    icon: MessageCircle,
    name: "Your storefront",
    body: "A web shop with your brand. Customers cart up and order on your WhatsApp.",
    tag: "Free",
  },
  {
    icon: ShoppingBag,
    name: "Shopify",
    body: "Your own branded store, created and kept in sync with one click.",
    tag: "Sync",
  },
  {
    icon: Truck,
    name: "Amazon & Flipkart",
    body: "Barcode-matched offers on Amazon.in, ready-filled listing sheets for Flipkart.",
    tag: "Match & list",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-ledger opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
        />
        <div className="container grid items-center gap-14 pt-14 pb-20 lg:grid-cols-[1.1fr_1fr] lg:pt-24 lg:pb-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" /> Now an ONDC
              seller app
              <span lang="hi" className="text-foreground/70">
                · दुकान से ऑनलाइन
              </span>
            </div>
            <h1 className="mt-6 font-serif text-5xl leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Your whole shop,{" "}
              <em className="text-primary">online by evening.</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground text-pretty">
              A kirana stocks a thousand things. Typing them into a marketplace
              takes weeks, so most shops never go online. Onboarder makes it an
              afternoon: scan the packets, tick the loose staples, photograph
              the handmade. Then sell on ONDC, Shopify, Amazon and your own
              WhatsApp store.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link href="/auth/register">
                  Start free <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 px-6 text-base"
              >
                <Link href="#how">See how it works</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Free for your first 100 products. No card, no commission.
            </p>
          </div>
          <ScanQueueVisual />
        </div>
      </section>

      {/* Numbers */}
      <section className="border-y bg-card">
        <div className="container grid gap-8 py-10 sm:grid-cols-3">
          {[
            [
              "1,000+",
              "items in a typical kirana. Onboarder is built for that scale, not for ten.",
            ],
            [
              "3 ways",
              "to add products, matched to how you actually sell: packed, loose or handmade.",
            ],
            [
              "1 tap",
              "to go live on ONDC once your shop details are complete.",
            ],
          ].map(([big, small]) => (
            <div key={big}>
              <div className="font-serif text-4xl">{big}</div>
              <p className="mt-1 text-sm text-muted-foreground">{small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lanes */}
      <section id="how" className="container scroll-mt-20 py-24">
        <div className="max-w-2xl">
          <div className="text-sm font-medium text-primary">How it works</div>
          <h2 className="mt-2 font-serif text-4xl tracking-tight text-balance sm:text-5xl">
            Every kind of product has its own fast lane.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Not everything in your shop has a barcode, and that's fine.
            Onboarder treats packaged, loose and handmade goods differently
            because they are different.
          </p>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {LANES.map((l) => (
            <div
              key={l.title}
              className="flex flex-col rounded-2xl border bg-card p-6"
            >
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {l.kicker}
              </div>
              <h3 className="mt-2 text-xl font-semibold">{l.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground text-pretty">
                {l.body}
              </p>
              <div className="mt-6 rounded-xl bg-muted/50 p-4">{l.visual}</div>
              <div className="mt-4 text-sm font-medium text-primary">
                {l.stat}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Already keep stock in Excel, Tally, Vyapar or Marg? Import the whole
          list from a spreadsheet in one go.
        </p>
      </section>

      {/* ONDC */}
      <section
        id="ondc"
        className="scroll-mt-16 border-y border-white/5 bg-stone-950 text-stone-100 dark:bg-[oklch(0.24_0.03_50)]"
      >
        <div className="container grid items-center gap-12 py-24 lg:grid-cols-2">
          <div>
            <div className="text-sm font-medium text-amber-300">
              Open Network for Digital Commerce
            </div>
            <h2 className="mt-2 font-serif text-4xl tracking-tight text-balance sm:text-5xl">
              One listing. Every shopping app in India.
            </h2>
            <p className="mt-5 text-stone-300 text-pretty">
              ONDC is India's open network for commerce. Instead of joining one
              marketplace, your shop joins the network, and shoppers can find it
              from Paytm, PhonePe Pincode, Magicpin and every other buyer app,
              matched by how close you are.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-stone-300">
              {[
                "Onboarder is your seller app: we handle the protocol, signing and compliance.",
                "We check your GSTIN, FSSAI, address and every product before you go live.",
                "Orders land in your dashboard; each status you tap reaches the buyer's app.",
                "No commission to Onboarder. Ever.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-300" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <OndcChecklistVisual />
        </div>
      </section>

      {/* Channels */}
      <section className="container py-24">
        <div className="max-w-2xl">
          <div className="text-sm font-medium text-primary">
            Sell everywhere
          </div>
          <h2 className="mt-2 font-serif text-4xl tracking-tight text-balance sm:text-5xl">
            Your catalog, wherever your customers shop.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CHANNELS.map((c) => (
            <div key={c.name} className="rounded-2xl border bg-card p-6">
              <div className="flex items-center justify-between">
                <c.icon className="size-6 text-primary" />
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {c.tag}
                </span>
              </div>
              <h3 className="mt-5 font-semibold">{c.name}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Grow */}
      <section className="border-y bg-card">
        <div className="container grid items-center gap-12 py-24 lg:grid-cols-2">
          <div className="order-2 rounded-2xl border bg-background p-5 lg:order-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="size-4 text-primary" /> What to do next
            </div>
            <ul className="mt-4 divide-y text-sm">
              {[
                "“Aashirvaad Atta 5 kg” is a best seller and running low. Restock before Saturday.",
                "Most orders arrive 7–8pm. Keep the shop phone close.",
                "18 listings have no photo. Products with photos sell far more.",
                "6 products haven't sold in 30 days. Try a combo or a better photo.",
              ].map((t) => (
                <li key={t} className="py-3 text-muted-foreground">
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="order-1 lg:order-2">
            <div className="text-sm font-medium text-primary">
              Then it helps you sell
            </div>
            <h2 className="mt-2 font-serif text-4xl tracking-tight text-balance sm:text-5xl">
              Advice, not just charts.
            </h2>
            <p className="mt-5 text-muted-foreground text-pretty">
              Every order, from ONDC, Shopify or your own counter, feeds one
              simple view of your shop. Onboarder scores every listing, tells
              you which fix will sell the most, and rewrites weak listings with
              AI in one tap.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container scroll-mt-16 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-4xl tracking-tight sm:text-5xl">
            Simple plans. No commission.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start free and upgrade when you're selling every day.
          </p>
        </div>
        <div className="mt-12">
          <PricingCards />
        </div>
      </section>

      {/* FAQ */}
      <section className="container max-w-3xl pb-24">
        <h2 className="font-serif text-4xl tracking-tight">
          Questions shopkeepers ask
        </h2>
        <Accordion type="single" collapsible className="mt-8">
          {FAQS.slice(0, 5).map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left text-base">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <Link
          href="/faq"
          className="mt-6 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          All questions <ArrowRight className="size-4" />
        </Link>
      </section>

      {/* CTA */}
      <section className="container pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
          <div aria-hidden className="absolute inset-0 bg-ledger opacity-10" />
          <h2 className="relative font-serif text-4xl tracking-tight text-balance sm:text-5xl">
            Open your shop to the whole city tonight.
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-primary-foreground/85">
            Start with the shelf in front of you. Your first 100 products are
            free.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="relative mt-8 h-12 px-8 text-base"
          >
            <Link href="/auth/register">
              Start free <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
