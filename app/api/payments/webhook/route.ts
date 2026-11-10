import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { db } from "@/lib/db";
import { planForProduct } from "@/lib/payments";
import { PLAN_LIMITS } from "@/lib/plans";

interface SubscriptionPayload {
  type: string;
  data: {
    product_id?: string;
    subscription_id?: string;
    status?: string;
    next_billing_date?: string;
    customer?: { customer_id: string; email: string };
  };
}

const ENDED = new Set(["cancelled", "expired", "failed", "on_hold"]);

export async function POST(request: Request) {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Webhook secret is not configured" },
      { status: 500 },
    );

  const rawBody = await request.text();
  try {
    new Webhook(secret).verify(rawBody, {
      "webhook-id": request.headers.get("webhook-id") ?? "",
      "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": request.headers.get("webhook-signature") ?? "",
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 },
    );
  }

  const payload = JSON.parse(rawBody) as SubscriptionPayload;
  if (!payload.type?.startsWith("subscription."))
    return NextResponse.json({ received: true });
  const { data } = payload;
  const email = data.customer?.email;
  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  if (!user)
    return NextResponse.json({ received: true, note: "unknown customer" });

  const paidPlan = data.product_id ? planForProduct(data.product_id) : null;
  const ended =
    ENDED.has((data.status ?? "").toLowerCase()) ||
    payload.type === "subscription.cancelled";
  const plan = ended || !paidPlan ? "FREE" : paidPlan;
  const limits = PLAN_LIMITS[plan];

  await db.subscription.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });
  await db.subscription.update({
    where: { userId: user.id },
    data: {
      name: plan,
      status: data.status ?? null,
      dodoCustomerId: data.customer?.customer_id,
      dodoSubscriptionId: data.subscription_id,
      nextBillingDate: ended ? null : (data.next_billing_date ?? null),
      productLimit: limits.products,
      modelLimit: limits.models,
      storeLimit: 1,
      analytics: plan !== "FREE",
      branding: plan === "ENTERPRISE",
    },
  });
  return NextResponse.json({ received: true });
}
