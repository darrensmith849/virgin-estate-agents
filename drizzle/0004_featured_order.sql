-- Let the agency choose the order of the homepage featured grid.
--
-- `is_featured` already said *whether* a listing appears there; the grid was
-- then ordered by publish date, so the only way to change the order was to
-- republish. This adds an explicit position, set by dragging in the admin.
--
-- Existing featured listings are seeded in their current display order
-- (publish date, newest first) so nothing visibly moves on the homepage the
-- moment this lands.
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "featured_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

WITH ranked AS (
  SELECT id, row_number() OVER (
           ORDER BY published_at DESC NULLS LAST, created_at DESC
         ) AS position
  FROM listings
  WHERE is_featured
)
UPDATE listings SET featured_order = ranked.position
FROM ranked WHERE listings.id = ranked.id;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "listings_featured_order_idx"
  ON "listings" ("is_featured", "featured_order");
