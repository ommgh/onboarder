import type { Metadata } from "next";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="container grid max-w-5xl gap-12 py-20 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <h1 className="text-4xl font-semibold sm:text-5xl">Talk to us</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Setting up your shop, joining ONDC, or partnering with us: we read
          every message and usually reply within a working day.
        </p>
      </div>
      <ContactForm />
    </div>
  );
}
