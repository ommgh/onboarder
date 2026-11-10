import type { Metadata } from "next";
import Link from "next/link";
import { FAQS } from "@/components/marketing/faq-data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <div className="container max-w-3xl py-20">
      <h1 className="font-serif text-5xl tracking-tight sm:text-6xl">
        Questions
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Can't find your answer?{" "}
        <Link
          href="/contact"
          className="text-primary underline-offset-4 hover:underline"
        >
          Write to us
        </Link>
        .
      </p>
      <Accordion type="multiple" className="mt-10">
        {FAQS.map((f) => (
          <AccordionItem key={f.q} value={f.q}>
            <AccordionTrigger className="text-left text-base">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="text-base text-muted-foreground">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
