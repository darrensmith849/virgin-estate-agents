"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { agencySettings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { getAgencySettings } from "@/lib/data/settings";
import { settingsSchema } from "@/lib/validations";

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
