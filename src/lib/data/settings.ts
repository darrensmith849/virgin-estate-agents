import "server-only";
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
  updatedAt: new Date(0),
};

/** Returns the singleton settings row, creating it on first access. */
export async function getAgencySettings() {
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
}
