import "server-only";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { agencySettings } from "@/db/schema";

/** Returns the singleton settings row, creating it on first access. */
export async function getAgencySettings() {
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
}
