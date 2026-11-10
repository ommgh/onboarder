"use client";

import { ChevronDown } from "lucide-react";
import { ONDC_DOMAINS } from "@/lib/ondc/taxonomy";
import { UNITS } from "@/lib/products/units";
import { cn } from "@/lib/utils";

/** Native select: fast, accessible and right at home on phones. */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        {...props}
        className="h-9 w-full appearance-none rounded-md border border-input bg-transparent py-1 pr-8 pl-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export function OndcCategorySelect({ value, onChange, className, placeholder = "Choose category…", ...rest }: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  className?: string;
  placeholder?: string;
} & Omit<React.ComponentProps<"select">, "value" | "onChange">) {
  return (
    <NativeSelect value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} className={className} {...rest}>
      <option value="">{placeholder}</option>
      {ONDC_DOMAINS.map((d) => (
        <optgroup key={d.code} label={d.label}>
          {d.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </optgroup>
      ))}
    </NativeSelect>
  );
}

export function UnitSelect({ value, onChange, className }: { value: string | null | undefined; onChange: (v: string | null) => void; className?: string }) {
  return (
    <NativeSelect value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} className={className} aria-label="Unit">
      <option value="">unit</option>
      {UNITS.map((u) => (
        <option key={u.value} value={u.value}>
          {u.label}
        </option>
      ))}
    </NativeSelect>
  );
}

export function Field({ label, hint, error, children, className, htmlFor }: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Rupee-prefixed numeric input. */
export function MoneyInput({ value, onChange, className, ...props }: {
  value: number | string | null | undefined;
  onChange: (v: string) => void;
} & Omit<React.ComponentProps<"input">, "value" | "onChange">) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
      <input
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
        className="h-9 w-full rounded-md border border-input bg-transparent pr-2 pl-6 text-sm shadow-xs tabular outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
        {...props}
      />
    </div>
  );
}
