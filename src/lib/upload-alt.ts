import "server-only";

/**
 * Alt text for an uploaded image.
 *
 * Filenames off a phone are noise — "WhatsApp Image 2026-09-15 at 10.23.45",
 * "IMG_4821", "PXL_20260915_081500" — and using them verbatim put that text on
 * the public page and into search results. Prefer the property's own title and
 * number the photos; only fall back to the filename when it actually reads like
 * a description.
 */
const JUNK_FILENAME =
  /^(whatsapp|img|image|photo|pxl|dsc|dcim|screenshot|signal|received|fb_img|inshot|scaled)(?![a-z])/i;

export function altFor(knownListing: boolean, filename: string): string | null {
  // When the image belongs to a listing, store nothing: every render site falls
  // back to the listing's current title (`alt ?? title`), so the alt text tracks
  // renames instead of freezing whatever the title happened to be at upload.
  if (knownListing) return null;
  const base = filename.replace(/\.[^.]+$/, "").trim();
  if (!base || JUNK_FILENAME.test(base) || /^\d[\d._\s-]*$/.test(base)) return null;
  return base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}
