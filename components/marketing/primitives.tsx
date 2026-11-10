import { cn } from "@/lib/utils";

/** Small pill label that sits above a section heading. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-card/80 px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "left",
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  body?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-4 text-3xl font-semibold leading-[1.15] text-balance sm:text-[2.5rem]">
        {title}
      </h2>
      {body ? (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
          {body}
        </p>
      ) : null}
    </div>
  );
}

/** Infinite horizontal scroller. Children are rendered twice for a seamless loop. */
export function Marquee({
  children,
  className,
  duration = 40,
}: {
  children: React.ReactNode;
  className?: string;
  duration?: number;
}) {
  return (
    <div
      className={cn(
        "group relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]",
        className,
      )}
    >
      <div
        className="flex w-max shrink-0 animate-marquee items-center group-hover:[animation-play-state:paused]"
        style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div aria-hidden className="flex shrink-0 items-center">
          {children}
        </div>
      </div>
    </div>
  );
}
