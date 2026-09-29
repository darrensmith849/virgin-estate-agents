import {
  COMMON_FEATURES,
  DEFAULT_KIND_LABELS,
  DEFAULT_SPEC_LABELS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_SUGGESTIONS,
  type SpecLabelKey,
} from "@/lib/constants";

/*
 * The agency's own wording, resolved from settings with the built-in defaults
 * as fallback. Every override is optional and individually applied, so blanking
 * one field in Settings restores that default rather than wiping the set.
 *
 * Kept free of `server-only` so the admin form can share the same resolver.
 */

export type VocabularySource = {
  specLabels?: Record<string, string> | null;
  kindLabels?: Record<string, string> | null;
  featureOptions?: string[] | null;
  propertyTypeOptions?: string[] | null;
  specOptions?: string[] | null;
  hiddenSpecs?: string[] | null;
};

export type Vocabulary = {
  specLabels: Record<SpecLabelKey, string>;
  kindLabels: { sale: string; rent: string };
  featureOptions: string[];
  propertyTypeOptions: string[];
  /** The agency's own specification types, offered on every listing. */
  specOptions: string[];
  /** Standard specs the agency has chosen not to use. */
  hiddenSpecs: SpecLabelKey[];
};

/** Drop blanks and duplicates while preserving the order the agency chose. */
function cleanList(list: readonly string[] | null | undefined): string[] {
  if (!list) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const value = String(raw ?? "").trim();
    if (!value) continue;
    const dedupeKey = value.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push(value);
  }
  return out;
}

/** Overlay non-empty overrides onto a defaults object. */
function mergeLabels<T extends Record<string, string>>(
  defaults: T,
  overrides: Record<string, string> | null | undefined,
): T {
  if (!overrides) return { ...defaults };
  const out = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const value = overrides[key as string];
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim() as T[keyof T];
    }
  }
  return out;
}

export function resolveVocabulary(source?: VocabularySource | null): Vocabulary {
  const featureOptions = cleanList(source?.featureOptions);
  const propertyTypeOptions = cleanList(source?.propertyTypeOptions);

  return {
    specLabels: mergeLabels(DEFAULT_SPEC_LABELS, source?.specLabels),
    kindLabels: mergeLabels(DEFAULT_KIND_LABELS, source?.kindLabels),
    featureOptions: featureOptions.length
      ? featureOptions
      : [...COMMON_FEATURES],
    propertyTypeOptions: propertyTypeOptions.length
      ? propertyTypeOptions
      : [...PROPERTY_TYPE_SUGGESTIONS],
    // No built-in defaults: an agency that hasn't set any gets none.
    specOptions: cleanList(source?.specOptions),
    hiddenSpecs: (source?.hiddenSpecs ?? []).filter(
      (key): key is SpecLabelKey => key in DEFAULT_SPEC_LABELS,
    ),
  };
}

/**
 * Display text for a stored property type.
 *
 * The column used to be an enum of lowercase slugs ("house", "cluster"), and
 * existing listings still hold those. Anything typed since is stored verbatim,
 * so slugs are mapped back to their old label and everything else is shown as
 * the agency wrote it.
 */
const LEGACY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  PROPERTY_TYPES.map((t) => [t.value, t.label]),
);

export function formatPropertyType(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  return LEGACY_TYPE_LABELS[raw.toLowerCase()] ?? raw;
}

/** Two property types match if they differ only by the old slug/label spelling. */
export function samePropertyType(a: string, b: string): boolean {
  return formatPropertyType(a).toLowerCase() === formatPropertyType(b).toLowerCase();
}

/* ------------------------------------------------------------------ */
/*  Broad categories for the public listings page                      */
/* ------------------------------------------------------------------ */

export type PropertyCategory = "residential" | "commercial" | "industrial" | "land";

export const PROPERTY_CATEGORIES: { key: PropertyCategory; label: string }[] = [
  { key: "residential", label: "Residential" },
  { key: "commercial", label: "Commercial" },
  { key: "industrial", label: "Industrial" },
  { key: "land", label: "Land" },
];

/*
 * The agency types property types freely ("Townhouse / Cluster Home",
 * "Commercial / residential Land"), so unless a category is chosen on the
 * listing it's read from the words in the type: anything naming land comes
 * first, then anything industrial, then commercial, and the rest is
 * residential. Keep in step with CATEGORY_ORDER_SQL in lib/data/listings.ts,
 * which sorts the same way in the database.
 */
const LAND_WORDS = /\b(land|stand|plot|erf|farm|smallholding|acreage)s?\b/i;
const INDUSTRIAL_WORDS = /\b(industrial|warehouse|factory|factories|workshop|depot)s?\b/i;
const COMMERCIAL_WORDS =
  /\b(commercial|office|retail|shop|business|hotel|lodge)s?\b/i;

export function propertyCategory(type: string | null | undefined): PropertyCategory {
  const label = formatPropertyType(type);
  if (LAND_WORDS.test(label)) return "land";
  if (INDUSTRIAL_WORDS.test(label)) return "industrial";
  if (COMMERCIAL_WORDS.test(label)) return "commercial";
  return "residential";
}

export function isPropertyCategory(value: unknown): value is PropertyCategory {
  return PROPERTY_CATEGORIES.some((c) => c.key === value);
}

/** The category a listing is shown under: the one chosen, else from its type. */
export function listingCategory(listing: {
  category?: string | null;
  propertyType: string | null | undefined;
}): PropertyCategory {
  return isPropertyCategory(listing.category) ? listing.category : propertyCategory(listing.propertyType);
}
