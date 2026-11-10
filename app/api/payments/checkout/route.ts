import { z } from "zod";
import { appUrl } from "@/lib/config";
import { dodopayments, PLAN_PRODUCTS } from "@/lib/payments";
import { handler, ok, parseJson } from "@/lib/server/api";
import { HttpError } from "@/lib/server/session";
import { auth } from "@/auth";

// POST { plan: "PRO" | "ENTERPRISE" } -> { url } hosted checkout link
export const POST = handler(async (req: Request) => {
  const session = await auth();
  if (!session?.user?.email) throw new HttpError(401, "Sign in to upgrade.", "UNAUTHENTICATED");
  const { plan } = await parseJson(req, z.object({ plan: z.enum(["PRO", "ENTERPRISE"]) }));
  try {
    const checkout = await dodopayments.subscriptions.create({
      billing: { city: "", country: "IN", state: "", street: "", zipcode: "" },
      customer: { email: session.user.email, name: session.user.name ?? session.user.email },
      product_id: PLAN_PRODUCTS[plan],
      quantity: 1,
      payment_link: true,
      return_url: process.env.DODO_PAYMENTS_RETURN_URL ?? `${appUrl()}/dashboard/settings?upgraded=1`,
    });
    if (!checkout.payment_link) throw new Error("No payment link returned");
    return ok({ url: checkout.payment_link });
  } catch (e) {
    console.error("[payments] checkout failed", e);
    throw new HttpError(502, "Couldn't start checkout. Please try again in a minute.");
  }
});
