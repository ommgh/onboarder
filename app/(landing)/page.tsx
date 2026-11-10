import {
  ArrowRight,
  BadgeCheck,
  Check,
  IndianRupee,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { FAQS } from "@/components/marketing/faq-data";
import { PricingCards } from "@/components/marketing/pricing";
import {
  Eyebrow,
  Marquee,
  SectionHeading,
} from "@/components/marketing/primitives";
import { ProductTour } from "@/components/marketing/product-tour";
import { Reveal } from "@/components/marketing/reveal";
import { SalesPreview } from "@/components/marketing/sales-preview";
import {
  ChannelHub,
  HeroOrdersCard,
  HeroScannedCard,
  LaneHandmade,
  LaneLoose,
  LanePackaged,
  OndcChecklistVisual,
} from "@/components/marketing/visuals";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const REACH = [
  "Paytm",
  "PhonePe Pincode",
  "Magicpin",
  "Ola",
  "Shopify",
  "Amazon.in",
  "Flipkart",
  "WhatsApp",
  "Mystore",
  "Your own storefront",
];

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
  [
    "ONDC network",
    "Paytm, PhonePe Pincode, Magicpin and every other buyer app, for shoppers near you.",
    "Free",
  ],
  [
    "Your storefront",
    "A web shop with your brand. Customers cart up and order on your WhatsApp.",
    "Free",
  ],
  [
    "Shopify",
    "Your own branded store, created and kept in sync with one click.",
    "Sync",
  ],
  [
    "Amazon & Flipkart",
    "Barcode-matched offers on Amazon.in, ready-filled listing sheets for Flipkart.",
    "Match & list",
  ],
] as const;

const ADVICE = [
  {
    icon: TrendingUp,
    text: "“Aashirvaad Atta 5 kg” is a best seller and running low. Restock before Saturday.",
  },
  {
    icon: Lightbulb,
    text: "18 listings have no photo. Products with photos sell far more.",
  },
  {
    icon: IndianRupee,
    text: "Most orders arrive 7–8pm. Keep the shop phone close.",
  },
];

