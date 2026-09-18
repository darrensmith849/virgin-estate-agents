import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*  Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const listingStatus = pgEnum("listing_status", [
  "draft",
  "for_sale",
  "under_offer",
  "sold",
]);

export const listingKind = pgEnum("listing_kind", ["sale", "rent"]);

/* property_type was a pgEnum. It is now free text so the agency can name their
   own property types (see PROPERTY_TYPE_SUGGESTIONS for the seeded options). */

export const enquiryStatus = pgEnum("enquiry_status", [
  "new",
  "contacted",
  "closed",
]);

/* -------------------------------------------------------------------------- */
/*  Users — the single shared admin login (room to grow to multi-user later)   */
/* -------------------------------------------------------------------------- */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Agents — display-only profiles shown on listings (no individual logins)    */
/* -------------------------------------------------------------------------- */

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  title: varchar("title", { length: 120 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 40 }),
  whatsapp: varchar("whatsapp", { length: 40 }),
  photoUrl: text("photo_url"),
  bio: text("bio"),
  active: boolean("active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Listings                                                                   */
/* -------------------------------------------------------------------------- */

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 200 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull().default(""),
    status: listingStatus("status").notNull().default("draft"),
    kind: listingKind("kind").notNull().default("sale"),
    propertyType: text("property_type").notNull().default("house"),

    // Pricing — USD whole dollars (Zimbabwean property convention).
    price: integer("price").notNull().default(0),
    rentPeriod: varchar("rent_period", { length: 20 }), // e.g. "month" (rentals only)

    // Specs
    /* Nullable on purpose: NULL means the spec doesn't apply to this property
       and is hidden, while 0 is a genuine zero (a studio, a house with no
       garage). Kept as columns rather than folded into customSpecs because the
       public filters sort and range-query on them. */
    bedrooms: integer("bedrooms"),
    bathrooms: integer("bathrooms"),
    garages: integer("garages"),
    landSizeSqm: integer("land_size_sqm"),
    floorSizeSqm: integer("floor_size_sqm"),
    /** Extra specs the agency defines per listing, in their chosen order. */
    customSpecs: jsonb("custom_specs")
      .$type<{ label: string; value: string }[]>()
      .default([])
      .notNull(),

    // Location
    addressLine: varchar("address_line", { length: 255 }),
    suburb: varchar("suburb", { length: 120 }),
    city: varchar("city", { length: 120 }).default("Harare").notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),

    // Misc
    features: jsonb("features").$type<string[]>().default([]).notNull(),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    isFeatured: boolean("is_featured").default(false).notNull(),
    /** Position in the homepage featured grid, lowest first. Only meaningful
     *  while isFeatured is true; set by dragging in the admin. */
    featuredOrder: integer("featured_order").default(0).notNull(),
    viewsCount: integer("views_count").default(0).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [
    index("listings_status_idx").on(t.status),
    index("listings_kind_idx").on(t.kind),
    index("listings_suburb_idx").on(t.suburb),
    index("listings_featured_idx").on(t.isFeatured),
    index("listings_featured_order_idx").on(t.isFeatured, t.featuredOrder),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Listing images                                                             */
/* -------------------------------------------------------------------------- */

export const listingImages = pgTable(
  "listing_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    key: text("key").notNull(), // storage key (R2 object key / local path)
    url: text("url").notNull(), // public URL
    alt: varchar("alt", { length: 255 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isCover: boolean("is_cover").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("listing_images_listing_idx").on(t.listingId)],
);

/* -------------------------------------------------------------------------- */
/*  Listing videos                                                             */
/* -------------------------------------------------------------------------- */

export const listingVideos = pgTable(
  "listing_videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    key: text("key").notNull(), // storage key (R2 object key / local path)
    url: text("url").notNull(), // public URL
    title: varchar("title", { length: 255 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("listing_videos_listing_idx").on(t.listingId)],
);

/* -------------------------------------------------------------------------- */
/*  Enquiries                                                                  */
/* -------------------------------------------------------------------------- */

export const enquiries = pgTable(
  "enquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id").references(() => listings.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    message: text("message").notNull(),
    status: enquiryStatus("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("enquiries_status_idx").on(t.status),
    index("enquiries_listing_idx").on(t.listingId),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Page views — lightweight analytics events                                  */
/* -------------------------------------------------------------------------- */

export const pageViews = pgTable(
  "page_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    path: varchar("path", { length: 512 }).notNull(),
    listingId: uuid("listing_id").references(() => listings.id, {
      onDelete: "set null",
    }),
    referrer: varchar("referrer", { length: 512 }),
    country: varchar("country", { length: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("page_views_listing_idx").on(t.listingId),
    index("page_views_created_idx").on(t.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Agency settings — a single editable row (id = 1)                            */
/* -------------------------------------------------------------------------- */

export const agencySettings = pgTable("agency_settings", {
  id: integer("id").primaryKey().default(1),
  name: varchar("name", { length: 160 }).default("Virgin Estate Agents").notNull(),
  tagline: varchar("tagline", { length: 255 }),
  phone: varchar("phone", { length: 40 }),
  whatsapp: varchar("whatsapp", { length: 40 }),
  email: varchar("email", { length: 255 }),
  officeAddress: text("office_address"),
  facebook: varchar("facebook", { length: 255 }),
  instagram: varchar("instagram", { length: 255 }),
  linkedin: varchar("linkedin", { length: 255 }),
  heroHeadline: varchar("hero_headline", { length: 255 }),
  heroSubheadline: text("hero_subheadline"),
  heroImageUrl: text("hero_image_url"),

  /* Agency-editable vocabulary. Each falls back to the built-in defaults in
     constants.ts when null, so an untouched install looks exactly as before. */
  specLabels: jsonb("spec_labels").$type<Record<string, string>>(),
  kindLabels: jsonb("kind_labels").$type<Record<string, string>>(),
  featureOptions: jsonb("feature_options").$type<string[]>(),
  propertyTypeOptions: jsonb("property_type_options").$type<string[]>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Relations                                                                  */
/* -------------------------------------------------------------------------- */

export const listingsRelations = relations(listings, ({ one, many }) => ({
  agent: one(agents, {
    fields: [listings.agentId],
    references: [agents.id],
  }),
  images: many(listingImages),
  videos: many(listingVideos),
  enquiries: many(enquiries),
}));

export const agentsRelations = relations(agents, ({ many }) => ({
  listings: many(listings),
}));

export const listingImagesRelations = relations(listingImages, ({ one }) => ({
  listing: one(listings, {
    fields: [listingImages.listingId],
    references: [listings.id],
  }),
}));

export const listingVideosRelations = relations(listingVideos, ({ one }) => ({
  listing: one(listings, {
    fields: [listingVideos.listingId],
    references: [listings.id],
  }),
}));

export const enquiriesRelations = relations(enquiries, ({ one }) => ({
  listing: one(listings, {
    fields: [enquiries.listingId],
    references: [listings.id],
  }),
}));

/* -------------------------------------------------------------------------- */
/*  Inferred types                                                             */
/* -------------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type ListingImage = typeof listingImages.$inferSelect;
export type ListingVideo = typeof listingVideos.$inferSelect;
export type Enquiry = typeof enquiries.$inferSelect;
export type NewEnquiry = typeof enquiries.$inferInsert;
export type AgencySettings = typeof agencySettings.$inferSelect;
