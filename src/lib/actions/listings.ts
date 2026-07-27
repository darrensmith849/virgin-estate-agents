"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { listingImages, listings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStorage } from "@/lib/storage";
import { listingSchema } from "@/lib/validations";
import { uniqueSlug } from "@/lib/utils";

export type ListingFormState =
  | {
      ok?: boolean;
      error?: string;
      fieldErrors?: Record<string, string[]>;
      /** Set by createListing so the form can reveal the photo uploader inline. */
      id?: string;
    }
  | undefined;

function parseListingForm(formData: FormData) {
  return listingSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    status: formData.get("status"),
    kind: formData.get("kind"),
    propertyType: formData.get("propertyType"),
    price: formData.get("price"),
    rentPeriod: formData.get("rentPeriod"),
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    garages: formData.get("garages"),
    landSizeSqm: formData.get("landSizeSqm"),
    floorSizeSqm: formData.get("floorSizeSqm"),
    addressLine: formData.get("addressLine"),
    suburb: formData.get("suburb"),
    city: formData.get("city") || "Harare",
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    features: formData.getAll("features").map(String),
    agentId: formData.get("agentId") ?? "",
    isFeatured: formData.get("isFeatured") != null,
  });
}

export async function createListing(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authorised." };

  const parsed = parseListingForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const data = parsed.data;
  const [created] = await db
    .insert(listings)
    .values({
      ...data,
      slug: uniqueSlug(data.title),
      publishedAt: data.status === "draft" ? null : new Date(),
    })
    .returning({ id: listings.id });

  revalidatePath("/admin/listings");
  revalidatePath("/"); // home featured grid is static

  // Return the id (instead of redirecting to a separate edit page) so photos
  // can be added inline on the same New listing page.
  return { ok: true, id: created.id };
}

export async function updateListing(
  id: string,
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authorised." };

  const parsed = parseListingForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const existing = await db.query.listings.findFirst({
    where: eq(listings.id, id),
    columns: { publishedAt: true },
  });

  const data = parsed.data;
  const publishedAt =
    data.status === "draft"
      ? null
      : (existing?.publishedAt ?? new Date());

  await db
    .update(listings)
    .set({ ...data, publishedAt, updatedAt: new Date() })
    .where(eq(listings.id, id));

  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${id}/edit`);
  revalidatePath("/"); // home featured grid is static
  return { ok: true };
}

export async function deleteListing(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  // Best-effort: remove stored image objects too.
  const imgs = await db.query.listingImages.findMany({
    where: eq(listingImages.listingId, id),
    columns: { key: true },
  });
  const storage = await getStorage();
  await Promise.allSettled(imgs.map((i) => storage.delete(i.key)));

  await db.delete(listings).where(eq(listings.id, id));
  revalidatePath("/admin/listings");
  revalidatePath("/"); // home featured grid is static
  redirect("/admin/listings");
}

/* --------------------------------- Images -------------------------------- */

export async function addListingImages(
  listingId: string,
  images: { key: string; url: string; alt?: string }[],
) {
  const user = await getCurrentUser();
  if (!user || images.length === 0) return [];

  const existingCount = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId));
  let order = existingCount[0]?.c ?? 0;
  const noCoverYet = order === 0;

  const inserted = await db
    .insert(listingImages)
    .values(
      images.map((img, i) => ({
        listingId,
        key: img.key,
        url: img.url,
        alt: img.alt,
        sortOrder: order++,
        isCover: noCoverYet && i === 0,
      })),
    )
    .returning();

  revalidatePath(`/admin/listings/${listingId}/edit`);
  revalidatePath("/");
  return inserted;
}

export async function deleteListingImage(imageId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const img = await db.query.listingImages.findFirst({
    where: eq(listingImages.id, imageId),
  });
  if (!img) return;

  const storage = await getStorage();
  await storage.delete(img.key).catch(() => {});
  await db.delete(listingImages).where(eq(listingImages.id, imageId));

  // If we removed the cover, promote the first remaining image.
  if (img.isCover) {
    const next = await db.query.listingImages.findFirst({
      where: eq(listingImages.listingId, img.listingId),
      orderBy: (t, { asc }) => [asc(t.sortOrder)],
    });
    if (next) {
      await db
        .update(listingImages)
        .set({ isCover: true })
        .where(eq(listingImages.id, next.id));
    }
  }

  revalidatePath(`/admin/listings/${img.listingId}/edit`);
}

export async function setCoverImage(
  listingId: string,
  imageId: string,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await db
    .update(listingImages)
    .set({ isCover: false })
    .where(and(eq(listingImages.listingId, listingId), ne(listingImages.id, imageId)));
  await db
    .update(listingImages)
    .set({ isCover: true })
    .where(eq(listingImages.id, imageId));

  revalidatePath(`/admin/listings/${listingId}/edit`);
  revalidatePath("/");
}

export async function reorderListingImages(
  listingId: string,
  orderedIds: string[],
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await Promise.all(
    orderedIds.map((id, index) =>
      db
        .update(listingImages)
        .set({ sortOrder: index })
        .where(eq(listingImages.id, id)),
    ),
  );

  revalidatePath(`/admin/listings/${listingId}/edit`);
}
