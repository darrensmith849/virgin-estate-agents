import type { MetadataRoute } from "next";

import { getPublicListingSlugs } from "@/lib/data/listings";
import { SITE, HARARE_SUBURBS } from "@/lib/constants";
import { slugifySuburb } from "@/lib/suburbs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/listings",
    "/guides",
    "/agents",
    "/about",
    "/contact",
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  // Neighbourhood guides — one local-SEO page per Harare suburb.
  const guideRoutes: MetadataRoute.Sitemap = HARARE_SUBURBS.map((suburb) => ({
    url: `${base}/guides/${slugifySuburb(suburb)}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  let listingRoutes: MetadataRoute.Sitemap = [];
  try {
    const slugs = await getPublicListingSlugs();
    listingRoutes = slugs.map((l) => ({
      url: `${base}/listings/${l.slug}`,
      lastModified: l.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch {
    // DB unavailable at build — static routes still emit.
  }

  return [...staticRoutes, ...guideRoutes, ...listingRoutes];
}
