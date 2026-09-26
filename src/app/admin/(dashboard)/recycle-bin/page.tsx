import Image from "next/image";
import Link from "next/link";
import { ImageOff, RotateCcw } from "lucide-react";

import { listBinnedListings } from "@/lib/data/listings";
import {
  deleteListingForever,
  purgeExpiredListings,
  restoreListing,
} from "@/lib/actions/listings";
import { LISTING_BIN_DAYS } from "@/lib/constants";
import { mediaSrc } from "@/lib/media";
import { PageHeader } from "@/components/admin/page-header";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Recycle bin" };

const DAY_MS = 24 * 60 * 60 * 1000;

function daysLeft(deletedAt: Date): number {
  const expires = deletedAt.getTime() + LISTING_BIN_DAYS * DAY_MS;
  return Math.max(0, Math.ceil((expires - Date.now()) / DAY_MS));
}

export default async function RecycleBinPage() {
  // Anything past its 30 days goes first, so the list only shows what can
  // still be restored.
  await purgeExpiredListings();
  const items = await listBinnedListings();

  return (
    <>
      <PageHeader
        title="Recycle bin"
        description={`Deleted listings stay here for ${LISTING_BIN_DAYS} days and can be restored, photos and videos included. After that they are removed for good.`}
      />

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-card p-12 text-center">
          <p className="text-muted">The recycle bin is empty.</p>
          <Link
            href="/admin/listings"
            className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4" })}
          >
            Back to listings
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-card">
          {items.map((listing) => {
            const cover = listing.images[0];
            const left = listing.deletedAt ? daysLeft(listing.deletedAt) : LISTING_BIN_DAYS;
            return (
              <div
                key={listing.id}
                className="flex flex-wrap items-center gap-3 border-b border-line px-3 py-3 last:border-b-0 sm:flex-nowrap"
              >
                <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[var(--radius)] bg-paper-2">
                  {cover ? (
                    <Image
                      src={mediaSrc(cover.url)}
                      alt={cover.alt ?? listing.title}
                      fill
                      sizes="64px"
                      quality={50}
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted">
                      <ImageOff size={16} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{listing.title}</p>
                  <p className="truncate text-xs text-muted">
                    {listing.suburb ? `${listing.suburb} · ` : ""}
                    Deleted{" "}
                    {listing.deletedAt?.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    ·{" "}
                    <span className={left <= 3 ? "text-red-600" : undefined}>
                      {left === 1 ? "1 day left" : `${left} days left`}
                    </span>
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <form action={restoreListing.bind(null, listing.id)}>
                    <button
                      type="submit"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <RotateCcw size={15} />
                      Restore
                    </button>
                  </form>
                  <ConfirmDelete
                    action={deleteListingForever.bind(null, listing.id)}
                    label="Delete forever"
                    message={`Permanently delete "${listing.title}" and all its photos and videos? This can't be undone.`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
