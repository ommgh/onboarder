import type { Metadata } from "next";
import { FAQS } from "@/components/marketing/faq-data";
import { PricingCards } from "@/components/marketing/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free for your first 100 products. No commission on sales.",
};

export default function PricingPage() {
  const relevant = FAQS.filter((f) => /commission|ONDC\?|safe/i.test(f.q));
  return (
    <div className="container py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-serif text-5xl tracking-tight sm:text-6xl">
          Pricing
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A flat plan, never a cut of your sales. ONDC and your WhatsApp
          storefront are included on every plan.
        </p>
      </div>
      <div className="mt-14">
        <PricingCards />
      </div>
      <div className="mx-auto mt-20 max-w-3xl space-y-8">
        {relevant.map((f) => (
          <div key={f.q}>
            <h2 className="font-medium">{f.q}</h2>
            <p className="mt-2 text-muted-foreground">{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
