"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
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
  const signedIn = status === "authenticated";
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" aria-label="Onboarder home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
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
          className="grid size-10 place-items-center md:hidden"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      <div
        className={cn(
          "border-t bg-background md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav className="container flex flex-col py-3">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="py-3 text-base"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2 pb-2">
            <Button asChild variant="outline">
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
    </header>
  );
}
