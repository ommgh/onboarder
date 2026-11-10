"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#ondc", label: "ONDC" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

export function Navbar() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const signedIn = status === "authenticated";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3">
      <div
        className={cn(
          "mx-auto max-w-5xl rounded-2xl border transition-all duration-300",
          scrolled || open
            ? "border-border bg-card/85 shadow-soft backdrop-blur-md"
            : "border-transparent bg-transparent",
        )}
      >
        <div className="flex h-14 items-center justify-between pr-2 pl-4">
          <Link
            href="/"
            aria-label="Onboarder home"
            className="translate-y-[3px]"
          >
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 text-sm md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {signedIn ? (
              <Button asChild>
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/auth/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/register">Start free</Link>
                </Button>
              </>
            )}
          </div>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-lg md:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        <div className={cn("border-t md:hidden", open ? "block" : "hidden")}>
          <nav className="flex flex-col px-4 py-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-3 text-base font-medium"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 pb-3">
              <Button asChild variant="secondary">
                <Link href={signedIn ? "/dashboard" : "/auth/login"}>
                  {signedIn ? "Dashboard" : "Log in"}
                </Link>
              </Button>
              <Button asChild>
                <Link href="/auth/register">Start free</Link>
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
