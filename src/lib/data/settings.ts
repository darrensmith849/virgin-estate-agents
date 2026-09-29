import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { agencySettings } from "@/db/schema";
import { SITE } from "@/lib/constants";
import { safeRead } from "./_safe";

/** Fallback used when the database isn't connected yet, so the public site
 *  (footer, contact page) still renders sensible agency details. */
const FALLBACK_SETTINGS: typeof agencySettings.$inferSelect = {
  id: 1,
  name: SITE.name,
  tagline: null,
  phone: SITE.phone,
  whatsapp: SITE.whatsapp,
  email: SITE.email,
  officeAddress: SITE.address,
  facebook: null,
  instagram: null,
  linkedin: null,
  heroHeadline: null,
  heroSubheadline: null,
  heroImageUrl: null,
  specLabels: null,
  kindLabels: null,
  featureOptions: null,
  propertyTypeOptions: null,
  specOptions: null,
  hiddenSpecs: null,
  updatedAt: new Date(0),
};

/**
 * Returns the singleton settings row, creating it on first access. Cached for
 * the length of one request, so every part of a page (headings, tabs, the
 * status stamp on each card) can use the agency's wording without a query each.
 */
export const getAgencySettings = cache(async function getAgencySettings() {
  return safeRead(async () => {
    const existing = await db.query.agencySettings.findFirst({
      where: eq(agencySettings.id, 1),
    });
    if (existing) return existing;

    const [created] = await db
      .insert(agencySettings)
      .values({ id: 1 })
      .onConflictDoNothing()
      .returning();

    return (
      created ??
      (await db.query.agencySettings.findFirst({
        where: eq(agencySettings.id, 1),
      }))!
    );
  }, FALLBACK_SETTINGS);
});

/**
 * The agency's contact details as shown across the site — footer, contact
 * page, WhatsApp button, header, enquiries and the assistant: whatever is
 * saved in Settings → Agency details / Social links, falling back to the
 * built-in details for anything left blank.
 */
export const getContactDetails = cache(async function getContactDetails() {
  const s = await getAgencySettings();
  const pick = (value: string | null | undefined, fallback: string) => value?.trim() || fallback;
  return {
    phone: pick(s.phone, SITE.phone),
    whatsapp: pick(s.whatsapp, SITE.whatsapp),
    email: pick(s.email, SITE.email),
    address: pick(s.officeAddress, SITE.address),
    social: {
      facebook: pick(s.facebook, SITE.social.facebook),
      instagram: pick(s.instagram, SITE.social.instagram),
      linkedin: pick(s.linkedin, SITE.social.linkedin),
    },
  };
});

export type ContactDetails = Awaited<ReturnType<typeof getContactDetails>>;
