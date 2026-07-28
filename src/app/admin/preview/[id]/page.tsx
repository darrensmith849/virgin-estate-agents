import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireUser } from "@/lib/auth/dal";
import { getListingById, getSimilarListings } from "@/lib/data/listings";
import { ListingDetail } from "@/components/listings/listing-detail";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata = { title: "Preview listing", robots: { index: false, follow: false } };

/**
 * Admin-only preview of an unpublished listing. The public `/listings/[slug]`
 * route serves published listings only, so this is how the agency checks a
 * draft before it goes live. Published listings redirect to the real page.
 */
export default async function PreviewListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();

  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();
  if (listing.status !== "draft") redirect(`/listings/${listing.slug}`);

  const similar = await getSimilarListings(listing.id, {
    suburb: listing.suburb,
    propertyType: listing.propertyType,
    limit: 3,
  });

  return (
    <>
      <div className="sticky top-0 z-[60] flex items-center justify-between gap-3 bg-ink px-5 py-2.5 text-sm text-white">
        <span>
          Draft preview — not visible to visitors
        </span>
        <Link
          href={`/admin/listings/${listing.id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-white/25 px-3 py-1.5 hover:bg-white/10"
        >
          <ArrowLeft size={14} /> Back to editing
        </Link>
      </div>
      <SiteHeader />
      <main className="ve-content-shell flex-1">
        <ListingDetail listing={listing} similar={similar} preview />
        <SiteFooter />
      </main>
    </>
  );
}
