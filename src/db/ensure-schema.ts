import { sql } from "drizzle-orm";

import { db, isDbConfigured } from "./index";

/**
 * Schema additions that must exist before the app queries the tables.
 *
 * Drizzle selects every column it knows about, so shipping code that knows about
 * `listings.deleted_at` to a database without it would fail every listing query
 * — and public pages swallow read errors, so the site would quietly show no
 * listings at all. The same SQL lives in drizzle/0005_listing_recycle_bin.sql
 * drizzle/0006_video_posters.sql, drizzle/0007_listing_refs_and_category.sql
 * (which also numbers existing listings) and drizzle/0008_listing_sold_at.sql,
 * and should be applied by hand before
 * deploying; this is the safety net, run
 * at server start from instrumentation.ts.
 *
 * It only looks first and adds what is missing, so on a database that already
 * has the columns it changes nothing and takes no locks. Each addition is tried
 * on its own with a short lock timeout, so one failure (say, a user without
 * ALTER rights) neither blocks start-up nor stops the others.
 *
 * Deliberately free of "server-only": instrumentation runs outside the React
 * server layer.
 */
const COLUMNS = [
  { table: "listings", column: "deleted_at", type: sql`timestamp with time zone` },
  { table: "agency_settings", column: "spec_options", type: sql`jsonb` },
  { table: "agency_settings", column: "hidden_specs", type: sql`jsonb` },
  { table: "listing_videos", column: "poster_url", type: sql`text` },
  { table: "listings", column: "ref_number", type: sql`integer` },
  { table: "listings", column: "category", type: sql`text` },
  { table: "listings", column: "sold_at", type: sql`timestamp with time zone` },
  { table: "agency_settings", column: "testimonials", type: sql`jsonb` },
] as const;

export async function ensureSchema(): Promise<void> {
  if (!isDbConfigured) return;

  let present: Set<string>;
  try {
    const rows = (await db.execute(sql`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND (table_name, column_name) IN (
          ('listings', 'deleted_at'),
          ('agency_settings', 'spec_options'),
          ('agency_settings', 'hidden_specs'),
          ('listing_videos', 'poster_url'),
          ('listings', 'ref_number'),
          ('listings', 'category'),
          ('listings', 'sold_at'),
          ('agency_settings', 'testimonials')
        )
    `)) as unknown as { table_name: string; column_name: string }[];
    present = new Set(
      (Array.isArray(rows) ? rows : ((rows as { rows?: typeof rows }).rows ?? [])).map(
        (r) => `${r.table_name}.${r.column_name}`,
      ),
    );
  } catch (err) {
    console.error("[schema] ensure failed: could not read the schema:", err);
    return;
  }

  for (const { table, column, type } of COLUMNS) {
    if (present.has(`${table}.${column}`)) continue;
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
        await tx.execute(
          sql`ALTER TABLE ${sql.identifier(table)} ADD COLUMN IF NOT EXISTS ${sql.identifier(column)} ${type}`,
        );
        if (column === "deleted_at") {
          await tx.execute(
            sql`CREATE INDEX IF NOT EXISTS "listings_deleted_at_idx" ON "listings" ("deleted_at")`,
          );
        }
      });
      console.log(`[schema] added ${table}.${column}`);
    } catch (err) {
      console.error(
        `[schema] ensure failed: could not add ${table}.${column} — apply the matching drizzle/*.sql by hand:`,
        err,
      );
    }
  }

  // The "rented" status (drizzle/0009). Only when the value is first added:
  // rentals marked Rented the old way (status "sold") move across once. After
  // that a rental can genuinely be marked Sold, so it's never touched again.
  // (Adding an enum value can't share a transaction with using it, hence the
  // separate statements.)
  try {
    const had = (await db.execute(sql`
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'listing_status' AND e.enumlabel = 'rented'
    `)) as unknown as unknown[];
    if (Array.isArray(had) && had.length === 0) {
      await db.execute(sql`ALTER TYPE "listing_status" ADD VALUE IF NOT EXISTS 'rented'`);
      const moved = (await db.execute(
        sql`UPDATE "listings" SET "status" = 'rented' WHERE "status" = 'sold' AND "kind" = 'rent' RETURNING "id"`,
      )) as unknown as unknown[];
      const count = Array.isArray(moved) ? moved.length : 0;
      console.log(`[schema] added the rented status; moved ${count} let rental(s) to it`);
    }
  } catch (err) {
    console.error("[schema] ensure failed: could not add the rented status:", err);
  }
}
