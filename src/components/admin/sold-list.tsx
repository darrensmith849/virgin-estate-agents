"use client";

import Image from "next/image";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { ExternalLink, ImageOff, Loader2, Pencil, RotateCcw } from "lucide-react";

import { deleteListing, relistListing } from "@/lib/actions/listings";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { LISTING_BIN_DAYS } from "@/lib/constants";
import { mediaSrc } from "@/lib/media";

export type SoldRow = {
  id: string;
  slug: string;
  title: string;
  /** "VE-007 · Chirundu · $150,000" */
  meta: string;
  /** "Sold 29 Sep 2026", or null if the date isn't known. */
  soldOn: string | null;
  /** "rent" words the action as a rental going back on the market. */
  kind: "sale" | "rent";
  cover: { url: string; alt: string | null } | null;
};

/*
 * The Sold tab's rows. Each can be viewed on the site, edited, put back on the
 * market (for when a sale falls through) or moved to the recycle bin.
 */
export function SoldList({ rows }: { rows: SoldRow[] }) {
  const [items, setItems] = useOptimistic(rows, (_prev: SoldRow[], next: SoldRow[]) => next);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, start] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  function relist(row: SoldRow) {
    setPendingId(row.id);
    start(async () => {
      setItems(items.filter((r) => r.id !== row.id));
      await relistListing(row.id);
      setPendingId(null);
      setNotice(`“${row.title}” is back on the market ${row.kind === "rent" ? "(To Rent)" : "(For Sale)"}.`);
    });
  }

  return (
    <>
      {notice && (
        <p
          role="status"
          className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--radius)] bg-brand-50 px-4 py-3 text-sm text-brand"
        >
          {notice}
          <Link href="/admin/listings" className="font-medium underline underline-offset-2">
            See it on the Listings page
          </Link>
        </p>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-card p-12 text-center">
          <p className="text-ink">Nothing marked Sold right now.</p>
          <p className="mt-1 text-sm text-muted">
            When a listing&rsquo;s status is set to Sold it moves here from the Listings page, with
            its reference number.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          {items.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-card px-3 py-3 last:border-b-0 sm:flex-nowrap"
            >
              <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[var(--radius)] bg-paper-2">
                {row.cover ? (
                  <Image
                    src={mediaSrc(row.cover.url)}
                    alt={row.cover.alt ?? row.title}
                    fill
                    sizes="64px"
                    quality={50}
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-muted">
                    <ImageOff size={16} />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{row.title}</p>
                <p className="truncate text-sm text-muted">{row.meta}</p>
                {row.soldOn && <p className="text-xs text-sand">{row.soldOn}</p>}
              </div>

              <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                <button
                  type="button"
                  onClick={() => relist(row)}
                  disabled={pendingId !== null}
                  title="The sale fell through: put it back on the Listings page"
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line bg-card px-2.5 py-1.5 text-sm text-ink-soft transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-60"
                >
                  {pendingId === row.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <RotateCcw size={15} />
                  )}
                  Back on the market
                </button>
                <a
                  href={`/listings/${row.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  title="View on the live site"
                  aria-label={`View ${row.title} on the live site`}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius)] px-2.5 py-2 text-sm text-ink-soft hover:bg-paper-2"
                >
                  <ExternalLink size={15} />
                  <span className="hidden sm:inline">View</span>
                </a>
                <Link
                  href={`/admin/listings/${row.id}/edit`}
                  aria-label={`Edit ${row.title}`}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius)] px-2.5 py-2 text-sm text-ink-soft hover:bg-paper-2"
                >
                  <Pencil size={15} />
                  <span className="hidden sm:inline">Edit</span>
                </Link>
                <ConfirmDelete
                  action={deleteListing.bind(null, row.id)}
                  iconOnly
                  message={`Move "${row.title}" to the recycle bin? You can restore it within ${LISTING_BIN_DAYS} days.`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
