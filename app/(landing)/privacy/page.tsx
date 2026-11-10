import type { Metadata } from "next";
import Privacy from "./privacy.mdx";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <section className="container max-w-3xl py-20">
      <article className="prose prose-stone prose-lg max-w-none dark:prose-invert prose-headings:font-serif prose-headings:font-normal prose-h1:text-5xl">
        <Privacy />
      </article>
    </section>
  );
}
