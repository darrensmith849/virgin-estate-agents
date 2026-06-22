"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { enquiries, listings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { sendEnquiryEmails } from "@/lib/email";
import { enquirySchema } from "@/lib/validations";
import { SITE } from "@/lib/constants";

export type EnquiryFormState =
  | { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

export async function createEnquiry(
  _prev: EnquiryFormState,
  formData: FormData,
): Promise<EnquiryFormState> {
  const parsed = enquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    message: formData.get("message"),
    listingId: formData.get("listingId"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { name, email, phone, message, listingId } = parsed.data;

  await db.insert(enquiries).values({
    name,
    email,
    phone: phone ?? null,
    message,
    listingId: listingId || null,
  });

  // Look up the listing for richer email context (best-effort).
  let listing: { title: string; slug: string } | undefined;
  if (listingId) {
    listing = await db.query.listings.findFirst({
      where: eq(listings.id, listingId),
      columns: { title: true, slug: true },
    });
  }

  await sendEnquiryEmails({
    name,
    email,
    phone,
    message,
    listingTitle: listing?.title,
    listingUrl: listing ? `${SITE.url}/listings/${listing.slug}` : undefined,
  });

  return { ok: true };
}

/* ------------------------------- Admin ----------------------------------- */

const STATUSES = ["new", "contacted", "closed"] as const;
type EnquiryStatus = (typeof STATUSES)[number];

export async function updateEnquiryStatus(
  id: string,
  status: EnquiryStatus,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !STATUSES.includes(status)) return;

  await db.update(enquiries).set({ status }).where(eq(enquiries.id, id));
  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
}

export async function deleteEnquiry(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await db.delete(enquiries).where(eq(enquiries.id, id));
  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
}
