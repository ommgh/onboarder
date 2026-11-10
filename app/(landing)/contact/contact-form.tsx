"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useActionState } from "react";
import { type ContactState, sendContact } from "@/actions/contact";
import { Field, NativeSelect } from "@/components/app/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(
    sendContact,
    {},
  );
  if (state.ok) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border bg-card p-10 text-center">
        <CheckCircle2 className="size-10 text-success" />
        <h2 className="mt-4 text-xl font-semibold">Message sent</h2>
        <p className="mt-1 text-muted-foreground">
          Thanks for writing. We'll reply to your email soon.
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4 rounded-2xl border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" required autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </Field>
        <Field label="Phone (optional)" htmlFor="phone">
          <Input id="phone" name="phone" inputMode="tel" autoComplete="tel" />
        </Field>
        <Field label="About" htmlFor="topic">
          <NativeSelect id="topic" name="topic" defaultValue="seller">
            <option value="seller">Getting my shop online</option>
            <option value="ondc">ONDC questions</option>
            <option value="support">Help with my account</option>
            <option value="partnership">Partnership</option>
            <option value="other">Something else</option>
          </NativeSelect>
        </Field>
      </div>
      <Field label="Message" htmlFor="message">
        <Textarea id="message" name="message" rows={5} required />
      </Field>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null} Send message
      </Button>
    </form>
  );
}
