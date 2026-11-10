import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="container max-w-3xl py-20">
      <h1 className="text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl">
        Built for the shop at the end of your street.
      </h1>
      <div className="mt-10 space-y-6 text-lg leading-relaxed text-muted-foreground">
        <p>
          India has more than a crore neighbourhood shops. They know their
          customers by name, stock exactly what the locality needs, and deliver
          faster than any warehouse. Yet most of them are invisible online.
        </p>
        <p>
          The reason isn't a lack of ambition. It's the catalog. A typical
          kirana carries well over a thousand items, many of them without a
          barcode, and every marketplace expects each one typed in by hand with
          photos, sizes and compliance details. That's weeks of work nobody
          running a shop has.
        </p>
        <p>
          When ONDC launched to open up digital commerce to everyone, it removed
          the marketplace gatekeeper. Onboarder exists to remove the second
          barrier, the catalog, by giving each kind of product its own fast path
          online: scanning for packaged goods, a ready-made list for loose
          staples, and AI for handmade work.
        </p>
        <p className="text-foreground">
          We'd love to hear from shopkeepers, ONDC buyer apps and anyone working
          on Bharat's digital commerce.
        </p>
      </div>
      <div className="mt-10 flex gap-3">
        <Button asChild size="lg">
          <Link href="/auth/register">Start free</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/contact">Get in touch</Link>
        </Button>
      </div>
    </div>
  );
}
