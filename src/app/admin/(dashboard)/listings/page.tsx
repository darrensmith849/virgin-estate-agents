import Link from "next/link";
import { Plus } from "lucide-react";

import { listAdminListings } from "@/lib/data/listings";
import { purgeExpiredListings } from "@/lib/actions/listings";
import { PageHeader } from "@/components/admin/page-header";
import { ListingBoard, type BoardListing } from "@/components/admin/listing-board";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Listings" };

export default async function AdminListingsPage() {
  // Clear out anything that has been in the recycle bin past its 30 days —
  // alongside the read, since binned listings aren't on the board anyway.
  const [, items] = await Promise.all([purgeExpiredListings(), listAdminListings()]);
  // Sold and rented listings move to their own tabs.
  const sold = items.filter((l) => l.status === "sold" && l.kind === "sale").length;
  const rented = items.filter((l) => l.status === "sold" && l.kind === "rent").length;
  const time = (d: Date | null) => (d ? new Date(d).getTime() : 0);
  const active = items.filter((l) => l.status !== "sold");
  // The homepage group, in the order the homepage shows it.
  const featured = active
    .filter((l) => l.isFeatured)
    .sort((a, b) => a.featuredOrder - b.featuredOrder || time(b.publishedAt) - time(a.publishedAt));
  // The rest, for sale then to rent (shown as separate groups): drafts being
  // worked on first, then by reference number — first listed to most recent.
  const rest = (kind: "sale" | "rent") => [
    ...active
      .filter((l) => !l.isFeatured && l.kind === kind && l.status === "draft")
      .sort((a, b) => time(b.updatedAt) - time(a.updatedAt)),
    ...active
      .filter((l) => !l.isFeatured && l.kind === kind && l.status !== "draft")
      .sort(
        (a, b) =>
          (a.refNumber ?? Number.MAX_SAFE_INTEGER) - (b.refNumber ?? Number.MAX_SAFE_INTEGER) ||
          time(a.publishedAt) - time(b.publishedAt),
      ),
  ];
  const onBoard = [...featured, ...rest("sale"), ...rest("rent")];

  // Flattened to just what the board renders, so the whole listing row (and
  // every agent field on it) isn't serialised into the client bundle.
  const board: BoardListing[] = onBoard.map((l) => {
    const cover = l.images.find((i) => i.isCover) ?? l.images[0] ?? null;
    return {
      id: l.id,
      slug: l.slug,
      refNumber: l.refNumber,
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
        <>
          <ListingBoard listings={board} />
          <p className="mt-6 text-sm text-muted">
            Sold properties move to the{" "}
            <Link href="/admin/sold" className="text-brand hover:underline">
              Sold tab
            </Link>
            {sold > 0 ? ` (${sold})` : ""} and rented ones to the{" "}
            <Link href="/admin/rented" className="text-brand hover:underline">
              Rented tab
            </Link>
            {rented > 0 ? ` (${rented})` : ""}. Both stay on the website, marked SOLD or RENTED.
          </p>
        </>
      )}
    </>
  );
}
