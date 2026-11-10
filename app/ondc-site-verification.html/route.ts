import { isOndcConfigured, ondcConfig, siteVerificationSignature } from "@/lib/ondc/server";

export const dynamic = "force-dynamic";

// https://<subscriber_id>/ondc-site-verification.html, checked by the registry on /subscribe.
// Contains ONDC_REQUEST_ID signed (without hashing) with our Ed25519 signing key.
export function GET() {
  if (!isOndcConfigured() || !ondcConfig().requestId) {
    return new Response("ONDC is not configured", { status: 404 });
  }
  const html = `<html>
  <head>
    <meta name='ondc-site-verification' content='${siteVerificationSignature()}' />
  </head>
  <body>ONDC Site Verification Page</body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
