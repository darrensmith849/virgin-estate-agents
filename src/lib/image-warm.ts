import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import { db, isDbConfigured } from "@/db";
import { listingImages, listings } from "@/db/schema";
import { SITE } from "@/lib/constants";

/*
 * Pre-build the listing photos after the server starts.
 *
 * Photos go through Next's image optimiser, which makes each size and format
 * the first time it's asked for and caches it. AVIF (half the bytes of WebP on
 * these photos) takes a second or two to make on this server, and a release
 * replaces the build folder the cache lives in — so after every release the
 * first person to open each listing waited for every photo to be made. This
 * asks for each public listing photo at the sizes the site uses, one at a
 * time, shortly after start-up, so visitors get them straight from the cache.
 *
 * Deliberately free of "server-only": it's started from instrumentation.ts.
 */

/** Sizes the site's photos are shown at, and the quality each uses. */
const VARIANTS = [
  // Cards, the gallery's main photo and the viewer (quality 60).
  ...[640, 828, 1080, 1200, 1920].map((w) => ({ w, q: 60 })),
  // Gallery thumbnails (quality 50).
  ...[128, 256].map((w) => ({ w, q: 50 })),
];
/** What browsers send, so the cached copy is the AVIF they'll ask for. */
const ACCEPT = "image/avif,image/webp,*/*";
/** Gap between requests, so the shared server isn't kept busy. */
const PAUSE_MS = 250;

let started = false;

export function warmListingImages(): void {
  if (started || !isDbConfigured) return;
  const base = SITE.url.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production" || base.startsWith("http://localhost")) return;
  started = true;
  // Let the server finish starting and serve its first visitors first.
  setTimeout(() => {
    run(base).catch((err) => console.error("[images] warm-up stopped:", err));
  }, 30_000);
}

async function run(base: string) {
  const t0 = Date.now();
  // Every photo of every listing on the site; homepage listings first.
  const rows = await db
    .select({ url: listingImages.url })
    .from(listingImages)
    .innerJoin(listings, eq(listingImages.listingId, listings.id))
    .where(
      and(inArray(listings.status, ["for_sale", "under_offer", "sold"]), isNull(listings.deletedAt)),
    )
    .orderBy(desc(listings.isFeatured), asc(listings.featuredOrder), asc(listingImages.sortOrder));

  // Same address the site's <Image> components use (see lib/media.ts).
  const photos = [...new Set(rows.map((r) => r.url))].map((url) =>
    url.startsWith("/uploads/") ? `${base}${url}` : url,
  );

  let made = 0;
  let cached = 0;
  for (const photo of photos) {
    for (const { w, q } of VARIANTS) {
      try {
        const res = await fetch(
          `${base}/_next/image?url=${encodeURIComponent(photo)}&w=${w}&q=${q}`,
          { headers: { accept: ACCEPT } },
        );
        await res.arrayBuffer();
        if (res.headers.get("x-nextjs-cache") === "HIT") cached++;
        else made++;
      } catch {
        // A photo that fails here will simply be made on first view.
      }
      await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
  }
  console.log(
    `[images] warm-up: ${photos.length} photos, ${made} sizes made, ${cached} already cached, ${Math.round((Date.now() - t0) / 1000)}s`,
  );
}
