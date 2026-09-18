import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { listings, listingImages, listingVideos } from "@/db/schema";
import { ensureVideoTable } from "@/db/bootstrap";
import { formatPropertyType } from "@/lib/vocabulary";
import { safeRead } from "./_safe";

/** Videos for a listing, tolerant of the table not existing yet. */
async function listingVideosFor(listingId: string) {
  try {
    await ensureVideoTable();
    return await db.query.listingVideos.findMany({
      where: eq(listingVideos.listingId, listingId),
      orderBy: [asc(listingVideos.sortOrder)],
    });
  } catch (err) {
    console.error("[data] listing videos read failed; serving none:", err);
    return [];
  }
}

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

/**
 * Drizzle's relational `with` can't filter the joined row, so a deactivated
 * agent would still have their name, photo and direct line rendered on every
 * listing they're attached to. Drop them on the way out instead.
 */
function publicAgent<T extends { active: boolean }>(agent: T | null | undefined) {
  return agent?.active ? agent : null;
}

/** Listings for the public index, with cover image + agent. */
export async function listPublicListings(filters: PublicListingFilters = {}) {
  const perPage = Math.min(filters.perPage ?? 12, 48);
  const page = Math.max(filters.page ?? 1, 1);

  const conditions = [inArray(listings.status, [...PUBLIC_STATUSES])];
  if (filters.kind) conditions.push(eq(listings.kind, filters.kind));
  // Legacy rows hold the old lowercase slugs ("house") while anything typed
  // since is stored as written ("House"), so match without case.
  if (filters.propertyType)
    conditions.push(sql`lower(${listings.propertyType}) = lower(${filters.propertyType})`);
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
  // Default order groups the page: everything for sale first, then everything
  // to rent, newest first within each. `kind` is a pgEnum declared as
  // ["sale", "rent"], and Postgres sorts enums by declaration order, so `asc`
  // gives sale-then-rent without a CASE. An explicit price sort is left alone —
  // someone sorting by price wants one continuous run, not two.
  const orderBy =
    filters.sort === "price_asc"
      ? [asc(listings.price)]
      : filters.sort === "price_desc"
        ? [desc(listings.price)]
        : [asc(listings.kind), desc(listings.publishedAt), desc(listings.createdAt)];

  return safeRead(
    async () => {
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
        items: rows.map((r) => ({ ...r, agent: publicAgent(r.agent) })),
        total: totalRow[0]?.count ?? 0,
        page,
        perPage,
        pageCount: Math.max(1, Math.ceil((totalRow[0]?.count ?? 0) / perPage)),
      };
    },
    { items: [], total: 0, page, perPage, pageCount: 1 },
  );
}

/** Featured listings for the homepage. */
export async function getFeaturedListings(limit = 6) {
  return safeRead(
    async () => {
      const rows = await db.query.listings.findMany({
        where: and(
          eq(listings.isFeatured, true),
          inArray(listings.status, [...PUBLIC_STATUSES]),
        ),
        // The order the agency arranged in the admin; publish date only breaks
        // ties, which matters for listings featured before ordering existed.
        orderBy: [
          asc(listings.featuredOrder),
          desc(listings.publishedAt),
          desc(listings.createdAt),
        ],
        limit,
        with: {
          agent: true,
          images: { orderBy: [desc(listingImages.isCover), asc(listingImages.sortOrder)] },
        },
      });
      return rows.map((r) => ({ ...r, agent: publicAgent(r.agent) }));
    },
    [],
  );
}

/**
 * Public detail page by slug. Restricted to published statuses — a draft must
 * not be reachable by guessing its slug. Admins preview unpublished listings
 * through `/admin/listings/[id]/preview` instead.
 */
export async function getListingBySlug(slug: string) {
  return safeRead(async () => {
    const listing = await db.query.listings.findFirst({
      where: and(
        eq(listings.slug, slug),
        inArray(listings.status, [...PUBLIC_STATUSES]),
      ),
      with: {
        agent: true,
        images: { orderBy: [desc(listingImages.isCover), asc(listingImages.sortOrder)] },
      },
    });
    if (!listing) return undefined;
    return {
      ...listing,
      agent: publicAgent(listing.agent),
      videos: await listingVideosFor(listing.id),
    };
  }, undefined);
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

  return safeRead(
    () =>
      db.query.listings.findMany({
        where: and(...conditions),
        orderBy: [desc(listings.createdAt)],
        limit: opts.limit ?? 3,
        with: {
          images: { orderBy: [desc(listingImages.isCover), asc(listingImages.sortOrder)] },
        },
      }),
    [],
  );
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
  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, id),
    with: {
      agent: true,
      images: { orderBy: [asc(listingImages.sortOrder)] },
    },
  });
  if (!listing) return listing;
  return { ...listing, videos: await listingVideosFor(listing.id) };
}

export type ListingWithRelations = NonNullable<
  Awaited<ReturnType<typeof getListingById>>
>;

/** Slugs + timestamps of public listings, for the sitemap. */
export async function getPublicListingSlugs() {
  return safeRead(
    () =>
      db
        .select({ slug: listings.slug, updatedAt: listings.updatedAt })
        .from(listings)
        .where(inArray(listings.status, [...PUBLIC_STATUSES])),
    [] as { slug: string; updatedAt: Date }[],
  );
}

/**
 * The property types that actually appear on public listings, for the filter
 * dropdowns. Driven by the data rather than a fixed list, so a type the agency
 * invents is immediately filterable — and one nobody uses doesn't clutter the
 * menu. Old slugs and new free text are folded together by display name.
 */
export async function listPropertyTypesInUse(): Promise<string[]> {
  return safeRead(async () => {
    const rows = await db
      .selectDistinct({ propertyType: listings.propertyType })
      .from(listings)
      .where(inArray(listings.status, [...PUBLIC_STATUSES]));

    const seen = new Map<string, string>();
    for (const { propertyType } of rows) {
      const label = formatPropertyType(propertyType);
      if (!label) continue;
      const key = label.toLowerCase();
      if (!seen.has(key)) seen.set(key, label);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, []);
}
