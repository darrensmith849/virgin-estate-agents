"use client";

import { useActionState } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";

import { createEnquiry, type EnquiryFormState } from "@/lib/actions/enquiries";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { WhatsappIcon } from "@/components/site/whatsapp-icon";

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
        <p className="mt-3 font-medium text-ink">Thank you — enquiry received.</p>
        <p className="mt-1 text-sm text-muted">
          Our team will be in touch with you shortly.
        </p>
        {state.whatsappUrl && (
          <>
            <a
              href={state.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <WhatsappIcon size={17} />
              Continue on WhatsApp
            </a>
            <p className="mt-2 text-xs text-muted">
              For the quickest reply — opens a chat with your details ready to send.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3.5">
      {listingId && <input type="hidden" name="listingId" value={listingId} />}

      {state?.error && (
        <p className="flex items-start gap-2 rounded-[var(--radius)] bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}

      <Field label="Name" htmlFor="name" error={fe.name?.[0]}>
        <Input id="name" name="name" placeholder="Your name" maxLength={160} required />
      </Field>
      <Field label="Email" htmlFor="email" error={fe.email?.[0]}>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@email.com"
          maxLength={255}
          required
        />
      </Field>
      <Field label="Phone / WhatsApp" htmlFor="phone" error={fe.phone?.[0]}>
        <Input id="phone" name="phone" placeholder="+263 …" maxLength={40} />
      </Field>
      <Field label="Message" htmlFor="message" error={fe.message?.[0]}>
        <Textarea
          id="message"
          name="message"
          rows={4}
          maxLength={2000}
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
