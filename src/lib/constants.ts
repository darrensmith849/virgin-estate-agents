/** Static site configuration. Editable agency details live in `agency_settings`. */
export const SITE = {
  name: "Virgin Estate Agents",
  shortName: "Virgin Estate",
  description:
    "Find your next home in Harare. Curated houses, apartments, stands and commercial property across Zimbabwe's finest suburbs.",
  city: "Harare",
  country: "Zimbabwe",
  // Placeholder contact details — replace with the client's real details.
  phone: "+263 24 2000 000",
  whatsapp: "+263 77 000 0000",
  email: "info@virginestateagents.co.zw",
  address: "Borrowdale, Harare, Zimbabwe",
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

/** Feature tags relevant to Zimbabwean property. */
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
