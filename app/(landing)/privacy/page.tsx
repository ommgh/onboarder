import type { Metadata } from "next";
import Privacy from "./privacy.mdx";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <section className="container max-w-3xl py-20">
      <article className="prose prose-stone prose-lg max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-4xl prose-a:text-primary">
        <Privacy />
      </article>
    </section>
  );
}
