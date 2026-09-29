-- Reference numbers in the order listings went live, and a chosen category.
--
-- ref_number: VE-001, VE-002, … The listings already live are numbered oldest
-- first (by when they were first published); after that each listing gets the
-- next number the first time it's published, from listing_ref_seq. Drafts have
-- none, so abandoned drafts leave no gaps. Numbers are never reused.
--
-- category: where the listing is grouped on the website — residential,
-- commercial, industrial or land. Null means "work it out from the property
-- type", which is how every existing listing carries on.
--
-- Additive only: nothing already entered on a listing is changed.
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "ref_number" integer;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "category" text;
CREATE UNIQUE INDEX IF NOT EXISTS "listings_ref_number_idx" ON "listings" ("ref_number");
CREATE SEQUENCE IF NOT EXISTS "listing_ref_seq";

WITH start AS (SELECT coalesce(max("ref_number"), 0) AS n FROM "listings"),
ordered AS (
  SELECT "id", row_number() OVER (
    ORDER BY coalesce("published_at", "created_at"), "created_at", "id"
  ) AS rn
  FROM "listings"
  WHERE "status" <> 'draft' AND "ref_number" IS NULL
)
UPDATE "listings" l
SET "ref_number" = start.n + ordered.rn
FROM ordered, start
WHERE l."id" = ordered."id";

-- Carry on from the highest number in use (never below what the sequence
-- has already handed out).
SELECT setval(
  '"listing_ref_seq"',
  greatest(
    (SELECT coalesce(max("ref_number"), 0) FROM "listings"),
    (SELECT CASE WHEN is_called THEN last_value ELSE last_value - 1 END FROM "listing_ref_seq")
  ) + 1,
  false
);
