import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Eye } from "lucide-react";

import { getListingById } from "@/lib/data/listings";
import { listAllAgents } from "@/lib/data/agents";
import { deleteListing, updateListing } from "@/lib/actions/listings";
import { ListingForm } from "@/components/admin/listing-form";
import { ImageUploader } from "@/components/admin/image-uploader";
import { PageHeader } from "@/components/admin/page-header";
import { ConfirmDelete } from "@/components/admin/confirm-delete";

export const metadata = { title: "Edit listing" };

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;

  const [listing, agents] = await Promise.all([
    getListingById(id),
    listAllAgents(),
  ]);
  if (!listing) notFound();

  return (
    <>
      <Link
        href="/admin/listings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to listings
      </Link>

      <PageHeader title="Edit listing" description={listing.title}>
        {/* Drafts aren't on the public site, so send them to the admin preview
            instead of a URL that would 404. */}
        <a
          href={
            listing.status === "draft"
              ? `/admin/preview/${listing.id}`
              : `/listings/${listing.slug}`
          }
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line px-3 py-2 text-sm text-ink-soft hover:bg-paper-2"
        >
          {listing.status === "draft" ? (
            <>
              <Eye size={15} /> Preview
            </>
          ) : (
            <>
              <ExternalLink size={15} /> View
            </>
          )}
        </a>
        <ConfirmDelete
          action={deleteListing.bind(null, listing.id)}
          message={`Delete "${listing.title}"? This can't be undone.`}
          className="border border-line"
        />
      </PageHeader>

      {created && (
        <p className="mb-6 rounded-[var(--radius)] bg-brand-50 px-4 py-2.5 text-sm text-brand">
          Listing created. Add photos or videos and set the status to publish it.
        </p>
      )}

      <div className="space-y-6">
        <ImageUploader
          listingId={listing.id}
          initialImages={listing.images.map((i) => ({
            id: i.id,
            url: i.url,
            alt: i.alt,
            isCover: i.isCover,
          }))}
          initialVideos={listing.videos.map((video) => ({
            id: video.id,
            url: video.url,
            title: video.title,
          }))}
        />
        <ListingForm
          action={updateListing.bind(null, listing.id)}
          agents={agents}
          listing={listing}
          submitLabel="Save changes"
        />
      </div>
    </>
  );
}
