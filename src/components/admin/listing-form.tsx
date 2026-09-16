"use client";

import { useActionState, useState } from "react";
import { Plus, Save, X } from "lucide-react";

import type { ListingFormState } from "@/lib/actions/listings";
import type { Agent, Listing } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { HARARE_SUBURBS, LISTING_STATUSES } from "@/lib/constants";
import { formatPropertyType, type Vocabulary } from "@/lib/vocabulary";

type Props = {
  action: (state: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  agents: Pick<Agent, "id" | "name">[];
  listing?: Listing;
  submitLabel?: string;
  /** The agency's own wording and option lists (admin Settings). */
  vocabulary: Vocabulary;
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-card p-6">
      <h2 className="text-lg">{title}</h2>
      {description && <p className="mt-1 mb-5 text-sm text-muted">{description}</p>}
      <div className={description ? "" : "mt-5"}>{children}</div>
    </section>
  );
}

export function ListingForm({
  action,
  agents,
  listing,
  submitLabel = "Save listing",
  vocabulary,
}: Props) {
  const [state, formAction, pending] = useActionState<ListingFormState, FormData>(
    action,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};
  const saved = (listing?.features as string[] | undefined) ?? [];
  // Offer the agency's list plus anything already saved on this listing, so a
  // one-off feature added last month doesn't silently vanish on the next edit.
  const [featureOptions, setFeatureOptions] = useState<string[]>(() => {
    const seen = new Set(vocabulary.featureOptions.map((f) => f.toLowerCase()));
    return [...vocabulary.featureOptions, ...saved.filter((f) => !seen.has(f.toLowerCase()))];
  });
  const [checked, setChecked] = useState<string[]>(saved);
  const [newFeature, setNewFeature] = useState("");

  function addFeature() {
    const value = newFeature.trim();
    if (!value) return;
    const exists = featureOptions.find((f) => f.toLowerCase() === value.toLowerCase());
    if (!exists) setFeatureOptions((prev) => [...prev, value]);
    const name = exists ?? value;
    setChecked((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setNewFeature("");
  }

  function toggleFeature(name: string) {
    setChecked((prev) =>
      prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name],
    );
  }
  const [kind, setKind] = useState<string>(listing?.kind ?? "sale");
  const [status, setStatus] = useState<string>(listing?.status ?? "draft");
  const isRent = kind === "rent";

  return (
    <form action={formAction} className="space-y-6">
      {state?.ok && (
        <p className="rounded-[var(--radius)] bg-brand-50 px-4 py-2.5 text-sm text-brand">
          Saved successfully.
        </p>
      )}
      {state?.error && (
        <p className="rounded-[var(--radius)] bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Section title="Basics">
        <div className="space-y-4">
          <Field label="Title" htmlFor="title" error={fe.title?.[0]}>
            <Input
              id="title"
              name="title"
              defaultValue={listing?.title ?? ""}
              placeholder="e.g. Elegant 4-Bedroom Family Home in Borrowdale"
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Status"
              htmlFor="status"
              hint={
                status === "draft"
                  ? "Draft — hidden from the website until published."
                  : "Live on the public website."
              }
            >
              <Select
                id="status"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {LISTING_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Listing type" htmlFor="kind">
              <Select
                id="kind"
                name="kind"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option value="sale">{vocabulary.kindLabels.sale}</option>
                <option value="rent">{vocabulary.kindLabels.rent}</option>
              </Select>
            </Field>
            <Field
              label="Property type"
              htmlFor="propertyType"
              error={fe.propertyType?.[0]}
            >
              {/* Free text with suggestions — pick one of the agency's types or
                  type anything else. Legacy rows hold slugs ("house"), so the
                  stored value is shown in its display form. */}
              <Input
                id="propertyType"
                name="propertyType"
                list="propertyTypeOptions"
                autoComplete="off"
                defaultValue={formatPropertyType(listing?.propertyType) || ""}
                placeholder="House, Apartment, Warehouse…"
              />
              <datalist id="propertyTypeOptions">
                {vocabulary.propertyTypeOptions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Field>
          </div>
          <Field label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              defaultValue={listing?.description ?? ""}
              placeholder="Describe the property — the spaces, the light, the location…"
              rows={6}
            />
          </Field>
        </div>
      </Section>

      <Section title="Pricing">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={isRent ? "Rent (USD)" : "Price (USD)"}
            htmlFor="price"
            error={fe.price?.[0]}
            hint={isRent ? "Whole dollars, e.g. 1200" : "Whole dollars, e.g. 485000"}
          >
            <Input
              id="price"
              name="price"
              type="number"
              min={0}
              defaultValue={listing?.price ?? 0}
            />
          </Field>
          {isRent ? (
            <Field label="Rent period" htmlFor="rentPeriod" hint="How the rent is quoted">
              <Select
                id="rentPeriod"
                name="rentPeriod"
                defaultValue={listing?.rentPeriod ?? "month"}
              >
                <option value="month">per month</option>
                <option value="week">per week</option>
              </Select>
            </Field>
          ) : (
            // For-sale listings have no rent period; keep the value out of the
            // submission entirely (formatPrice ignores it for sales anyway).
            <input type="hidden" name="rentPeriod" value="" />
          )}
        </div>
      </Section>

      <Section title="Specifications">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Bedrooms" htmlFor="bedrooms">
            <Input id="bedrooms" name="bedrooms" type="number" min={0} defaultValue={listing?.bedrooms ?? 0} />
          </Field>
          <Field label="Bathrooms" htmlFor="bathrooms">
            <Input id="bathrooms" name="bathrooms" type="number" min={0} defaultValue={listing?.bathrooms ?? 0} />
          </Field>
          <Field label="Garages" htmlFor="garages">
            <Input id="garages" name="garages" type="number" min={0} defaultValue={listing?.garages ?? 0} />
          </Field>
          <Field label="Land size (m²)" htmlFor="landSizeSqm">
            <Input id="landSizeSqm" name="landSizeSqm" type="number" min={0} defaultValue={listing?.landSizeSqm ?? ""} />
          </Field>
          <Field label="Floor size (m²)" htmlFor="floorSizeSqm">
            <Input id="floorSizeSqm" name="floorSizeSqm" type="number" min={0} defaultValue={listing?.floorSizeSqm ?? ""} />
          </Field>
        </div>
      </Section>

      <Section title="Location">
        <div className="space-y-4">
          <Field label="Address" htmlFor="addressLine">
            <Input id="addressLine" name="addressLine" defaultValue={listing?.addressLine ?? ""} placeholder="Street address" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Suburb" htmlFor="suburb">
              <Input
                id="suburb"
                name="suburb"
                list="suburbs"
                defaultValue={listing?.suburb ?? ""}
                placeholder="Start typing…"
              />
              <datalist id="suburbs">
                {HARARE_SUBURBS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <Field label="City" htmlFor="city">
              <Input id="city" name="city" defaultValue={listing?.city ?? "Harare"} />
            </Field>
            <Field label="Latitude" htmlFor="latitude" hint="For the map pin (optional)">
              <Input id="latitude" name="latitude" type="number" step="any" defaultValue={listing?.latitude ?? ""} placeholder="-17.75" />
            </Field>
            <Field label="Longitude" htmlFor="longitude" hint="For the map pin (optional)">
              <Input id="longitude" name="longitude" type="number" step="any" defaultValue={listing?.longitude ?? ""} placeholder="31.10" />
            </Field>
          </div>
        </div>
      </Section>

      <Section
        title="Features"
        description="Tick what applies, or add anything that isn't listed. Edit the standard list in Settings."
      >
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {featureOptions.map((f) => (
            <label key={f} className="group flex items-center gap-2.5 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="features"
                value={f}
                checked={checked.includes(f)}
                onChange={() => toggleFeature(f)}
                className="h-4 w-4 rounded border-line text-brand focus:ring-brand/30"
              />
              <span className="flex-1">{f}</span>
              <button
                type="button"
                onClick={() => {
                  setFeatureOptions((prev) => prev.filter((x) => x !== f));
                  setChecked((prev) => prev.filter((x) => x !== f));
                }}
                className="text-muted opacity-0 transition group-hover:opacity-100 hover:text-ink"
                aria-label={`Remove ${f} from this listing`}
                title="Remove from this listing"
              >
                <X size={14} />
              </button>
            </label>
          ))}
        </div>

        <div className="mt-5 flex max-w-md gap-2">
          <Input
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // Don't submit the whole listing just because they added one.
                e.preventDefault();
                addFeature();
              }
            }}
            placeholder="Add another feature…"
            aria-label="Add another feature"
          />
          <Button type="button" variant="outline" onClick={addFeature}>
            <Plus size={16} />
            Add
          </Button>
        </div>
      </Section>

      <Section title="Assignment">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Listing agent" htmlFor="agentId">
            <Select id="agentId" name="agentId" defaultValue={listing?.agentId ?? ""}>
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <label className="flex items-center gap-2.5 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="isFeatured"
                defaultChecked={listing?.isFeatured ?? false}
                className="h-4 w-4 rounded border-line text-brand focus:ring-brand/30"
              />
              Feature on homepage
            </label>
          </div>
        </div>
      </Section>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={pending}>
          <Save size={16} />
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
