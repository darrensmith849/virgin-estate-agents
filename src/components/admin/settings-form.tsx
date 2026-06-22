"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";

import { updateSettings, type SettingsFormState } from "@/lib/actions/settings";
import type { AgencySettings } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";

export function SettingsForm({ settings }: { settings: AgencySettings }) {
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(
    updateSettings,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-6">
      {state?.ok && (
        <p className="rounded-[var(--radius)] bg-brand-50 px-4 py-2.5 text-sm text-brand">
          Settings saved.
        </p>
      )}

      <section className="rounded-xl border border-line bg-card p-6">
        <h2 className="text-lg">Agency details</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Agency name" htmlFor="name" error={fe.name?.[0]}>
            <Input id="name" name="name" defaultValue={settings.name ?? ""} required />
          </Field>
          <Field label="Tagline" htmlFor="tagline">
            <Input id="tagline" name="tagline" defaultValue={settings.tagline ?? ""} />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <Input id="phone" name="phone" defaultValue={settings.phone ?? ""} />
          </Field>
          <Field label="WhatsApp" htmlFor="whatsapp">
            <Input id="whatsapp" name="whatsapp" defaultValue={settings.whatsapp ?? ""} />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={settings.email ?? ""} />
          </Field>
          <Field label="Office address" htmlFor="officeAddress">
            <Input id="officeAddress" name="officeAddress" defaultValue={settings.officeAddress ?? ""} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-card p-6">
        <h2 className="text-lg">Homepage hero</h2>
        <div className="mt-5 space-y-4">
          <Field label="Headline" htmlFor="heroHeadline">
            <Input id="heroHeadline" name="heroHeadline" defaultValue={settings.heroHeadline ?? ""} />
          </Field>
          <Field label="Subheadline" htmlFor="heroSubheadline">
            <Textarea id="heroSubheadline" name="heroSubheadline" defaultValue={settings.heroSubheadline ?? ""} rows={2} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-card p-6">
        <h2 className="text-lg">Social links</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Field label="Facebook" htmlFor="facebook">
            <Input id="facebook" name="facebook" defaultValue={settings.facebook ?? ""} placeholder="https://…" />
          </Field>
          <Field label="Instagram" htmlFor="instagram">
            <Input id="instagram" name="instagram" defaultValue={settings.instagram ?? ""} placeholder="https://…" />
          </Field>
          <Field label="LinkedIn" htmlFor="linkedin">
            <Input id="linkedin" name="linkedin" defaultValue={settings.linkedin ?? ""} placeholder="https://…" />
          </Field>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Save size={16} />
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
