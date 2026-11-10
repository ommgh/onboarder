"use server";

import { Resend } from "resend";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Please tell us your name").max(80),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().max(20).optional(),
  topic: z.enum(["seller", "ondc", "partnership", "support", "other"]),
  message: z
    .string()
    .trim()
    .min(10, "A little more detail helps us reply properly")
    .max(4000),
  website: z.string().max(0).optional(), // honeypot
});

export type ContactState = { ok?: boolean; error?: string };

export async function sendContact(
  _prev: ContactState,
  form: FormData,
): Promise<ContactState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? "Please check the form.",
    };
  const { website: _hp, ...data } = parsed.data;
  const to = process.env.CONTACT_EMAIL;
  if (!to || !process.env.RESEND_API_KEY) {
    console.warn(
      "[contact] CONTACT_EMAIL or RESEND_API_KEY missing; message:",
      data,
    );
    return { ok: true };
  }
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.RESEND_FROM ?? "Onboarder <onboarding@resend.dev>",
    to,
    replyTo: data.email,
    subject: `[Onboarder · ${data.topic}] ${data.name}`,
    text: `${data.message}\n\n— ${data.name} <${data.email}>${data.phone ? ` · ${data.phone}` : ""}`,
  });
  if (error) {
    console.error("[contact] send failed", error);
    return {
      error: "Couldn't send right now. Please email us directly instead.",
    };
  }
  return { ok: true };
}
