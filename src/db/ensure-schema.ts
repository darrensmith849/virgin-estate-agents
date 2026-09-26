import { sql } from "drizzle-orm";

import { db, isDbConfigured } from "./index";

/**
 * Schema additions that must exist before the app queries the tables.
 *
 * Drizzle selects every column it knows about, so shipping code that knows about
 * `listings.deleted_at` to a database without it would fail every listing query
 * — and public pages swallow read errors, so the site would quietly show no
 * listings at all. The same SQL lives in drizzle/0005_listing_recycle_bin.sql
 * for applying by hand; this runs it idempotently at server start (from
 * instrumentation.ts) so a deploy can't get ahead of the database.
 *
 * Deliberately free of "server-only": instrumentation runs outside the React
 * server layer.
 */
export async function ensureSchema(): Promise<void> {
  if (!isDbConfigured) return;
  try {
    await db.execute(sql`ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "listings_deleted_at_idx" ON "listings" ("deleted_at")`);
    await db.execute(sql`ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "spec_options" jsonb`);
    await db.execute(sql`ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "hidden_specs" jsonb`);
  } catch (err) {
    // Never block start-up: an unreachable database is handled by the pages'
    // own fallbacks, and the next start will try again.
    console.error("[schema] ensure failed:", err);
  }
}
