"use client";

import { useActionState } from "react";
import { Send, CheckCircle2 } from "lucide-react";

import { createEnquiry, type EnquiryFormState } from "@/lib/actions/enquiries";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";

export function EnquiryForm({
  listingId,
  listingTitle,
}: {
  listingId?: string;
  listingTitle?: string;
}) {
  const [state, action, pending] = useActionState<EnquiryFormState, FormData>(
    createEnquiry,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-line bg-brand-50 p-6 text-center">
        <CheckCircle2 className="mx-auto text-brand" size={28} />
        <p className="mt-3 font-medium text-ink">Thank you — enquiry sent.</p>
        <p className="mt-1 text-sm text-muted">
          Our team will be in touch with you shortly.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3.5">
      {listingId && <input type="hidden" name="listingId" value={listingId} />}

      <Field label="Name" htmlFor="name" error={fe.name?.[0]}>
        <Input id="name" name="name" placeholder="Your name" required />
      </Field>
      <Field label="Email" htmlFor="email" error={fe.email?.[0]}>
        <Input id="email" name="email" type="email" placeholder="you@email.com" required />
      </Field>
      <Field label="Phone / WhatsApp" htmlFor="phone">
        <Input id="phone" name="phone" placeholder="+263 …" />
      </Field>
      <Field label="Message" htmlFor="message" error={fe.message?.[0]}>
        <Textarea
          id="message"
          name="message"
          rows={4}
          defaultValue={
            listingTitle ? `Hi, I'd like to know more about "${listingTitle}".` : ""
          }
          required
        />
      </Field>

      <Button type="submit" disabled={pending} className="w-full">
        <Send size={16} />
        {pending ? "Sending…" : "Send enquiry"}
      </Button>
    </form>
  );
}
