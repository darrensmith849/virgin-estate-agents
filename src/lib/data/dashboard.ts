import "server-only";
import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { enquiries, listings, pageViews } from "@/db/schema";

export async function getDashboardStats() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [active, drafts, newEnq, viewsWeek, recentEnquiries, recentListings, sold, soldTotal] =
    await Promise.all([
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(listings)
        .where(and(inArray(listings.status, ["for_sale", "under_offer"]), isNull(listings.deletedAt))),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(listings)
        .where(and(eq(listings.status, "draft"), isNull(listings.deletedAt))),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(enquiries)
        .where(eq(enquiries.status, "new")),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(pageViews)
        .where(and(gte(pageViews.createdAt, weekAgo))),
      db.query.enquiries.findMany({
        orderBy: [desc(enquiries.createdAt)],
        limit: 5,
        with: { listing: { columns: { title: true, slug: true } } },
      }),
      db.query.listings.findMany({
        where: isNull(listings.deletedAt),
        orderBy: [desc(listings.updatedAt)],
        limit: 5,
        columns: {
          id: true,
          title: true,
          slug: true,
          status: true,
          price: true,
          kind: true,
          rentPeriod: true,
          refNumber: true,
        },
      }),
      // The most recent sales; the Sold tab has them all.
      db.query.listings.findMany({
        where: and(eq(listings.status, "sold"), isNull(listings.deletedAt)),
        orderBy: [sql`${listings.soldAt} desc nulls last`, desc(listings.refNumber)],
        limit: 5,
        columns: {
          id: true,
          title: true,
          suburb: true,
          price: true,
          kind: true,
          rentPeriod: true,
          refNumber: true,
          soldAt: true,
        },
      }),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(listings)
        .where(and(eq(listings.status, "sold"), isNull(listings.deletedAt))),
    ]);

  return {
    activeListings: active[0]?.c ?? 0,
    draftListings: drafts[0]?.c ?? 0,
    newEnquiries: newEnq[0]?.c ?? 0,
    viewsThisWeek: viewsWeek[0]?.c ?? 0,
    recentEnquiries,
    recentListings,
    sold,
    soldCount: soldTotal[0]?.c ?? 0,
  };
}
