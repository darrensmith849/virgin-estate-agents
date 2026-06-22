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
  propertyType: z.enum([
    "house",
    "apartment",
    "townhouse",
    "cluster",
    "stand",
    "commercial",
    "farm",
  ]),
  price: z.coerce.number().int().min(0, "Price can't be negative").default(0),
  rentPeriod: optionalString,
  bedrooms: z.coerce.number().int().min(0).default(0),
  bathrooms: z.coerce.number().int().min(0).default(0),
  garages: z.coerce.number().int().min(0).default(0),
  landSizeSqm: optionalInt,
  floorSizeSqm: optionalInt,
  addressLine: optionalString,
  suburb: optionalString,
  city: z.string().trim().default("Harare"),
  latitude: optionalFloat,
  longitude: optionalFloat,
  features: z.array(z.string()).default([]),
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
});
export type SettingsInput = z.infer<typeof settingsSchema>;

export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: optionalString,
  message: z.string().trim().min(5, "Please add a short message"),
  listingId: z.string().optional().nullable(),
});
export type EnquiryInput = z.infer<typeof enquirySchema>;
