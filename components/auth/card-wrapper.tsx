"use client";

import Link from "next/link";
import { Header } from "./header";
import { Social } from "./social";

interface CardWrapperProps {
  children: React.ReactNode;
  headerLabel: string;
  headerDescription?: string;
  backButtonLabel: string;
  backButtonHref: string;
  showSocials?: boolean;
}

export const CardWrapper = ({
  children,
  headerLabel,
  headerDescription,
  backButtonLabel,
  backButtonHref,
  showSocials,
}: CardWrapperProps) => (
  <div className="space-y-6">
    <Header label={headerLabel} description={headerDescription} />
    {showSocials ? (
      <>
        <Social />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or with email{" "}
          <span className="h-px flex-1 bg-border" />
        </div>
      </>
    ) : null}
    {children}
    <p className="text-center text-sm text-muted-foreground">
      <Link
        href={backButtonHref}
        className="font-medium text-foreground underline-offset-4 hover:underline"
      >
        {backButtonLabel}
      </Link>
    </p>
  </div>
);
