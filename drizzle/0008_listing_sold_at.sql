-- When a listing was marked Sold, for the Sold tab. Cleared if it goes back
-- on the market. Listings already marked sold take the time they were last
-- updated, which is when they were marked. Additive and safe to re-run.
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "sold_at" timestamp with time zone;
UPDATE "listings" SET "sold_at" = "updated_at" WHERE "status" = 'sold' AND "sold_at" IS NULL;
