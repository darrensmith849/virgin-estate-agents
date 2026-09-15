"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { enquiries, listings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { enquirySchema } from "@/lib/validations";
import { withinRateLimit } from "@/lib/rate-limit";
import { sendEnquiryEmails } from "@/lib/email";
import { whatsappLink } from "@/lib/utils";
import { SITE } from "@/lib/constants";

export type EnquiryFormState =
  | {
      ok?: boolean;
      error?: string;
      fieldErrors?: Record<string, string[]>;
      /** Deep link that hands the enquiry straight to the agency on WhatsApp. */
      whatsappUrl?: string;
    }
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

  // The form is unauthenticated, so throttle per IP before touching the DB.
  if (!(await withinRateLimit("ENQUIRY_LIMITER"))) {
    return {
      error: `Too many enquiries from this connection. Please wait a moment, or WhatsApp us on ${SITE.whatsapp}.`,
    };
  }

  const { name, email, phone, message, listingId } = parsed.data;

  // Look up the listing first so a bad id can't fail the insert on the FK.
  let listing: { title: string; slug: string } | undefined;
  if (listingId) {
    listing = await db.query.listings.findFirst({
      where: eq(listings.id, listingId),
      columns: { title: true, slug: true },
    });
  }

  try {
    await db.insert(enquiries).values({
      name,
      email,
      phone: phone ?? null,
      message,
      listingId: listing ? listingId : null,
    });
  } catch (err) {
    console.error("[enquiry] Failed to save:", err);
    return {
      error: `Sorry, something went wrong saving your enquiry. Please WhatsApp us on ${SITE.whatsapp} or call ${SITE.phone}.`,
    };
  }

  // Surface the new enquiry (and its unread badge) in the admin area promptly.
  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");

  // Notify by email as well, when Cloudflare email is configured. This never
  // throws and no-ops when unset, so the WhatsApp handoff below stays the
  // dependable path and an email outage can't fail the enquiry.
  await sendEnquiryEmails({
    name,
    email,
    phone,
    message,
    listingTitle: listing?.title ?? null,
    listingUrl: listing ? `${SITE.url}/listings/${listing.slug}` : null,
  });

  // The enquiry is safely recorded in the admin inbox; the WhatsApp link is the
  // fast lane — one tap opens a chat to the agency with the details filled in,
  // so nothing depends on an email service being configured.
  const summary = [
    `Hi ${SITE.shortName}, I've just sent an enquiry through your website.`,
    listing
      ? `Property: ${listing.title} (${SITE.url}/listings/${listing.slug})`
      : null,
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    "", // blank line before the message body
    message,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return { ok: true, whatsappUrl: whatsappLink(SITE.whatsapp, summary) ?? undefined };
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
