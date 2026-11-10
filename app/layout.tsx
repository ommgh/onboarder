import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Noto_Sans_Devanagari } from "next/font/google";
import Script from "next/script";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { appUrl } from "@/lib/config";
import "@/styles/globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument" });
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "500", "600"], variable: "--font-devanagari" });

// Public site token for visitors.now analytics.
const VISITORS_TOKEN = process.env.NEXT_PUBLIC_VISITORS_TOKEN ?? "4a467a0f-2672-44bf-8ed5-513fa1bfc85b";

const description =
  "Onboarder takes a neighbourhood shop online in an afternoon: scan packaged goods, pick loose staples, photograph handmade work, then sell on ONDC, Shopify, Amazon and your own storefront.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: "Onboarder: put your whole shop online", template: "%s · Onboarder" },
  description,
  keywords: ["ONDC seller app", "kirana online", "sell on ONDC", "catalog from barcode", "small business ecommerce India", "Shopify India", "product photos AI"],
  icons: {
    icon: [
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/favicon/site.webmanifest",
  openGraph: {
    title: "Onboarder: put your whole shop online",
    description,
    siteName: "Onboarder",
    locale: "en_IN",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Onboarder" }],
  },
  twitter: { card: "summary_large_image", creator: "@ommshx", images: ["/og-image.png"] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#191613" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} ${instrument.variable} ${devanagari.variable} font-sans`}>
        <SessionProvider session={session}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            {children}
            <Toaster richColors position="top-center" />
          </ThemeProvider>
        </SessionProvider>
        <Analytics />
        {VISITORS_TOKEN ? (
          <Script src="https://cdn.visitors.now/v.js" data-token={VISITORS_TOKEN} strategy="afterInteractive" />
        ) : null}
      </body>
    </html>
  );
}
