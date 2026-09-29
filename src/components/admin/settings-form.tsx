"use client";

import { useActionState, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

import { updateSettings, type SettingsFormState } from "@/lib/actions/settings";
import type { AgencySettings } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { DEFAULT_KIND_LABELS, DEFAULT_SPEC_LABELS } from "@/lib/constants";
import { resolveVocabulary } from "@/lib/vocabulary";

type Testimonial = { quote: string; name: string; area?: string };
const MAX_TESTIMONIALS = 12;

/*
 * Client testimonials for the homepage. Real quotes only: the section stays
 * hidden on the site until at least one is saved here.
 */
function TestimonialsEditor({ initial }: { initial: Testimonial[] }) {
  const [rows, setRows] = useState<(Testimonial & { key: number })[]>(
    initial.map((t, i) => ({ ...t, key: i })),
  );
  const [nextKey, setNextKey] = useState(initial.length);
  const update = (key: number, field: keyof Testimonial, value: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  return (
    <section className="rounded-xl border border-line bg-card p-6">
      <h2 className="text-lg">Testimonials</h2>
      <p className="mt-1 text-sm text-muted">
        Quotes from real clients, shown on the homepage under &ldquo;What our clients say&rdquo;.
        The section only appears once there&rsquo;s at least one.
      </p>
      {/* Tells the save that this section was on the form. */}
      <input type="hidden" name="testimonialsPresent" value="1" />

      <div className="mt-5 space-y-4">
        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            No testimonials yet — the homepage section is hidden.
          </p>
        )}
        {rows.map((row, i) => (
          <div key={row.key} className="rounded-lg border border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-ink">Testimonial {i + 1}</p>
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                aria-label={`Remove testimonial ${i + 1}`}
                className="rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <Field label="Quote" htmlFor={`testimonialQuote-${row.key}`} className="mt-3">
              <Textarea
                id={`testimonialQuote-${row.key}`}
                name="testimonialQuote"
                value={row.quote}
                onChange={(e) => update(row.key, "quote", e.target.value)}
                rows={3}
                maxLength={600}
                placeholder="What the client said, in their words."
              />
            </Field>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Client name" htmlFor={`testimonialName-${row.key}`}>
                <Input
                  id={`testimonialName-${row.key}`}
                  name="testimonialName"
                  value={row.name}
                  onChange={(e) => update(row.key, "name", e.target.value)}
                  maxLength={80}
                  placeholder="e.g. The Moyo family"
                />
              </Field>
              <Field label="Area (optional)" htmlFor={`testimonialArea-${row.key}`}>
                <Input
                  id={`testimonialArea-${row.key}`}
                  name="testimonialArea"
                  value={row.area ?? ""}
                  onChange={(e) => update(row.key, "area", e.target.value)}
                  maxLength={60}
                  placeholder="e.g. Borrowdale"
                />
              </Field>
            </div>
          </div>
        ))}
      </div>

      {rows.length < MAX_TESTIMONIALS && (
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => {
            setRows((prev) => [...prev, { key: nextKey, quote: "", name: "", area: "" }]);
            setNextKey((k) => k + 1);
          }}
        >
          <Plus size={16} />
          Add a testimonial
        </Button>
      )}
    </section>
  );
}

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
      {Object.keys(fe).length > 0 && (
        <p className="rounded-[var(--radius)] bg-red-50 px-4 py-2.5 text-sm text-red-700">
          Nothing was saved — one of the boxes below has too much in it. Check
          the messages under each box and try again.
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
          Untick one you never use to hide it from the listing form.
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
                <label className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    name={`specShown_${key}`}
                    aria-label={`Use ${DEFAULT_SPEC_LABELS[key]} on listings`}
                    defaultChecked={!vocab.hiddenSpecs.includes(key)}
                    className="h-3.5 w-3.5 rounded border-line text-brand focus:ring-brand/30"
                  />
                  Use on listings
                </label>
              </Field>
            ),
          )}
        </div>

        <h3 className="mt-8 text-sm font-medium text-ink">Specification types</h3>
        <p className="mt-1 text-sm text-muted">
          One per line. Your own specifications — each appears as a ready-made
          box on every listing, filled in only where it applies. Staff can still
          add one-off details to an individual property.
        </p>
        <input type="hidden" name="specShownPresent" value="1" />
        <div className="mt-3">
          <Textarea
            id="specOptions"
            name="specOptions"
            aria-label="Specification types, one per line"
            defaultValue={vocab.specOptions.join("\n")}
            placeholder={"e.g.\nStudy\nStaff quarters\nBorehole\nSolar"}
            rows={6}
          />
          {fe.specOptions?.[0] && (
            <p className="mt-1 text-xs text-red-600">
              Up to 40 types, each up to 60 characters.
            </p>
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

      <TestimonialsEditor initial={settings.testimonials ?? []} />

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

      {/* Stays in view while scrolling a long form. */}
      <div className="sticky bottom-0 z-20 flex justify-end border-t border-line bg-paper/95 py-3 backdrop-blur">
        <Button type="submit" disabled={pending}>
          <Save size={16} />
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
