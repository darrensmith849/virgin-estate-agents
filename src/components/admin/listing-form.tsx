"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Save } from "lucide-react";

import type { ListingFormState } from "@/lib/actions/listings";
import type { Agent, Listing } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import {
  COMMON_FEATURES,
  HARARE_SUBURBS,
  LISTING_KINDS,
  LISTING_STATUSES,
  PROPERTY_TYPES,
} from "@/lib/constants";

type Props = {
  action: (state: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  agents: Pick<Agent, "id" | "name">[];
  listing?: Listing;
  submitLabel?: string;
  /** Fires once with the new id after a successful create (see NewListingFlow). */
  onCreated?: (id: string) => void;
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
  onCreated,
}: Props) {
  const [state, formAction, pending] = useActionState<ListingFormState, FormData>(
    action,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};
  const features = (listing?.features as string[] | undefined) ?? [];
  const [kind, setKind] = useState<string>(listing?.kind ?? "sale");
  const isRent = kind === "rent";

  // On a successful create the action returns the new id; hand it to the parent
  // once so it can reveal the photo uploader on the same page.
  const notifiedId = useRef<string | null>(null);
  useEffect(() => {
    if (state?.id && notifiedId.current !== state.id) {
      notifiedId.current = state.id;
      onCreated?.(state.id);
    }
  }, [state?.id, onCreated]);

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
            <Field label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue={listing?.status ?? "draft"}>
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
                {LISTING_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Property type" htmlFor="propertyType">
              <Select
                id="propertyType"
                name="propertyType"
                defaultValue={listing?.propertyType ?? "house"}
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
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

      <Section title="Features">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {COMMON_FEATURES.map((f) => (
            <label key={f} className="flex items-center gap-2.5 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="features"
                value={f}
                defaultChecked={features.includes(f)}
                className="h-4 w-4 rounded border-line text-brand focus:ring-brand/30"
              />
              {f}
            </label>
          ))}
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
