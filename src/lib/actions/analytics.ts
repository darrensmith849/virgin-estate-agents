"use server";

import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { listings, pageViews } from "@/db/schema";

/**
 * Records a listing detail view. Called once per session per listing from the
 * client (see ViewTracker). Failures are swallowed — analytics must never
 * break the page.
 */
export async function recordListingView(input: {
  listingId: string;
  path: string;
  referrer?: string;
}): Promise<void> {
  try {
    const h = await headers();
    const country = h.get("cf-ipcountry"); // present on Cloudflare in prod
    await db.insert(pageViews).values({
      path: input.path.slice(0, 512),
      listingId: input.listingId,
      referrer: input.referrer ? input.referrer.slice(0, 512) : null,
      country: country && country.length === 2 ? country.toUpperCase() : null,
    });
    await db
      .update(listings)
      .set({ viewsCount: sql`${listings.viewsCount} + 1` })
      .where(eq(listings.id, input.listingId));
  } catch {
    // ignore
  }
}
