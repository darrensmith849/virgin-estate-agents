"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";

import { updateSettings, type SettingsFormState } from "@/lib/actions/settings";
import type { AgencySettings } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { DEFAULT_KIND_LABELS, DEFAULT_SPEC_LABELS } from "@/lib/constants";
import { resolveVocabulary } from "@/lib/vocabulary";

export function SettingsForm({ settings }: { settings: AgencySettings }) {
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(
    updateSettings,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};
  // Show what the site is using today, defaults included, so the boxes are
  // never mysteriously blank. Clearing one restores that default on save.
  const vocab = resolveVocabulary(settings);

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
        <h2 className="text-lg">Wording &amp; options</h2>
        <p className="mt-1 text-sm text-muted">
          Rename what things are called on the site, and choose what staff can
          pick from when adding a property. Clear a box to restore its default.
        </p>

        <h3 className="mt-6 text-sm font-medium text-ink">Specification labels</h3>
        <p className="mt-1 text-sm text-muted">
          Used on property cards and detail pages — e.g. call bedrooms “Rooms”.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(DEFAULT_SPEC_LABELS) as (keyof typeof DEFAULT_SPEC_LABELS)[]).map(
            (key) => (
              <Field key={key} label={DEFAULT_SPEC_LABELS[key]} htmlFor={`specLabel_${key}`}>
                <Input
                  id={`specLabel_${key}`}
                  name={`specLabel_${key}`}
                  defaultValue={vocab.specLabels[key]}
                  placeholder={DEFAULT_SPEC_LABELS[key]}
                />
              </Field>
            ),
          )}
        </div>

        <h3 className="mt-8 text-sm font-medium text-ink">Listing type wording</h3>
        <p className="mt-1 text-sm text-muted">
          The two types themselves are fixed — they drive rent periods, filters
          and how listings are grouped — but you choose what they’re called.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {(Object.keys(DEFAULT_KIND_LABELS) as (keyof typeof DEFAULT_KIND_LABELS)[]).map(
            (key) => (
              <Field key={key} label={DEFAULT_KIND_LABELS[key]} htmlFor={`kindLabel_${key}`}>
                <Input
                  id={`kindLabel_${key}`}
                  name={`kindLabel_${key}`}
                  defaultValue={vocab.kindLabels[key]}
                  placeholder={DEFAULT_KIND_LABELS[key]}
                />
              </Field>
            ),
          )}
        </div>

        <h3 className="mt-8 text-sm font-medium text-ink">Property types</h3>
        <p className="mt-1 text-sm text-muted">
          One per line. These are the suggestions offered when adding a
          property — staff can still type anything not on the list.
        </p>
        <div className="mt-3">
          <Textarea
            id="propertyTypeOptions"
            name="propertyTypeOptions"
            defaultValue={vocab.propertyTypeOptions.join("\n")}
            rows={7}
          />
        </div>

        <h3 className="mt-8 text-sm font-medium text-ink">Features</h3>
        <p className="mt-1 text-sm text-muted">
          One per line. Rename, reorder, remove or add as many as you like —
          staff can also add one-off features to an individual property.
        </p>
        <div className="mt-3">
          <Textarea
            id="featureOptions"
            name="featureOptions"
            defaultValue={vocab.featureOptions.join("\n")}
            rows={10}
          />
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
