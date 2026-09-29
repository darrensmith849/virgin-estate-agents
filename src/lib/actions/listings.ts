"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNotNull, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { listingImages, listingVideos, listings } from "@/db/schema";
import { ensureVideoTable } from "@/db/bootstrap";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStorage } from "@/lib/storage";
import { posterKeyFor } from "@/lib/video";
import { listingSchema } from "@/lib/validations";
import { LISTING_BIN_DAYS } from "@/lib/constants";
import { uniqueSlug } from "@/lib/utils";

export type ListingFormState =
  | { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

function parseListingForm(formData: FormData) {
  return listingSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    status: formData.get("status"),
    kind: formData.get("kind"),
    propertyType: formData.get("propertyType"),
    category: formData.get("category") ?? "",
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
    // Custom spec rows arrive as parallel label/value fields, in DOM order.
    customSpecs: formData
      .getAll("customSpecLabel")
      .map((label, i) => ({
        label: String(label),
        value: String(formData.getAll("customSpecValue")[i] ?? ""),
      })),
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

  // Photos, when added, are attached to a draft created via createDraftListing,
  // so this plain-create path only runs for a listing with no photos yet.
  const data = parsed.data;
  const [created] = await db
    .insert(listings)
    .values({
      ...data,
      slug: uniqueSlug(data.title),
      publishedAt: data.status === "draft" ? null : new Date(),
    })
    .returning({ id: listings.id });
  await afterStatusChange(created.id);

  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath("/admin/sold");
  revalidatePath("/admin/rented");
  revalidatePath("/"); // home featured grid is static
  // A sold (or rented) listing lives on its own tab, not the listings board.
  redirect(closedTab(data) ?? "/admin/listings");
}

/**
 * Bookkeeping after any change of status, done in the database so every path
 * (form, board, publish toggle) behaves the same. Never blocks a save — a
 * failure is only logged.
 *  - The first time a listing goes live it gets its reference number: the
 *    next in order (VE-008 after VE-007), never reused. Drafts get none, so
 *    abandoned drafts leave no gaps.
 *  - Marking it Sold records when; going back on the market clears that.
 */
async function afterStatusChange(id: string): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE listings SET ref_number = nextval('listing_ref_seq')
      WHERE id = ${id} AND ref_number IS NULL AND status <> 'draft'
    `);
  } catch (err) {
    console.error("[ref] couldn't give the listing a reference number:", err);
  }
  try {
    await db.execute(sql`
      UPDATE listings
      SET sold_at = CASE WHEN status = 'sold' THEN coalesce(sold_at, now()) ELSE NULL END
      WHERE id = ${id}
    `);
  } catch (err) {
    console.error("[sold] couldn't record the sold date:", err);
  }
}

/** The tab a listing lives on once sold (Sold) or rented (Rented), if either. */
function closedTab(listing: { status: string; kind: string }): string | null {
  if (listing.status !== "sold") return null;
  return listing.kind === "rent" ? "/admin/rented" : "/admin/sold";
}

/** Slug base for a placeholder draft created before the form is filled in. */
const DRAFT_SLUG_BASE = "untitled-listing";

/**
 * Creates a blank draft and returns its id. Used by the New listing page so the
 * photo uploader can attach images the moment the user adds them — before the
 * details form is submitted. The real title/slug are set on the first save.
 */
export async function createDraftListing(): Promise<{ id?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authorised." };

  const [created] = await db
    .insert(listings)
    .values({
      title: "Untitled listing",
      slug: uniqueSlug(DRAFT_SLUG_BASE),
      status: "draft",
    })
    .returning({ id: listings.id });

  revalidatePath("/admin/listings");
  return { id: created.id };
}

/** Optional listing fields that an emptied form box should clear. */
const CLEARABLE_FIELDS = [
  "bedrooms",
  "bathrooms",
  "garages",
  "landSizeSqm",
  "floorSizeSqm",
  "rentPeriod",
  "addressLine",
  "suburb",
  "latitude",
  "longitude",
] as const;

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
    columns: { publishedAt: true, slug: true },
  });

  const data = parsed.data;
  const publishedAt =
    data.status === "draft"
      ? null
      : (existing?.publishedAt ?? new Date());

  // A placeholder draft (created before the form was filled) still carries an
  // "untitled-listing-…" slug — regenerate it from the real title on first save.
  const slug = existing?.slug?.startsWith(`${DRAFT_SLUG_BASE}-`)
    ? { slug: uniqueSlug(data.title) }
    : {};

  // A box emptied on the form parses as `undefined`, which Drizzle leaves out
  // of the UPDATE — so a spec, address or rent period could never be cleared.
  // Store null for those, but only for boxes actually on the submitted form:
  // anything the form didn't include is left exactly as it was.
  const cleared = Object.fromEntries(
    CLEARABLE_FIELDS.filter((k) => formData.has(k) && data[k] === undefined).map((k) => [k, null]),
  );

  await db
    .update(listings)
    .set({ ...data, ...cleared, ...slug, publishedAt, updatedAt: new Date() })
    .where(eq(listings.id, id));
  await afterStatusChange(id);

  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath("/admin/sold");
  revalidatePath("/admin/rented");
  revalidatePath(`/admin/listings/${id}/edit`);
  revalidatePath("/"); // home featured grid is static
  revalidatePath("/listings");
  // A sold (or rented) listing lives on its own tab, not the listings board —
  // sending it back to the board would look as though it had vanished.
  redirect(closedTab(data) ?? "/admin/listings");
}

/**
 * Publish (make live on the public site) or unpublish (back to draft) a listing
 * in one click from the listings table. Publishing sets it "For Sale"; the more
 * specific states (Under Offer / Sold) are set from the edit form.
 */
export async function setListingPublished(
  id: string,
  publish: boolean,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await db
    .update(listings)
    .set({
      status: publish ? "for_sale" : "draft",
      publishedAt: publish ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(listings.id, id));
  await afterStatusChange(id);

  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath("/admin/sold");
  revalidatePath("/admin/rented");
  revalidatePath("/"); // home featured grid is static
  revalidatePath("/listings");
}

/**
 * Replace the homepage featured set and its order in one go.
 *
 * Takes the ids in the order they should appear. Anything absent stops being
 * featured, which is what makes dragging a card out of the group work. Done as
 * a single transaction so a half-applied drag can't leave the grid in a state
 * nobody chose.
 */
export async function setFeaturedOrder(ids: string[]): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  // Guard against a malformed payload emptying the homepage by accident.
  const clean = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 24);

  await db.transaction(async (tx) => {
    await tx
      .update(listings)
      .set({ isFeatured: false, featuredOrder: 0 })
      // Listings in the recycle bin aren't on the board, so leave their
      // homepage spot alone for when they're restored.
      .where(and(eq(listings.isFeatured, true), isNull(listings.deletedAt)));

    for (const [index, id] of clean.entries()) {
      await tx
        .update(listings)
        .set({ isFeatured: true, featuredOrder: index + 1, updatedAt: new Date() })
        .where(eq(listings.id, id));
    }
  });

  revalidatePath("/admin/listings");
  revalidatePath("/"); // the featured grid lives on the homepage
}

/** Set a listing's status directly, for the dropdown on each admin card. */
export async function setListingStatus(id: string, status: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const allowed = ["draft", "for_sale", "under_offer", "sold"] as const;
  if (!allowed.includes(status as (typeof allowed)[number])) return;

  await db
    .update(listings)
    .set({
      status: status as (typeof allowed)[number],
      // Publishing for the first time should stamp a publish date; going back
      // to draft clears it so the listing isn't ordered as though it were live.
      publishedAt: status === "draft" ? null : sql`coalesce(${listings.publishedAt}, now())`,
      updatedAt: new Date(),
    })
    .where(eq(listings.id, id));
  await afterStatusChange(id);

  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath("/admin/sold");
  revalidatePath("/admin/rented");
  revalidatePath("/");
  revalidatePath("/listings");
  revalidatePath("/listings/[slug]", "page");
}

/**
 * Put a sold or rented listing back on the market — for when a sale or let
 * falls through. It returns to the listings board as For Sale (To Rent for a
 * rental), keeping its reference number.
 */
export async function relistListing(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await db
    .update(listings)
    .set({ status: "for_sale", updatedAt: new Date() })
    .where(and(eq(listings.id, id), eq(listings.status, "sold")));
  await afterStatusChange(id);
  revalidateListingPages();
}

/**
 * Move a listing to the recycle bin. Nothing is removed: the listing simply
 * stops appearing on the site and the admin board, and can be restored from
 * the bin for LISTING_BIN_DAYS days before it is deleted for good.
 */
export async function deleteListing(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  // Only the bin stamp changes. Everything else — homepage spot included — is
  // left as it was, so a restore puts the listing back exactly.
  await db.update(listings).set({ deletedAt: new Date() }).where(eq(listings.id, id));

  revalidateListingPages();
  redirect("/admin/listings");
}

/** Bring a listing back from the recycle bin, exactly as it was. */
export async function restoreListing(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await db.update(listings).set({ deletedAt: null }).where(eq(listings.id, id));

  revalidateListingPages();
  revalidatePath(`/admin/listings/${id}/edit`);
}

/** Permanently delete a listing from the recycle bin, photos and videos included. */
export async function deleteListingForever(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const row = await db.query.listings.findFirst({
    where: and(eq(listings.id, id), isNotNull(listings.deletedAt)),
    columns: { id: true },
  });
  // Only listings already in the bin can be deleted for good.
  if (!row) return;

  await hardDeleteListing(id);
  revalidatePath("/admin/recycle-bin");
}

/**
 * Permanently delete anything that has been in the bin longer than LISTING_BIN_DAYS.
 * Called when the admin opens Listings or the bin, so no scheduled job is
 * needed; a failure here must never stop those pages loading.
 */
export async function purgeExpiredListings(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  try {
    const expired = await db
      .select({ id: listings.id })
      .from(listings)
      .where(lt(listings.deletedAt, sql`now() - make_interval(days => ${LISTING_BIN_DAYS})`));
    for (const { id } of expired) await hardDeleteListing(id);
  } catch (err) {
    console.error("[bin] purge failed:", err);
  }
}

async function hardDeleteListing(id: string): Promise<void> {
  // Best-effort: remove stored image and video objects too (tolerant of the
  // videos table not existing yet).
  const imgs = await db.query.listingImages.findMany({
    where: eq(listingImages.listingId, id),
    columns: { key: true },
  });
  const videos = await listingVideoKeys(id);

  // Row first, files second: if the delete fails, the listing is still whole
  // rather than left pointing at photos that no longer exist.
  await db.delete(listings).where(eq(listings.id, id));
  const storage = await getStorage();
  await Promise.allSettled([...imgs, ...videos].map((media) => storage.delete(media.key)));
}

function revalidateListingPages() {
  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath("/admin/sold");
  revalidatePath("/admin/rented");
  revalidatePath("/admin/recycle-bin");
  revalidatePath("/"); // home featured grid is static
  revalidatePath("/listings");
  revalidatePath("/listings/[slug]", "page");
}

/* --------------------------------- Images -------------------------------- */

export async function addListingImages(
  listingId: string,
  images: { key: string; url: string; alt?: string | null }[],
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
  revalidatePath("/listings");
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
  revalidatePath("/");
  revalidatePath("/listings");
}

export async function setCoverImage(
  listingId: string,
  imageId: string,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  // Cover = first photo, so making an image the cover moves it to the front.
  const imgs = await db.query.listingImages.findMany({
    where: eq(listingImages.listingId, listingId),
    orderBy: (t, { asc }) => [asc(t.sortOrder)],
    columns: { id: true },
  });
  const order = [imageId, ...imgs.filter((i) => i.id !== imageId).map((i) => i.id)];
  await Promise.all(
    order.map((id, index) =>
      db
        .update(listingImages)
        .set({ sortOrder: index, isCover: index === 0 })
        .where(eq(listingImages.id, id)),
    ),
  );

  revalidatePath(`/admin/listings/${listingId}/edit`);
  revalidatePath("/");
  revalidatePath("/listings");
}

export async function reorderListingImages(
  listingId: string,
  orderedIds: string[],
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  // The first photo is always the cover, so reordering re-picks the cover too.
  await Promise.all(
    orderedIds.map((id, index) =>
      db
        .update(listingImages)
        .set({ sortOrder: index, isCover: index === 0 })
        .where(eq(listingImages.id, id)),
    ),
  );

  revalidatePath(`/admin/listings/${listingId}/edit`);
  revalidatePath("/");
  revalidatePath("/listings");
}

/* --------------------------------- Videos -------------------------------- */

/** A video's file plus its preview picture (either format), for deleting. */
function videoFileKeys(key: string): string[] {
  return [key, posterKeyFor(key, "webp"), posterKeyFor(key, "jpg")];
}

/** Storage keys of a listing's videos, tolerant of the table not existing. */
async function listingVideoKeys(listingId: string): Promise<{ key: string }[]> {
  try {
    await ensureVideoTable();
    const rows = await db.query.listingVideos.findMany({
      where: eq(listingVideos.listingId, listingId),
      columns: { key: true },
    });
    return rows.flatMap((row) => videoFileKeys(row.key).map((key) => ({ key })));
  } catch {
    return [];
  }
}

export async function addListingVideos(
  listingId: string,
  videos: { key: string; url: string; title?: string | null; posterUrl?: string | null }[],
) {
  const user = await getCurrentUser();
  if (!user || videos.length === 0) return [];

  // Create the videos table on first use (like photos, this "just works").
  await ensureVideoTable();

  const existingCount = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(listingVideos)
    .where(eq(listingVideos.listingId, listingId));
  let order = existingCount[0]?.c ?? 0;

  const inserted = await db
    .insert(listingVideos)
    .values(
      videos.map((video) => ({
        listingId,
        key: video.key,
        url: video.url,
        title: video.title,
        posterUrl: video.posterUrl ?? null,
        sortOrder: order++,
      })),
    )
    .returning();

  revalidatePath(`/admin/listings/${listingId}/edit`);
  revalidatePath("/");
  revalidatePath("/listings");
  return inserted;
}

export async function deleteListingVideo(videoId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const video = await db.query.listingVideos.findFirst({
    where: eq(listingVideos.id, videoId),
  });
  if (!video) return;

  const storage = await getStorage();
  await Promise.allSettled(videoFileKeys(video.key).map((key) => storage.delete(key)));
  await db.delete(listingVideos).where(eq(listingVideos.id, videoId));

  revalidatePath(`/admin/listings/${video.listingId}/edit`);
  revalidatePath("/");
  revalidatePath("/listings");
}
