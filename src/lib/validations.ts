import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const optionalInt = z
  .preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(0).optional(),
  )
  .optional();

const optionalFloat = z
  .preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().optional(),
  )
  .optional();

export const listingSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters"),
  description: z.string().trim().default(""),
  status: z.enum(["draft", "for_sale", "under_offer", "sold"]),
  kind: z.enum(["sale", "rent"]),
  // Free text since the agency names its own types. Capped to the column width;
  // the built-in list is offered as suggestions, not enforced.
  propertyType: z
    .string()
    .trim()
    .min(1, "Choose or type a property type")
    .max(60, "That property type is too long"),
  price: z.coerce.number().int().min(0, "Price can't be negative").default(0),
  rentPeriod: optionalString,
  // Blank means "doesn't apply to this property" and is stored as NULL, which
  // hides the row; 0 is kept as a genuine zero.
  bedrooms: optionalInt,
  bathrooms: optionalInt,
  garages: optionalInt,
  landSizeSqm: optionalInt,
  floorSizeSqm: optionalInt,
  addressLine: optionalString,
  suburb: optionalString,
  city: z.string().trim().default("Harare"),
  latitude: optionalFloat,
  longitude: optionalFloat,
  features: z.array(z.string()).default([]),
  // Extra specs the agency defines per listing. Rows with a blank label are
  // dropped rather than rejected, so a half-filled row can't block a save.
  customSpecs: z
    .array(
      z.object({
        label: z.string().trim().max(60),
        value: z.string().trim().max(120),
      }),
    )
    .max(20)
    .default([])
    .transform((rows) => rows.filter((r) => r.label !== "")),
  agentId: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : null)),
  isFeatured: z.coerce.boolean().default(false),
});
export type ListingInput = z.infer<typeof listingSchema>;

export const agentSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  title: optionalString,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "Enter a valid email",
    }),
  phone: optionalString,
  whatsapp: optionalString,
  bio: optionalString,
  active: z.coerce.boolean().default(true),
});
export type AgentInput = z.infer<typeof agentSchema>;

export const settingsSchema = z.object({
  name: z.string().trim().min(2),
  tagline: optionalString,
  phone: optionalString,
  whatsapp: optionalString,
  email: optionalString,
  officeAddress: optionalString,
  facebook: optionalString,
  instagram: optionalString,
  linkedin: optionalString,
  heroHeadline: optionalString,
  heroSubheadline: optionalString,

  // Agency-editable wording. Each is nullable: null restores the built-in
  // default rather than storing an empty label.
  specLabels: z.record(z.string(), z.string().trim().max(40)).nullish(),
  kindLabels: z.record(z.string(), z.string().trim().max(40)).nullish(),
  featureOptions: z.array(z.string().trim().min(1).max(80)).max(100).nullish(),
  propertyTypeOptions: z.array(z.string().trim().min(1).max(60)).max(100).nullish(),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

// Max lengths mirror the `enquiries` columns (name 160, email 255, phone 40)
// so an over-long value comes back as a field error rather than a Postgres
// "value too long" throw. `message` is a text column but still capped, to keep
// a bot from writing unbounded rows.
export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(160, "That name is too long"),
  email: z.string().email("Enter a valid email").max(255, "That email is too long"),
  phone: z
    .string()
    .trim()
    .max(40, "That number is too long")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  message: z
    .string()
    .trim()
    .min(5, "Please add a short message")
    .max(2000, "Please keep your message under 2000 characters"),
  // A listing id always comes from our own hidden field; anything that isn't a
  // uuid is dropped rather than passed to the database (where it would throw).
  listingId: z.uuid().nullish().catch(null),
});
export type EnquiryInput = z.infer<typeof enquirySchema>;
