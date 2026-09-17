-- Specifications that fit the property rather than the other way round.
--
-- bedrooms/bathrooms/garages were NOT NULL DEFAULT 0, so "not applicable" and
-- "zero" were the same value. A commercial building had to claim 0 bedrooms.
-- They become nullable: NULL means the spec doesn't apply and is hidden, 0
-- still means a genuine zero (a studio, a house with no garage).
--
-- Existing rows keep their 0s; nothing is reinterpreted retroactively.
ALTER TABLE "listings" ALTER COLUMN "bedrooms" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "bedrooms" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "bathrooms" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "bathrooms" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "garages" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "garages" DROP DEFAULT;--> statement-breakpoint

-- Free-form extra specs, e.g. [{"label":"Loading bays","value":"3"}].
-- Ordered as the agency entered them.
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "custom_specs" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint

-- Existing bare-land listings stored 0 bedrooms/bathrooms because the columns
-- couldn't be empty. That would now render as a real "0", so reinterpret just
-- those rows as "not applicable". Only touches land-type listings that are
-- already at 0, so nothing with real numbers is altered.
UPDATE "listings"
SET "bedrooms" = NULL, "bathrooms" = NULL
WHERE "property_type" ~* '(stand|land|plot)'
  AND COALESCE("bedrooms", 0) = 0
  AND COALESCE("bathrooms", 0) = 0;
