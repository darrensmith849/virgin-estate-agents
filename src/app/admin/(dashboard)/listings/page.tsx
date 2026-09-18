import Link from "next/link";
import { Plus } from "lucide-react";

import { listAdminListings } from "@/lib/data/listings";
import { PageHeader } from "@/components/admin/page-header";
import { ListingBoard, type BoardListing } from "@/components/admin/listing-board";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Listings" };

export default async function AdminListingsPage() {
  const items = await listAdminListings();

  // Flattened to just what the board renders, so the whole listing row (and
  // every agent field on it) isn't serialised into the client bundle.
  const board: BoardListing[] = items.map((l) => {
    const cover = l.images.find((i) => i.isCover) ?? l.images[0] ?? null;
    return {
      id: l.id,
      slug: l.slug,
      title: l.title,
      suburb: l.suburb,
      kind: l.kind,
      rentPeriod: l.rentPeriod,
      price: l.price,
      status: l.status,
      isFeatured: l.isFeatured,
      cover: cover ? { url: cover.url, alt: cover.alt } : null,
      agentName: l.agent?.name ?? null,
    };
  });

  return (
    <>
      <PageHeader title="Listings" description={`${items.length} total`}>
        <Link
          href="/admin/listings/new"
          className={buttonVariants({ variant: "primary", size: "sm" })}
        >
          <Plus size={16} />
          New listing
        </Link>
      </PageHeader>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-card p-12 text-center">
          <p className="text-muted">No listings yet.</p>
          <Link
            href="/admin/listings/new"
            className={buttonVariants({ variant: "primary", size: "sm", className: "mt-4" })}
          >
            <Plus size={16} />
            Create your first listing
          </Link>
        </div>
      ) : (
        <ListingBoard listings={board} />
      )}
    </>
  );
}
