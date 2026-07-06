import { HARARE_SUBURBS } from "@/lib/constants";

/** "Mount Pleasant" -> "mount-pleasant" */
export function slugifySuburb(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "mount-pleasant" -> "Mount Pleasant" (or null if not a known suburb). */
export function suburbFromSlug(slug: string): string | null {
  return HARARE_SUBURBS.find((s) => slugifySuburb(s) === slug) ?? null;
}

/** Short editorial intros for the prime suburbs. */
export const SUBURB_BLURBS: Record<string, string> = {
  Borrowdale:
    "Harare's most prestigious address — leafy avenues, gated estates, golf and the city's finest schools.",
  "Borrowdale Brooke":
    "A sought-after secure golf estate, with manicured grounds and contemporary family homes.",
  Highlands:
    "Established elegance — generous stands, mature gardens and grand character homes close to town.",
  "Mount Pleasant":
    "A family favourite near the university, with tree-lined streets and genuine value.",
  Avondale:
    "Vibrant and central — a walkable mix of apartments, character houses and everyday convenience.",
  Chisipite:
    "Quiet, green and well-served — spacious homes a short hop from Borrowdale's amenities.",
  "Glen Lorne":
    "Rolling, semi-rural plots and real privacy on the city's north-eastern edge.",
  "Greystone Park":
    "Large, leafy stands and a relaxed, established feel north of the city.",
  Newlands:
    "Central, leafy and convenient — characterful homes just minutes from the CBD.",
};

const GENERIC_BLURB =
  "A sought-after Harare neighbourhood — explore the homes we currently have available.";

export function suburbBlurb(name: string): string {
  return SUBURB_BLURBS[name] ?? GENERIC_BLURB;
}

/** The suburbs surfaced in the home-page "Explore by suburb" section. */
export const FEATURED_SUBURBS: string[] = [
  "Borrowdale",
  "Highlands",
  "Mount Pleasant",
  "Avondale",
  "Chisipite",
  "Borrowdale Brooke",
];
