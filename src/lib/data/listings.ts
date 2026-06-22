import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { listings, listingImages } from "@/db/schema";

export type PublicListingFilters = {
  kind?: "sale" | "rent";
  propertyType?: string;
  suburb?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  q?: string;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  perPage?: number;
};

const PUBLIC_STATUSES = ["for_sale", "under_offer", "sold"] as const;

/** Listings for the public index, with cover image + agent. */
export async function listPublicListings(filters: PublicListingFilters = {}) {
  const perPage = Math.min(filters.perPage ?? 12, 48);
  const page = Math.max(filters.page ?? 1, 1);

  const conditions = [inArray(listings.status, [...PUBLIC_STATUSES])];
  if (filters.kind) conditions.push(eq(listings.kind, filters.kind));
  if (filters.propertyType)
    conditions.push(eq(listings.propertyType, filters.propertyType as never));
  if (filters.suburb) conditions.push(eq(listings.suburb, filters.suburb));
  if (filters.minPrice) conditions.push(gte(listings.price, filters.minPrice));
  if (filters.maxPrice) conditions.push(lte(listings.price, filters.maxPrice));
  if (filters.minBeds) conditions.push(gte(listings.bedrooms, filters.minBeds));
  if (filters.q) {
    const term = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(listings.title, term),
        ilike(listings.suburb, term),
        ilike(listings.description, term),
      )!,
    );
  }

  const where = and(...conditions);
  const orderBy =
    filters.sort === "price_asc"
      ? [asc(listings.price)]
      : filters.sort === "price_desc"
        ? [desc(listings.price)]
        : [desc(listings.publishedAt), desc(listings.createdAt)];

  const [rows, totalRow] = await Promise.all([
    db.query.listings.findMany({
      where,
      orderBy,
      limit: perPage,
      offset: (page - 1) * perPage,
      with: {
        agent: true,
        images: { orderBy: [desc(listingImages.isCover), asc(listingImages.sortOrder)] },
      },
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(listings).where(where),
  ]);

  return {
    items: rows,
    total: totalRow[0]?.count ?? 0,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil((totalRow[0]?.count ?? 0) / perPage)),
  };
}

/** Featured listings for the homepage. */
export async function getFeaturedListings(limit = 6) {
  return db.query.listings.findMany({
    where: and(
      eq(listings.isFeatured, true),
      inArray(listings.status, [...PUBLIC_STATUSES]),
    ),
    orderBy: [desc(listings.publishedAt), desc(listings.createdAt)],
    limit,
    with: {
      agent: true,
      images: { orderBy: [desc(listingImages.isCover), asc(listingImages.sortOrder)] },
    },
  });
}

/** Public detail page by slug (any public status). */
export async function getListingBySlug(slug: string) {
  return db.query.listings.findFirst({
    where: eq(listings.slug, slug),
    with: {
      agent: true,
      images: { orderBy: [desc(listingImages.isCover), asc(listingImages.sortOrder)] },
    },
  });
}

/** Similar listings (same suburb or type), excluding the current one. */
export async function getSimilarListings(
  listingId: string,
  opts: { suburb?: string | null; propertyType?: string; limit?: number },
) {
  const conditions = [
    inArray(listings.status, [...PUBLIC_STATUSES]),
    sql`${listings.id} <> ${listingId}`,
  ];
  const match = [];
  if (opts.suburb) match.push(eq(listings.suburb, opts.suburb));
  if (opts.propertyType)
    match.push(eq(listings.propertyType, opts.propertyType as never));
  if (match.length) conditions.push(or(...match)!);

  return db.query.listings.findMany({
    where: and(...conditions),
    orderBy: [desc(listings.createdAt)],
    limit: opts.limit ?? 3,
    with: {
      images: { orderBy: [desc(listingImages.isCover), asc(listingImages.sortOrder)] },
    },
  });
}

/* ----------------------------- Admin reads ------------------------------- */

/** All listings for the admin table (includes drafts). */
export async function listAdminListings() {
  return db.query.listings.findMany({
    orderBy: [desc(listings.updatedAt)],
    with: {
      agent: true,
      images: { orderBy: [desc(listingImages.isCover), asc(listingImages.sortOrder)] },
    },
  });
}

export async function getListingById(id: string) {
  return db.query.listings.findFirst({
    where: eq(listings.id, id),
    with: {
      agent: true,
      images: { orderBy: [asc(listingImages.sortOrder)] },
    },
  });
}

export type ListingWithRelations = NonNullable<
  Awaited<ReturnType<typeof getListingById>>
>;

/** Slugs + timestamps of public listings, for the sitemap. */
export async function getPublicListingSlugs() {
  return db
    .select({ slug: listings.slug, updatedAt: listings.updatedAt })
    .from(listings)
    .where(inArray(listings.status, [...PUBLIC_STATUSES]));
}
