import { cn } from "@/lib/utils";

/** The Onboarder mark: a scanner frame around a pointer, i.e. a product going online. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 39 33"
      fill="none"
      aria-hidden="true"
      className={cn("size-7", className)}
    >
      <path d="M36.67 11.84V1.5H25.5" stroke="currentColor" strokeWidth="3" />
      <path d="M11.84 1.5H1.5v11.17" stroke="currentColor" strokeWidth="3" />
      <path d="M26.5 31.5h10v-11" stroke="currentColor" strokeWidth="3" />
      <path
        d="M20.5 11.5 8.5 16l10 1.5 3.59 8.5 3.41-8.5 4-9-9 3Z"
        className="fill-primary stroke-primary"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  wordmark = true,
}: {
  className?: string;
  wordmark?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-foreground",
        className,
      )}
    >
      <LogoMark />
      {wordmark ? (
        <span className="text-[17px] font-semibold tracking-tight">
          Onboarder
        </span>
      ) : null}
    </span>
  );
}
