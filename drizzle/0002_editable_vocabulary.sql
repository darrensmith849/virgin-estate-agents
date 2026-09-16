-- Let the agency name its own property types, spec labels and features.
--
-- property_type stops being a fixed enum so staff can type anything ("Cottage",
-- "Duplex", "Warehouse"). Existing values carry over unchanged as text.
ALTER TABLE "listings" ALTER COLUMN "property_type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "property_type" TYPE text USING "property_type"::text;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "property_type" SET DEFAULT 'house';--> statement-breakpoint
DROP TYPE IF EXISTS "property_type";--> statement-breakpoint

-- Agency-editable vocabulary. All nullable: null means "use the built-in
-- defaults", so an untouched install behaves exactly as it did before.
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "spec_labels" jsonb;--> statement-breakpoint
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "kind_labels" jsonb;--> statement-breakpoint
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "feature_options" jsonb;--> statement-breakpoint
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "property_type_options" jsonb;
