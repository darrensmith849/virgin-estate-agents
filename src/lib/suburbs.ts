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

/** Short editorial intros for each Harare suburb with a guide page. */
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
  Vainona:
    "Spacious stands and quality homes in the north, minutes from Borrowdale's shops and schools.",
  "Hogerty Hill":
    "Elevated, leafy and peaceful — large stands and substantial homes in the north-east.",
  Helensvale:
    "A quiet north-eastern neighbourhood of generous plots and mature trees, close to Borrowdale.",
  Greendale:
    "An established eastern suburb of family homes and good-sized gardens, a short drive from town.",
  Mandara:
    "Calm and settled in the east — established gardens and comfortable family homes.",
  Marlborough:
    "A popular north-western suburb with family homes, good schools and everyday amenities nearby.",
  Pomona:
    "North of the city beside Borrowdale, with residential stands and growing commercial development.",
  Belgravia:
    "Close to the city centre — character homes and offices on quiet, tree-lined streets.",
  "Milton Park":
    "Central and convenient — established homes and offices just west of the CBD.",
  Mabelreign:
    "A well-established western suburb offering family homes and good value, with shops and schools nearby.",
  Westgate:
    "A western suburb around the Westgate shopping centre, with newer homes and easy road links.",
};

// For areas without their own write-up, which may be anywhere in Zimbabwe.
const GENERIC_BLURB =
  "A sought-after area — explore the properties we currently have available here.";

export function suburbBlurb(name: string): string {
  return SUBURB_BLURBS[name] ?? GENERIC_BLURB;
}
