import "server-only";
import { Resend } from "resend";
import { appUrl } from "@/lib/config";

let resend: Resend | null = null;
function client() {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}
// onboarding@resend.dev only delivers to the Resend account owner; set a verified sender.
const FROM = process.env.RESEND_FROM ?? "Onboarder <onboarding@resend.dev>";

export const sendVerificationEmail = async (email: string, token: string) => {
  const link = `${appUrl()}/auth/new-verification?token=${encodeURIComponent(token)}`;
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[mail] RESEND_API_KEY not set; verification link: ${link}`);
    return;
  }
  const { error } = await client().emails.send({
    from: FROM,
    to: email,
    subject: "Confirm your email for Onboarder",
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1c1917">
      <h2 style="margin:0 0 12px">Welcome to Onboarder</h2>
      <p>Confirm your email to start putting your shop online.</p>
      <p><a href="${link}" style="display:inline-block;background:#c2410c;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Confirm email</a></p>
      <p style="color:#78716c;font-size:13px">This link expires in one hour. If you didn't sign up, ignore this email.</p>
    </div>`,
  });
  if (error) console.error("[mail] verification email failed", error);
};
