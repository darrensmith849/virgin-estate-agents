CREATE TABLE "listing_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"key" text NOT NULL,
	"url" text NOT NULL,
	"title" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing_videos" ADD CONSTRAINT "listing_videos_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "listing_videos_listing_idx" ON "listing_videos" USING btree ("listing_id");
