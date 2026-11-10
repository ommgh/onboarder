import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const COLS = [
  {
    title: "Product",
    links: [
      ["How it works", "/#how"],
      ["Sell on ONDC", "/#ondc"],
      ["Pricing", "/pricing"],
      ["FAQ", "/faq"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Contact", "/contact"],
      ["Privacy", "/privacy"],
    ],
  },
  {
    title: "Follow",
    links: [
      ["X (Twitter)", "https://x.com/ommshx"],
      ["LinkedIn", "https://www.linkedin.com/in/ommlinkd/"],
      ["GitHub", "https://github.com/ommgh/onboarder"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm text-muted-foreground text-pretty">
            Taking India's neighbourhood shops online, one shelf at a time.{" "}
            <span lang="hi">दुकान से ऑनलाइन।</span>
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <div className="text-sm font-medium">{c.title}</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="hover:text-foreground"
                    {...(href.startsWith("http")
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container flex flex-col gap-2 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <span>© {new Date().getFullYear()} Onboarder. Made in India.</span>
        <span>
          ONDC is an initiative of DPIIT, Government of India. Onboarder is an
          independent seller application.
        </span>
      </div>
    </footer>
  );
}
