import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ScanQueueVisual } from "@/components/marketing/visuals";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Link href="/" aria-label="Onboarder home" className="self-start">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
      </div>
      <div className="relative hidden overflow-hidden bg-stone-950 p-12 text-stone-100 lg:flex lg:flex-col lg:justify-center">
        <div aria-hidden className="absolute inset-0 bg-ledger opacity-10" />
        <div className="relative mx-auto w-full max-w-md">
          <p className="font-serif text-4xl leading-tight text-balance">
            Scan the shelf. Tick the staples.{" "}
            <em className="text-amber-300">Sell everywhere.</em>
          </p>
          <p className="mt-3 text-stone-400">
            Built so a neighbourhood shop can put a thousand products online in
            an afternoon.
          </p>
          <div className="mt-10 text-foreground">
            <ScanQueueVisual />
          </div>
        </div>
      </div>
    </div>
  );
}
