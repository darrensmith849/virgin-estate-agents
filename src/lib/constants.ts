/** Static site configuration. Editable agency details live in `agency_settings`. */
export const SITE = {
  name: "Virgin Estate Agents",
  shortName: "Virgin Estate",
  description:
    "Find your next property in Zimbabwe. Curated houses, apartments, stands, commercial and industrial property — from Harare's finest suburbs to Victoria Falls and beyond.",
  city: "Harare",
  country: "Zimbabwe",
  // The agency's contact line is Boyd Littleford's mobile (same number for calls
  // and WhatsApp); email goes to Boyd directly.
  phone: "+263 77 547 2523",
  whatsapp: "+263 77 547 2523",
  // The WhatsApp/mobile line is Boyd Littleford's — named on the footer & contact.
  contactName: "Boyd Littleford",
  email: "boyd@virtrust.com",
  address: "7 Normandy Rd, Avondale, Harare, Zimbabwe",
  hours: "Mon–Fri 8:00–17:00 · Sat 9:00–13:00",
  // Placeholder credential — confirm/replace with the agency's real registration.
  registration: "Registered estate agents — Zimbabwe",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  social: {
    facebook: "",
    instagram: "",
    linkedin: "",
  },
} as const;

export const NAV_LINKS = [
  { href: "/listings", label: "Listings" },
  { href: "/agents", label: "Agents" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

/** How many days a deleted listing stays restorable in the recycle bin. */
export const LISTING_BIN_DAYS = 30;

/** Harare suburbs used as a first-class filter. */
export const HARARE_SUBURBS = [
  "Avondale",
  "Borrowdale",
  "Borrowdale Brooke",
  "Chisipite",
  "Glen Lorne",
  "Greendale",
  "Greystone Park",
  "Helensvale",
  "Highlands",
  "Hogerty Hill",
  "Mandara",
  "Marlborough",
  "Mount Pleasant",
  "Newlands",
  "Pomona",
  "Vainona",
  "Belgravia",
  "Milton Park",
  "Mabelreign",
  "Westgate",
] as const;

export const PROPERTY_TYPES = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "townhouse", label: "Townhouse" },
  { value: "cluster", label: "Cluster home" },
  { value: "stand", label: "Stand / Land" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
  { value: "farm", label: "Farm / Smallholding" },
] as const;

export const LISTING_KINDS = [
  { value: "sale", label: "For Sale" },
  { value: "rent", label: "To Rent" },
] as const;

export const LISTING_STATUSES = [
  { value: "draft", label: "Draft", tone: "muted" },
  { value: "for_sale", label: "For Sale", tone: "brand" },
  { value: "under_offer", label: "Under Offer", tone: "amber" },
  { value: "sold", label: "Sold", tone: "neutral" },
] as const;

/*
 * The status choices offered for a listing. Sold and Rented are both offered
 * whatever the listing's type: picking the one that doesn't match also
 * switches the type (a property listed for sale that ends up rented out).
 * "rented" isn't stored as such — it's status "sold" on a rental.
 */
export function statusChoices(kind?: string | null): { value: string; label: string }[] {
  return [
    { value: "draft", label: "Draft" },
    { value: "for_sale", label: kind === "rent" ? "To Rent" : "For Sale" },
    { value: "under_offer", label: "Under Offer" },
    { value: "sold", label: "Sold" },
    { value: "rented", label: "Rented" },
  ];
}

/** The choice showing for a listing's stored status. */
export function statusChoice(status: string, kind?: string | null): string {
  return status === "sold" && kind === "rent" ? "rented" : status;
}

/** What a choice means: the status to store, and the type it sets, if any. */
export function fromStatusChoice(choice: string): { status: string; kind?: "sale" | "rent" } {
  if (choice === "rented") return { status: "sold", kind: "rent" };
  if (choice === "sold") return { status: "sold", kind: "sale" };
  return { status: choice };
}

/** A listing's reference as shown to people: 7 → "VE-007". */
export function formatRef(refNumber: number | null | undefined): string | null {
  return refNumber ? `VE-${String(refNumber).padStart(3, "0")}` : null;
}

/** A status as it reads for this listing: a rental is "To Rent", then "Rented". */
export function statusLabel(status: string, kind?: string | null): string {
  if (kind === "rent" && status === "for_sale") return "To Rent";
  if (kind === "rent" && status === "sold") return "Rented";
  return LISTING_STATUSES.find((s) => s.value === status)?.label ?? "Draft";
}

/** Feature tags relevant to Zimbabwean property. */
/* -------------------------------------------------------------------------- */
/*  Editable vocabulary defaults                                               */
/*                                                                             */
/*  These are the fallbacks. The agency can override every one of them from     */
/*  admin Settings; see src/lib/vocabulary.ts for the merge.                    */
/* -------------------------------------------------------------------------- */

/** Labels for the fixed numeric specs on a listing. */
export const DEFAULT_SPEC_LABELS = {
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  garages: "Garages",
  landSize: "Land size",
  floorSize: "Floor area",
} as const;

export type SpecLabelKey = keyof typeof DEFAULT_SPEC_LABELS;

/** Wording for the two structural listing kinds. The kinds themselves are fixed
 *  (they drive rent periods, grouping and filters) but the wording is not. */
export const DEFAULT_KIND_LABELS = {
  sale: "For Sale",
  rent: "To Rent",
} as const;

/** Seeded suggestions for the free-text property type field. */
export const PROPERTY_TYPE_SUGGESTIONS = [
  "House",
  "Apartment",
  "Townhouse",
  "Cluster home",
  "Stand / Land",
  "Commercial",
  "Industrial / Warehouse",
  "Farm / Smallholding",
] as const;

export const COMMON_FEATURES = [
  "Borehole",
  "Solar / inverter system",
  "Backup water tank",
  "Swimming pool",
  "Staff quarters",
  "Walled & electric fence",
  "Automated gate",
  "Fitted kitchen",
  "Built-in cupboards",
  "Air conditioning",
  "Fibre internet",
  "Double garage",
  "Established garden",
  "Tiled roof",
  "Open-plan living",
  "Pet friendly",
] as const;

export const PRICE_RANGES_SALE = [
  { label: "Any price", min: undefined, max: undefined },
  { label: "Under $100k", min: undefined, max: 100_000 },
  { label: "$100k – $250k", min: 100_000, max: 250_000 },
  { label: "$250k – $500k", min: 250_000, max: 500_000 },
  { label: "$500k – $1m", min: 500_000, max: 1_000_000 },
  { label: "$1m+", min: 1_000_000, max: undefined },
] as const;

export type PropertyTypeValue = (typeof PROPERTY_TYPES)[number]["value"];
export type ListingKindValue = (typeof LISTING_KINDS)[number]["value"];
export type ListingStatusValue = (typeof LISTING_STATUSES)[number]["value"];
