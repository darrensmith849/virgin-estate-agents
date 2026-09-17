import { SITE } from "@/lib/constants";

/**
 * Turn a stored media URL into something `next/image` can actually optimise.
 *
 * Uploads live under `/uploads/...` on disk and are served by Caddy, not by
 * Next. That matters because Next's image optimiser resolves *local* paths
 * against a manifest of `public/` built when the server starts — so a photo
 * uploaded afterwards comes back "The requested resource isn't a valid image",
 * even though the file is there and serves fine over HTTP.
 *
 * Handing the optimiser an absolute URL makes it fetch the file over HTTP
 * instead, which works immediately and keeps resizing and WebP conversion.
 * That matters more than it sounds: these are photos straight off a phone,
 * several megabytes each, viewed mostly on mobile data.
 *
 * Anything already absolute (the seeded Unsplash imagery, or R2 later) and any
 * other local asset is returned untouched.
 */
export function mediaSrc(url: string): string {
  if (!url.startsWith("/uploads/")) return url;
  // No base configured (local dev without NEXT_PUBLIC_SITE_URL) — leave it
  // relative rather than inventing a localhost URL the optimiser can't reach.
  const base = SITE.url.replace(/\/$/, "");
  if (!base || base.startsWith("http://localhost")) return url;
  return `${base}${url}`;
}
