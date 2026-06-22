import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "@/db";
import { enquiries, listings, pageViews } from "@/db/schema";
import { SITE } from "@/lib/constants";

function selfHost() {
  try {
    return new URL(SITE.url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function bucketReferrer(ref: string | null): string {
  if (!ref) return "Direct";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (host === selfHost() || host === "localhost") return "Direct";
    if (host.includes("google")) return "Google";
    if (host.includes("facebook") || host.includes("fb.")) return "Facebook";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("bing")) return "Bing";
    if (host.includes("t.co") || host.includes("twitter") || host.includes("x.com"))
      return "X / Twitter";
    return host;
  } catch {
    return "Direct";
  }
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getAnalytics(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [viewRows, totalViewsRow, totalEnqRow, topRows, refRows, geoRows] =
    await Promise.all([
      db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${pageViews.createdAt}), 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(pageViews)
        .where(gte(pageViews.createdAt, since))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(pageViews)
        .where(gte(pageViews.createdAt, since)),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(enquiries)
        .where(gte(enquiries.createdAt, since)),
      db
        .select({
          title: listings.title,
          slug: listings.slug,
          views: sql<number>`count(*)::int`,
        })
        .from(pageViews)
        .innerJoin(listings, eq(pageViews.listingId, listings.id))
        .where(gte(pageViews.createdAt, since))
        .groupBy(listings.id, listings.title, listings.slug)
        .orderBy(desc(sql`count(*)`))
        .limit(8),
      db
        .select({
          referrer: pageViews.referrer,
          count: sql<number>`count(*)::int`,
        })
        .from(pageViews)
        .where(gte(pageViews.createdAt, since))
        .groupBy(pageViews.referrer),
      db
        .select({
          country: pageViews.country,
          count: sql<number>`count(*)::int`,
        })
        .from(pageViews)
        .where(and(gte(pageViews.createdAt, since)))
        .groupBy(pageViews.country)
        .orderBy(desc(sql`count(*)`))
        .limit(8),
    ]);

  // Fill the daily series so the chart has a point for every day.
  const counts = new Map(viewRows.map((r) => [r.day, r.count]));
  const viewsOverTime: { date: string; views: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = isoDay(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
    viewsOverTime.push({ date: d, views: counts.get(d) ?? 0 });
  }

  // Bucket referrers into sources.
  const sourceMap = new Map<string, number>();
  for (const r of refRows) {
    const key = bucketReferrer(r.referrer);
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + r.count);
  }
  const trafficSources = [...sourceMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const totalViews = totalViewsRow[0]?.c ?? 0;
  const totalEnquiries = totalEnqRow[0]?.c ?? 0;
  const conversionRate =
    totalViews > 0 ? Math.round((totalEnquiries / totalViews) * 1000) / 10 : 0;

  return {
    days,
    totalViews,
    totalEnquiries,
    conversionRate,
    viewsOverTime,
    topListings: topRows,
    trafficSources,
    geo: geoRows.filter((g) => g.country).map((g) => ({ country: g.country!, count: g.count })),
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof getAnalytics>>;
