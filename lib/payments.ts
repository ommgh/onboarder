import "server-only";
import DodoPayments from "dodopayments";

let client: DodoPayments | null = null;
/** Created on first use so a missing key only affects checkout, not the whole app. */
export function dodopayments() {
  client ??= new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY,
    environment:
      process.env.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
        ? "test_mode"
        : "live_mode",
  });
  return client;
}

// Paid plans map to Dodo subscription products. Env overrides the ids used historically.
export const PLAN_PRODUCTS = {
  PRO: process.env.DODO_PAYMENTS_PRO_SUB ?? "pdt_ssW6HXq65rzlhoRZnHrbN",
  ENTERPRISE:
    process.env.DODO_PAYMENTS_ENTERPRISE_SUB ?? "pdt_L3eeBfmNkeLTUEdnfBWjJ",
} as const;

export function planForProduct(
  productId: string,
): keyof typeof PLAN_PRODUCTS | null {
  return (
    (Object.entries(PLAN_PRODUCTS).find(
      ([, id]) => id === productId,
    )?.[0] as keyof typeof PLAN_PRODUCTS) ?? null
  );
}