export default function Home() {
  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-dots [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]"
        />
        <div className="container relative pt-16 pb-16 text-center sm:pt-24 lg:pt-28">
          <HeroScannedCard className="top-[19rem] left-6" />
          <HeroOrdersCard className="top-[22rem] right-6" />

          <Eyebrow className="animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
            <span className="size-1.5 rounded-full bg-primary" /> Now an ONDC
            seller app
            <span lang="hi" className="text-foreground/60">
              · दुकान से ऑनलाइन
            </span>
          </Eyebrow>

          <h1 className="mx-auto mt-6 max-w-4xl text-[2.6rem] leading-[1.06] font-semibold text-balance animate-in fade-in-0 slide-in-from-bottom-3 duration-700 sm:text-6xl lg:text-7xl">
            <span className="text-foreground/80">Your whole shop,</span>{" "}
            <span className="text-primary">online by evening.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty animate-in fade-in-0 slide-in-from-bottom-3 duration-700 [animation-delay:120ms] [animation-fill-mode:both] sm:text-lg">
            A kirana stocks a thousand things, and typing them into a
            marketplace takes weeks. Onboarder makes it an afternoon: scan the
            packets, tick the loose staples, photograph the handmade. Then sell
            on ONDC, Shopify, Amazon and your own WhatsApp store.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3 animate-in fade-in-0 slide-in-from-bottom-3 duration-700 [animation-delay:220ms] [animation-fill-mode:both]">
            <Button asChild size="xl" variant="glow">
              <Link href="/auth/register">
                Start free <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="xl" variant="secondary">
              <Link href="#how">See how it works</Link>
            </Button>
          </div>

          <ul className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            {["Free for 100 products", "No card needed", "Zero commission"].map(
              (t) => (
                <li key={t} className="flex items-center gap-2">
                  <BadgeCheck className="size-4 text-primary" /> {t}
                </li>
              ),
            )}
          </ul>
        </div>

        {/* Reach marquee */}
        <div className="border-y bg-card/50 py-5">
          <Marquee duration={45}>
            {REACH.map((r) => (
              <span
                key={r}
                className="mx-8 text-lg font-semibold whitespace-nowrap text-foreground/35 sm:mx-10 sm:text-xl"
              >
                {r}
              </span>
            ))}
          </Marquee>
        </div>
      </section>

      {/* ---------- Problem + product tour ---------- */}
      <section id="how" className="container scroll-mt-24 py-24 sm:py-32">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-4 text-3xl leading-[1.15] font-semibold text-balance sm:text-[2.5rem]">
              Every kind of product has its own fast lane.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
              Not everything in your shop has a barcode, and that's fine.
              Onboarder treats packaged, loose and handmade goods differently
              because they are different.
            </p>
          </Reveal>
        </div>
        <Reveal delay={150} className="mt-12">
          <ProductTour />
        </Reveal>
        <div className="mt-14 grid gap-8 border-t pt-10 sm:grid-cols-3">
          {[
            ["1,000+", "items in a typical kirana. Built for that scale."],
            ["3 ways", "to add products, matched to how you actually sell."],
            ["1 tap", "to go live on ONDC once your shop details are in."],
          ].map(([big, small], i) => (
            <Reveal key={big} delay={i * 80}>
              <div className="text-4xl font-semibold text-primary tabular">
                {big}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{small}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Lanes bento ---------- */}
      <section className="border-y bg-band">
        <div className="container py-24 sm:py-28">
          <SectionHeading
            align="center"
            eyebrow="Three lanes"
            title="From shelf to listing, the way you already work"
            body="Already keep stock in Excel, Tally, Vyapar or Marg? Import the whole list from a spreadsheet in one go."
          />
          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {LANES.map((l, i) => (
              <Reveal
                key={l.title}
                delay={i * 100}
                className="flex flex-col rounded-2xl border bg-card p-6 transition-shadow hover:shadow-soft"
              >
                <div className="rounded-xl border bg-background p-4">
                  {l.visual}
                </div>
                <div className="mt-6 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  {l.kicker}
                </div>
                <h3 className="mt-1.5 text-lg font-semibold">{l.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                  {l.body}
                </p>
                <div className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full border border-sage/60 bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                  <Check className="size-3.5" /> {l.stat}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Channels hub ---------- */}
      <section className="container py-24 sm:py-32">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <SectionHeading
              eyebrow="Sell everywhere"
              title="One catalog. Every place your customers shop."
              body="Add a product once. Onboarder keeps the price, stock and photos in step across every channel you switch on."
            />
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {CHANNELS.map(([name, body, tag]) => (
                <li key={name} className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{name}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {tag}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={150}>
            <ChannelHub />
          </Reveal>
        </div>
      </section>

      {/* ---------- ONDC (forest band) ---------- */}
      <section
        id="ondc"
        className="scroll-mt-20 bg-forest text-forest-foreground"
      >
        <div className="container grid items-center gap-12 py-24 sm:py-28 lg:grid-cols-2">
          <Reveal>
            <Eyebrow className="border-white/15 bg-white/5 text-forest-foreground/75">
              Open Network for Digital Commerce
            </Eyebrow>
            <h2 className="mt-4 text-3xl leading-[1.15] font-semibold text-balance sm:text-[2.5rem]">
              One listing. Every shopping app in India.
            </h2>
            <p className="mt-5 leading-relaxed text-forest-foreground/70 text-pretty">
              ONDC is India's open network for commerce. Instead of joining one
              marketplace, your shop joins the network, and shoppers can find it
              from Paytm, PhonePe Pincode, Magicpin and every other buyer app,
              matched by how close you are.
            </p>
            <ul className="mt-7 space-y-3 text-sm text-forest-foreground/75">
              {[
                "Onboarder is your seller app: we handle the protocol, signing and compliance.",
                "We check your GSTIN, FSSAI, address and every product before you go live.",
                "Orders land in your dashboard; each status you tap reaches the buyer's app.",
                "No commission to Onboarder. Ever.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-[oklch(0.86_0.13_140)]" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={150}>
            <OndcChecklistVisual />
          </Reveal>
        </div>
      </section>

      {/* ---------- Advice ---------- */}
      <section className="container py-24 sm:py-32">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.15fr]">
          <Reveal>
            <SectionHeading
              eyebrow="Then it helps you sell"
              title="Advice, not just charts."
              body="Every order, from ONDC, Shopify or your own counter, feeds one simple view of your shop. Onboarder scores every listing, tells you which fix will sell the most, and rewrites weak listings with AI in one tap."
            />
            <ul className="mt-8 space-y-3">
              {ADVICE.map((a) => (
                <li
                  key={a.text}
                  className="flex gap-3 rounded-xl border bg-card p-3.5 text-sm"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                    <a.icon className="size-4" />
                  </span>
                  <span className="pt-1 text-muted-foreground">{a.text}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={150}>
            <div className="rounded-3xl border bg-band p-3">
              <div className="rounded-2xl border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Sales</div>
                    <div className="text-xs text-muted-foreground">
                      Sharma General Store · last 14 days
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-chart-1" /> Online
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-2 rounded-full bg-chart-2" />{" "}
                      Counter
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tabular">
                    ₹48,960
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    +31% since ONDC
                  </span>
                </div>
                <div className="mt-2 -mx-2">
                  <SalesPreview />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Pricing ---------- */}
      <section id="pricing" className="scroll-mt-20 border-y bg-band">
        <div className="container py-24 sm:py-28">
          <SectionHeading
            align="center"
            eyebrow="Pricing"
            title="Simple plans. No commission."
            body="Start free and upgrade when you're selling every day."
          />
          <div className="mt-14">
            <PricingCards />
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="container py-24 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <SectionHeading
              eyebrow="FAQ"
              title="Questions shopkeepers ask"
              body="Can't find yours? We read every message."
            />
            <Button asChild variant="secondary" className="mt-6">
              <Link href="/faq">
                All questions <ArrowRight />
              </Link>
            </Button>
          </div>
          <Accordion
            type="single"
            collapsible
            defaultValue={FAQS[0]?.q}
            className="space-y-3"
          >
            {FAQS.slice(0, 5).map((f) => (
              <AccordionItem
                key={f.q}
                value={f.q}
                className="rounded-xl border bg-card px-5 data-[state=open]:shadow-soft"
              >
                <AccordionTrigger className="text-left text-[15px] hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="relative overflow-hidden border-t bg-band">
        <div
          aria-hidden
          className="absolute inset-0 bg-dots [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)]"
        />
        <div className="container relative py-24 text-center sm:py-28">
          <h2 className="mx-auto max-w-3xl text-3xl leading-[1.12] font-semibold text-balance sm:text-5xl">
            Open your shop to the{" "}
            <span className="text-primary">whole city tonight.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            Start with the shelf in front of you. Your first 100 products are
            free.
          </p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {["ONDC seller app", "WhatsApp storefront", "AI photos"].map(
              (t) => (
                <li
                  key={t}
                  className="inline-flex items-center gap-1 rounded-md border border-sage/60 bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  <Check className="size-3" /> {t}
                </li>
              ),
            )}
          </ul>
          <Button asChild size="xl" variant="glow" className="mt-9">
            <Link href="/auth/register">
              Start free <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
