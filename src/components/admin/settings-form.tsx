"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Plus, Save, ScanText, Trash2 } from "lucide-react";

import { updateSettings, type SettingsFormState } from "@/lib/actions/settings";
import type { AgencySettings } from "@/db/schema";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { DEFAULT_KIND_LABELS, DEFAULT_SPEC_LABELS } from "@/lib/constants";
import { resolveVocabulary } from "@/lib/vocabulary";

type Testimonial = { quote: string; name: string; area?: string };
const MAX_TESTIMONIALS = 12;
const MAX_QUOTE = 600;

type ReadNote = { busy: boolean; tone: "info" | "warn" | "error"; text: string };

/** The first picture among pasted or dropped files, if any. */
function pictureIn(files: FileList | null | undefined): File | undefined {
  return files ? Array.from(files).find((f) => f.type.startsWith("image/")) : undefined;
}

/*
 * Client testimonials for the homepage. Real quotes only: the section stays
 * hidden on the site until at least one is saved here. A quote can be read
 * straight from a screenshot (a WhatsApp message, an email, a Google review):
 * choose, paste or drop the picture and its words fill the box, ready to check.
 */
function TestimonialsEditor({ initial }: { initial: Testimonial[] }) {
  const [rows, setRows] = useState<(Testimonial & { key: number })[]>(
    initial.map((t, i) => ({ ...t, key: i })),
  );
  const [nextKey, setNextKey] = useState(initial.length);
  const [notes, setNotes] = useState<Record<number, ReadNote>>({});
  // The rows as they are now, for a picture that finishes reading later.
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  const update = (key: number, field: keyof Testimonial, value: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  const note = (key: number, value: ReadNote | null) =>
    setNotes((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });

  async function readInto(key: number, file: File) {
    if (!file.type.startsWith("image/")) {
      note(key, { busy: false, tone: "error", text: "That isn’t a picture — choose a screenshot (PNG or JPG)." });
      return;
    }
    const currentQuote = rowsRef.current.find((r) => r.key === key)?.quote ?? "";
    if (currentQuote.trim() && !window.confirm("Replace this quote with the words from the picture?")) return;
    note(key, { busy: true, tone: "info", text: "Getting ready…" });
    try {
      const { readImageText, fitQuote } = await import("@/lib/read-image-text");
      const found = await readImageText(file, (p) =>
        note(key, {
          busy: true,
          tone: "info",
          text:
            p.stage === "reading"
              ? `Reading the words… ${p.percent}%`
              : "Getting ready… (the first time takes a little longer)",
        }),
      );
      if (!found.quote) {
        note(key, {
          busy: false,
          tone: "error",
          text: "No words found in that picture. Try a clearer screenshot, cropped to the message.",
        });
        return;
      }
      const fitted = fitQuote(found.quote, MAX_QUOTE);
      // The name goes in only if the box is still empty.
      const row = rowsRef.current.find((r) => r.key === key);
      const name = found.name && row && !row.name.trim() ? found.name : null;
      const filledName = Boolean(name);
      setRows((prev) =>
        prev.map((r) => (r.key === key ? { ...r, quote: fitted.text, name: name ?? r.name } : r)),
      );
      const parts = [
        filledName ? "Quote and name filled in from the picture" : "Quote filled in from the picture",
        fitted.cut ? `shortened to fit ${MAX_QUOTE} characters` : null,
      ].filter(Boolean);
      note(key, {
        busy: false,
        tone: found.confidence < 60 ? "warn" : "info",
        text:
          parts.join(", ") +
          (found.confidence < 60
            ? ". The picture was hard to read — please check every word."
            : ". Check it over and correct anything misread, then save."),
      });
    } catch (err) {
      note(key, {
        busy: false,
        tone: "error",
        text: err instanceof Error && err.message ? err.message : "Couldn’t read that picture.",
      });
    }
  }

  function addRow(): number {
    const key = nextKey;
    setRows((prev) => [...prev, { key, quote: "", name: "", area: "" }]);
    setNextKey((k) => k + 1);
    return key;
  }

  return (
    <section className="rounded-xl border border-line bg-card p-6">
      <h2 className="text-lg">Testimonials</h2>
      <p className="mt-1 text-sm text-muted">
        Quotes from real clients, shown on the homepage under &ldquo;What our clients say&rdquo;.
        The section only appears once there&rsquo;s at least one. Got it as a screenshot? Read the
        words straight from the picture instead of typing them.
      </p>
      {/* Tells the save that this section was on the form. */}
      <input type="hidden" name="testimonialsPresent" value="1" />

      <div className="mt-5 space-y-4">
        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            No testimonials yet — the homepage section is hidden.
          </p>
        )}
        {rows.map((row, i) => {
          const status = notes[row.key];
          return (
            <div key={row.key} className="rounded-lg border border-line p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-ink">Testimonial {i + 1}</p>
                <button
                  type="button"
                  onClick={() => {
                    setRows((prev) => prev.filter((r) => r.key !== row.key));
                    note(row.key, null);
                  }}
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
                  // A screenshot pasted or dropped on the box is read, not inserted.
                  onPaste={(e) => {
                    const picture = pictureIn(e.clipboardData?.files);
                    if (!picture) return;
                    e.preventDefault();
                    void readInto(row.key, picture);
                  }}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes("Files")) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    const picture = pictureIn(e.dataTransfer.files);
                    if (!picture) return;
                    e.preventDefault();
                    void readInto(row.key, picture);
                  }}
                  readOnly={status?.busy}
                  rows={3}
                  maxLength={MAX_QUOTE}
                  placeholder="What the client said, in their words — or paste a screenshot of it here."
                />
              </Field>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <label
                  className={`inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-brand focus-within:ring-2 focus-within:ring-brand-300 ${status?.busy ? "pointer-events-none opacity-60" : "cursor-pointer hover:underline"}`}
                >
                  <ScanText size={15} />
                  Read it from a screenshot
                  {/* No name: the picture itself is never sent anywhere. */}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={status?.busy}
                    onChange={(e) => {
                      const picture = e.currentTarget.files?.[0];
                      e.currentTarget.value = "";
                      if (picture) void readInto(row.key, picture);
                    }}
                  />
                </label>
                <span className="text-xs text-muted">or paste / drop one on the box</span>
              </div>
              {status && (
                <p
                  role="status"
                  className={`mt-2 flex items-start gap-1.5 text-xs ${status.tone === "error" ? "text-red-600" : status.tone === "warn" ? "text-amber-700" : "text-muted"}`}
                >
                  {status.busy && <Loader2 size={13} className="mt-px shrink-0 animate-spin" />}
                  {status.text}
                </p>
              )}
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
          );
        })}
      </div>

      {rows.length < MAX_TESTIMONIALS && (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={addRow}>
            <Plus size={16} />
            Add a testimonial
          </Button>
          <label
            className={buttonVariants({
              variant: "outline",
              size: "md",
              className: "cursor-pointer focus-within:ring-2 focus-within:ring-brand-300",
            })}
          >
            <ScanText size={16} />
            Add from a screenshot
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const picture = e.currentTarget.files?.[0];
                e.currentTarget.value = "";
                if (picture) void readInto(addRow(), picture);
              }}
            />
          </label>
        </div>
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
