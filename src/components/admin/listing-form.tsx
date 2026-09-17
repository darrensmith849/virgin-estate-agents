"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Plus, Save, X } from "lucide-react";

import type { ListingFormState } from "@/lib/actions/listings";
import type { Agent, Listing } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { LocationPicker } from "@/components/admin/location-picker";
import { cn } from "@/lib/utils";
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

  /* Custom spec rows. Each carries a stable id so React keys survive a removal
     from the middle — indexes alone would make the wrong row lose its text. */
  const [customSpecs, setCustomSpecs] = useState<
    { id: string; label: string; value: string }[]
  >(() =>
    ((listing?.customSpecs as { label: string; value: string }[] | undefined) ?? []).map(
      (row) => ({ ...row, id: crypto.randomUUID() }),
    ),
  );

  function addSpec() {
    setCustomSpecs((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "", value: "" },
    ]);
  }

  function updateSpec(index: number, patch: { label?: string; value?: string }) {
    setCustomSpecs((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removeSpec(index: number) {
    setCustomSpecs((prev) => prev.filter((_, i) => i !== index));
  }

  /* Location.
     The address box is a combobox: typing looks matches up in the background
     and offers them, so nobody has to know what a latitude is. Lookups fire on
     a pause rather than per keystroke — Nominatim asks that type-ahead be
     throttled and cached, and it keeps us well inside its limits. */
  const [address, setAddress] = useState(listing?.addressLine ?? "");
  const [suburb, setSuburb] = useState(listing?.suburb ?? "");
  const [city, setCity] = useState(listing?.city ?? "Harare");
  const [lat, setLat] = useState(listing?.latitude?.toString() ?? "");
  const [lng, setLng] = useState(listing?.longitude?.toString() ?? "");

  type Suggestion = {
    lat: number;
    lon: number;
    label: string;
    suburb: string | null;
    city: string | null;
  };
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highlight, setHighlight] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [pinned, setPinned] = useState<string | null>(
    listing?.latitude != null ? "Using the saved pin for this listing." : null,
  );
  const [noMatch, setNoMatch] = useState(false);
  // Set when a suggestion is taken, so choosing one doesn't immediately
  // re-trigger a lookup for the text we just filled in.
  const skipNextLookup = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  /*
   * Deliberately excludes the suburb. It is an *output* of geocoding, not an
   * input: when an existing listing is edited, the saved suburb belongs to the
   * old address, and feeding it back in makes a perfectly findable street
   * unfindable — "3 Piers Road, Avondale, Harare" returns nothing because
   * Piers Road is in Borrowdale, while dropping the suburb finds it at once.
   * City and country are enough to keep results inside Harare, and choosing a
   * result fills the suburb in from what was actually matched.
   */
  const lookupQuery = [address, city, "Zimbabwe"]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");

  useEffect(() => {
    if (skipNextLookup.current) {
      skipNextLookup.current = false;
      return;
    }
    // Too short to be worth a lookup. Return without touching state — what's
    // already there is hidden by `showSuggestions` below, and setting state
    // synchronously in an effect body just causes cascading renders.
    if (address.trim().length < 4) return;

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSearching(true);
      setNoMatch(false);
      try {
        const res = await fetch(
          `/admin/api/geocode?mode=suggest&q=${encodeURIComponent(lookupQuery)}`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as { hits?: Suggestion[] };
        const hits = data.hits ?? [];
        setSuggestions(hits);
        setHighlight(-1);
        setNoMatch(hits.length === 0);
      } catch {
        // An aborted request is the expected outcome while still typing.
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [address, city, lookupQuery]);

  // Derived rather than stored, so clearing the box hides the list without an
  // extra render pass.
  const showSuggestions = suggestions.length > 0 && address.trim().length >= 4;

  function choose(hit: Suggestion) {
    skipNextLookup.current = true;
    setLat(hit.lat.toFixed(6));
    setLng(hit.lon.toFixed(6));
    /*
     * Take the suburb and city from the match rather than preserving whatever
     * was there. Picking a suggestion is a deliberate statement about where the
     * property is, and on an existing listing the saved suburb belongs to the
     * old address — keeping it is how a Borrowdale street ends up filed under
     * Avondale. Both remain editable afterwards.
     */
    if (hit.suburb) setSuburb(hit.suburb);
    if (hit.city) setCity(hit.city);
    setPinned(`Pinned to ${hit.label}`);
    setSuggestions([]);
    setHighlight(-1);
    setNoMatch(false);
  }

  /** The deeper search, for addresses the quick lookup can't place. */
  async function searchHarder() {
    setSearching(true);
    setNoMatch(false);
    try {
      const res = await fetch(
        `/admin/api/geocode?q=${encodeURIComponent(lookupQuery)}`,
      );
      const data = (await res.json()) as { hits?: Suggestion[]; exact?: boolean };
      const hits = data.hits ?? [];
      if (!hits.length) {
        setNoMatch(true);
        setPinned(null);
        return;
      }
      choose(hits[0]);
      if (!data.exact) {
        setPinned(
          `Pinned to ${hits[0].label} — that's the street, not the exact number. Nudge the coordinates below if you need it precise.`,
        );
      }
    } catch {
      setNoMatch(true);
    } finally {
      setSearching(false);
    }
  }

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

      <Section
        title="Specifications"
        description="Leave a box empty if it doesn't apply — an empty spec is hidden on the site, while 0 is shown as a real zero. Rename these in Settings, or add your own below."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={vocabulary.specLabels.bedrooms} htmlFor="bedrooms">
            <Input id="bedrooms" name="bedrooms" type="number" min={0} defaultValue={listing?.bedrooms ?? ""} placeholder="—" />
          </Field>
          <Field label={vocabulary.specLabels.bathrooms} htmlFor="bathrooms">
            <Input id="bathrooms" name="bathrooms" type="number" min={0} defaultValue={listing?.bathrooms ?? ""} placeholder="—" />
          </Field>
          <Field label={vocabulary.specLabels.garages} htmlFor="garages">
            <Input id="garages" name="garages" type="number" min={0} defaultValue={listing?.garages ?? ""} placeholder="—" />
          </Field>
          <Field label={`${vocabulary.specLabels.landSize} (m²)`} htmlFor="landSizeSqm">
            <Input id="landSizeSqm" name="landSizeSqm" type="number" min={0} defaultValue={listing?.landSizeSqm ?? ""} placeholder="—" />
          </Field>
          <Field label={`${vocabulary.specLabels.floorSize} (m²)`} htmlFor="floorSizeSqm">
            <Input id="floorSizeSqm" name="floorSizeSqm" type="number" min={0} defaultValue={listing?.floorSizeSqm ?? ""} placeholder="—" />
          </Field>
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-sm font-medium text-ink">Other details</h3>
          <p className="mt-1 text-sm text-muted">
            Anything else worth listing for this property — loading bays, office
            suites, hectares. These appear alongside the specs above.
          </p>

          {customSpecs.length > 0 && (
            <div className="mt-4 space-y-3">
              {customSpecs.map((row, i) => (
                <div key={row.id} className="flex flex-wrap items-center gap-2">
                  <Input
                    name="customSpecLabel"
                    value={row.label}
                    onChange={(e) => updateSpec(i, { label: e.target.value })}
                    placeholder="Name, e.g. Loading bays"
                    aria-label={`Detail ${i + 1} name`}
                    className="min-w-[10rem] flex-1"
                  />
                  <Input
                    name="customSpecValue"
                    value={row.value}
                    onChange={(e) => updateSpec(i, { value: e.target.value })}
                    placeholder="Value, e.g. 3"
                    aria-label={`Detail ${i + 1} value`}
                    className="min-w-[8rem] flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSpec(i)}
                    aria-label={`Remove ${row.label || `detail ${i + 1}`}`}
                  >
                    <X size={16} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button type="button" variant="outline" className="mt-4" onClick={addSpec}>
            <Plus size={16} />
            Add a detail
          </Button>
        </div>
      </Section>

      <Section
        title="Location"
        description="Start typing the address and pick it from the list, then drag the pin on the map to the exact spot."
      >
        <div className="space-y-4">
          <Field label="Address" htmlFor="addressLine">
            <div className="relative">
              <Input
                id="addressLine"
                name="addressLine"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="off"
                role="combobox"
                aria-expanded={showSuggestions}
                aria-controls="address-suggestions"
                aria-autocomplete="list"
                aria-activedescendant={
                  highlight >= 0 ? `address-option-${highlight}` : undefined
                }
                onKeyDown={(e) => {
                  if (!showSuggestions) {
                    // Enter here means "look it up", never "submit the listing".
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void searchHarder();
                    }
                    return;
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlight((h) => (h + 1) % suggestions.length);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    choose(suggestions[highlight >= 0 ? highlight : 0]);
                  } else if (e.key === "Escape") {
                    setSuggestions([]);
                    setHighlight(-1);
                  }
                }}
                // A click elsewhere should dismiss the list, but not before a
                // click on an option has registered.
                onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                placeholder="Start typing, e.g. 3 Piers Road"
              />

              {searching && (
                <Loader2
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted"
                />
              )}

              {showSuggestions && (
                <ul
                  id="address-suggestions"
                  role="listbox"
                  className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-[var(--radius)] border border-line bg-card py-1 shadow-lg"
                >
                  {suggestions.map((hit, i) => (
                    <li key={`${hit.lat},${hit.lon},${i}`}>
                      <button
                        type="button"
                        id={`address-option-${i}`}
                        role="option"
                        aria-selected={i === highlight}
                        onMouseEnter={() => setHighlight(i)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => choose(hit)}
                        className={cn(
                          "flex w-full items-start gap-2 px-3 py-2 text-left text-sm",
                          i === highlight ? "bg-paper-2 text-ink" : "text-ink-soft",
                        )}
                      >
                        <MapPin size={14} className="mt-0.5 shrink-0 text-sand" />
                        <span>{hit.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>

          {pinned && !showSuggestions && (
            <p className="text-sm text-brand" role="status">
              {pinned}
            </p>
          )}

          {noMatch && !searching && address.trim().length >= 4 && (
            <p className="text-sm text-muted" role="status">
              No match yet.{" "}
              <button
                type="button"
                onClick={() => void searchHarder()}
                className="text-brand underline underline-offset-2"
              >
                Search harder
              </button>{" "}
              — Zimbabwean street data often omits house numbers, so this looks
              for the street itself. Otherwise enter coordinates below.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Suburb" htmlFor="suburb">
              <Input
                id="suburb"
                name="suburb"
                list="suburbs"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                placeholder="Filled in when you pick an address"
              />
              <datalist id="suburbs">
                {HARARE_SUBURBS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <Field label="City" htmlFor="city">
              <Input
                id="city"
                name="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </Field>
          </div>

          <LocationPicker
            lat={lat}
            lng={lng}
            onChange={({ lat: nextLat, lng: nextLng }) => {
              setLat(String(nextLat));
              setLng(String(nextLng));
              setPinned("Pin placed by hand.");
            }}
            onPlace={(place) => {
              // Suburb and city are facts about where the pin is, so they
              // follow it.
              if (place.suburb) setSuburb(place.suburb);
              if (place.city) setCity(place.city);
              /*
               * The address line is the human's own wording and usually carries
               * a house number that this data does not have — overwriting
               * "3 Piers Road" with "Piers Road" would throw the number away.
               * So fill it only when there is nothing there yet.
               */
              setAddress((current) => {
                if (current.trim() !== "" || !place.addressLine) return current;
                // Writing the address would otherwise wake the forward lookup
                // and pop a suggestions list open straight after a drag.
                skipNextLookup.current = true;
                return place.addressLine;
              });
              if (place.label) setPinned(`Pin is at ${place.label}`);
            }}
          />

          {/* The raw numbers still submit with the form and stay editable, but
              they're tucked away — nobody should need to read a latitude to
              list a house. */}
          <details className="rounded-[var(--radius)] border border-line px-3 py-2">
            <summary className="cursor-pointer text-sm text-muted">
              Coordinates
            </summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Latitude" htmlFor="latitude">
                <Input
                  id="latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="—"
                />
              </Field>
              <Field label="Longitude" htmlFor="longitude">
                <Input
                  id="longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="—"
                />
              </Field>
            </div>
          </details>
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
