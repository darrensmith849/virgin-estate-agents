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
};

export type Vocabulary = {
  specLabels: Record<SpecLabelKey, string>;
  kindLabels: { sale: string; rent: string };
  featureOptions: string[];
  propertyTypeOptions: string[];
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
