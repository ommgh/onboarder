import type { Plan } from "@prisma/client";

export interface PlanLimits {
  label: string;
  products: number;
  models: number;
  /** AI generations (detection, enhancement, try-on, copywriting) per 30 days */
  aiCredits: number;
  /** Marketplace connections (Shopify, Amazon, Flipkart). ONDC and the storefront are always free. */
  channels: number;
}

// The product limit is the number that matters to a kirana with 1,000+ SKUs, so the
// free plan is generous enough to genuinely get a small shop online.
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: { label: "Free", products: 100, models: 2, aiCredits: 30, channels: 1 },
  PRO: {
    label: "Pro",
    products: 2000,
    models: 10,
    aiCredits: 500,
    channels: 3,
  },
  ENTERPRISE: {
    label: "Enterprise",
    products: 20000,
    models: 50,
    aiCredits: 5000,
    channels: 10,
  },
};

export function limitsFor(plan: Plan | null | undefined): PlanLimits {
  return PLAN_LIMITS[plan ?? "FREE"];
}

export const AI_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Display prices. These must match the Dodo Payments products configured for checkout
 * (DODO_PAYMENTS_PRO_SUB / DODO_PAYMENTS_ENTERPRISE_SUB); change both together.
 */
export const PLAN_PRICES: Record<Plan, { amount: string; period: string }> = {
  FREE: { amount: "Free", period: "forever" },
  PRO: { amount: "₹499", period: "per month" },
  ENTERPRISE: { amount: "₹4,999", period: "per month" },
};
