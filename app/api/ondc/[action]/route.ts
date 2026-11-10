import { after, NextResponse } from "next/server";
import {
  type OndcAction,
  receive,
  SUPPORTED_ACTIONS,
} from "@/lib/ondc/handlers";
import { isOndcConfigured, nack, verifyIncoming } from "@/lib/ondc/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Beckn seller-side (BPP) endpoints: POST /api/ondc/{search,select,init,confirm,status,cancel,track,support,update}
export async function POST(
  req: Request,
  ctx: { params: Promise<{ action: string }> },
) {
  const { action } = await ctx.params;
  if (!SUPPORTED_ACTIONS.includes(action as OndcAction)) {
    return NextResponse.json(
      nack("CONTEXT-ERROR", "10000", `Unsupported action: ${action}`),
      { status: 404 },
    );
  }
  if (!isOndcConfigured()) {
    return NextResponse.json(
      nack("POLICY-ERROR", "10002", "Seller app is not configured"),
      { status: 503 },
    );
  }
  const rawBody = await req.text();
  const verification = await verifyIncoming(rawBody, req.headers);
  const { status, body, job } = await receive(
    action as OndcAction,
    rawBody,
    verification,
  );
  if (job) after(job);
  return NextResponse.json(body, { status });
}
