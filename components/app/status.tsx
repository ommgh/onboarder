import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success/12 text-success",
  warning: "bg-warning/18 text-[oklch(0.45_0.1_70)] dark:text-warning",
  danger: "bg-destructive/12 text-destructive",
  info: "bg-chart-3/12 text-chart-3",
  primary: "bg-primary/12 text-primary",
};

export function Pill({ tone = "neutral", children, className, dot }: { tone?: Tone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", TONES[tone], className)}>
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export const ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  CREATED: { label: "New", tone: "primary" },
  ACCEPTED: { label: "Accepted", tone: "primary" },
  PACKED: { label: "Packed", tone: "info" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", tone: "info" },
  DELIVERED: { label: "Delivered", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
  RETURNED: { label: "Returned", tone: "warning" },
};

export const LISTING_STATUS: Record<string, { label: string; tone: Tone }> = {
  LIVE: { label: "Live", tone: "success" },
  PENDING: { label: "Needs sync", tone: "warning" },
  NEEDS_ACTION: { label: "Needs action", tone: "danger" },
  FAILED: { label: "Failed", tone: "danger" },
  PAUSED: { label: "Paused", tone: "neutral" },
};

export const PRODUCT_STATUS: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: "Active", tone: "success" },
  DRAFT: { label: "Draft", tone: "neutral" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
};

export const SOURCE_LABEL: Record<string, string> = {
  MANUAL: "In store",
  ONDC: "ONDC",
  SHOPIFY: "Shopify",
  AMAZON: "Amazon",
  FLIPKART: "Flipkart",
  STOREFRONT: "Storefront",
};
