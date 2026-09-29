-- "Rented" as a status of its own, and testimonials the agency manages.
--
-- Rented used to be status "sold" on a rental, so marking a for-sale listing
-- Rented meant switching its type — and putting it back on the market then
-- left it as a rental. As its own status, nothing else about the listing
-- changes. A rental marked Rented the old way (status "sold", type rent)
-- needs moving across once, AFTER this has committed (a new enum value can't
-- be used in the transaction that adds it):
--   UPDATE listings SET status = 'rented' WHERE status = 'sold' AND kind = 'rent';
-- Only once — from then on a rental can genuinely be marked Sold. (Where the
-- app adds the value itself, src/db/ensure-schema.ts does this move once.)
--
-- testimonials: client quotes shown on the homepage, edited in Settings.
-- Empty until the agency adds real ones, and the section is hidden until then.
--
-- Additive only.
ALTER TYPE "listing_status" ADD VALUE IF NOT EXISTS 'rented';
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "testimonials" jsonb;
