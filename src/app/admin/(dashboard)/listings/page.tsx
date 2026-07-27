import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, ImageOff } from "lucide-react";

import { listAdminListings } from "@/lib/data/listings";
import { deleteListing } from "@/lib/actions/listings";
import { PageHeader } from "@/components/admin/page-header";
import { ListingStatusControl } from "@/components/admin/listing-status-control";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Listings" };

export default async function AdminListingsPage() {
  const items = await listAdminListings();

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
        <div className="overflow-hidden rounded-xl border border-line bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Price</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Agent</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((l) => {
                const cover = l.images.find((i) => i.isCover) ?? l.images[0];
                return (
                  <tr key={l.id} className="hover:bg-paper-2/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-paper-2">
                          {cover ? (
                            <Image
                              src={cover.url}
                              alt={l.title}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-muted">
                              <ImageOff size={16} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{l.title}</p>
                          <p className="truncate text-xs text-muted">
                            {l.suburb ?? "—"} · {l.kind === "rent" ? "To rent" : "For sale"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {formatPrice(l.price, { kind: l.kind, period: l.rentPeriod })}
                    </td>
                    <td className="hidden px-4 py-3 text-muted md:table-cell">
                      {l.agent?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ListingStatusControl id={l.id} status={l.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/listings/${l.id}/edit`}
                          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] px-3 py-2 text-sm text-ink-soft hover:bg-paper-2"
                        >
                          <Pencil size={15} />
                          Edit
                        </Link>
                        <ConfirmDelete
                          action={deleteListing.bind(null, l.id)}
                          iconOnly
                          message={`Delete "${l.title}"? This can't be undone.`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
