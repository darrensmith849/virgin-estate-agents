"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { agencySettings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { getAgencySettings } from "@/lib/data/settings";
import { settingsSchema } from "@/lib/validations";
import { DEFAULT_KIND_LABELS, DEFAULT_SPEC_LABELS } from "@/lib/constants";

/** Collect `prefix_<key>` inputs into an object, keeping only real overrides.
 *  A blank box means "use the default", so it is omitted rather than stored. */
function collectLabels(
  formData: FormData,
  prefix: string,
  keys: readonly string[],
): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = String(formData.get(`${prefix}_${key}`) ?? "").trim();
    if (value) out[key] = value;
  }
  return Object.keys(out).length ? out : null;
}

/** One-per-line textarea into a clean list; empty means "use the defaults". */
function collectList(formData: FormData, field: string): string[] | null {
  const lines = String(formData.get(field) ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length ? lines : null;
}

export type SettingsFormState =
  | { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

export async function updateSettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authorised." };

  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    tagline: formData.get("tagline"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    email: formData.get("email"),
    officeAddress: formData.get("officeAddress"),
    facebook: formData.get("facebook"),
    instagram: formData.get("instagram"),
    linkedin: formData.get("linkedin"),
    heroHeadline: formData.get("heroHeadline"),
    heroSubheadline: formData.get("heroSubheadline"),
    specLabels: collectLabels(formData, "specLabel", Object.keys(DEFAULT_SPEC_LABELS)),
    kindLabels: collectLabels(formData, "kindLabel", Object.keys(DEFAULT_KIND_LABELS)),
    featureOptions: collectList(formData, "featureOptions"),
    propertyTypeOptions: collectList(formData, "propertyTypeOptions"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  await getAgencySettings(); // ensure the row exists
  await db
    .update(agencySettings)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(agencySettings.id, 1));

  revalidatePath("/", "layout");
  return { ok: true };
}
