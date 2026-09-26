-- Recycle bin for listings, and agency-managed specification types.
--
-- Deleting a listing used to remove the row and its photos and videos at once,
-- with no way back. Now it only stamps deleted_at: the listing disappears from
-- the site and the admin board but can be restored from the recycle bin for
-- 30 days, after which it is removed for good (files included).
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listings_deleted_at_idx" ON "listings" ("deleted_at");--> statement-breakpoint

-- The agency's own specification types, offered as fields on every listing,
-- and the standard specs they have chosen to hide. Null means "defaults".
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "spec_options" jsonb;--> statement-breakpoint
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "hidden_specs" jsonb;
