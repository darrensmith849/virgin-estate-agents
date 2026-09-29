"use client";

import Image from "next/image";
import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import {
  ExternalLink,
  Eye,
  GripVertical,
  ImageOff,
  Loader2,
  Pencil,
  Star,
} from "lucide-react";

import { setFeaturedOrder, setListingStatus, deleteListing } from "@/lib/actions/listings";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import {
  LISTING_BIN_DAYS,
  formatRef,
  fromStatusChoice,
  statusChoice,
  statusChoices,
} from "@/lib/constants";
import { mediaSrc } from "@/lib/media";
import { cn, formatPrice } from "@/lib/utils";

/*
 * The listings board.
 *
 * Two groups: the homepage featured grid, in the order it actually renders, and
 * everything else. Dragging a card between them features or unfeatures it;
 * dragging within the top group sets the order. Both are the same single
 * action, because "which listings" and "in what order" are one decision.
 *
 * Uses the browser's own drag events rather than a drag library — a vertical
 * list of a few dozen rows doesn't justify the dependency, and this keeps
 * keyboard users served by the move buttons instead.
 */

export type BoardListing = {
  id: string;
  slug: string;
  /** Sequential reference (VE-007); null for drafts. */
  refNumber: number | null;
  title: string;
  suburb: string | null;
  kind: "sale" | "rent";
  rentPeriod: string | null;
  price: number;
  status: string;
  isFeatured: boolean;
  cover: { url: string; alt: string | null } | null;
  agentName: string | null;
};

const KIND_LABEL: Record<string, string> = { sale: "For sale", rent: "To rent" };

type Handlers = {
  /* Accessors rather than the ref itself: reaching through props to mutate
     `ref.current` is what React's rules forbid, and passing functions keeps
     ownership of the ref with the board. */
  setDragId: (id: string | null) => void;
  getDragId: () => string | null;
  move: (id: string, zone: "featured" | "rest", beforeId?: string) => void;
  nudge: (id: string, direction: -1 | 1) => void;
  start: (fn: () => void) => void;
  /** Mark a listing Sold or Rented: it leaves the board for that tab. */
  markSold: (listing: BoardListing, kind: "sale" | "rent") => void;
  setOverZone: (fn: (z: string | null) => string | null) => void;
};

function Card({
  listing,
  h,
}: {
  listing: BoardListing;
  h: Handlers;
}) {
  const isDraft = listing.status === "draft";
  return (
    <div
      draggable
      onDragStart={(e) => {
        h.setDragId(listing.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => {
        h.setDragId(null);
        h.setOverZone(() => null);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = h.getDragId();
        if (!id || id === listing.id) return;
        h.move(id, listing.isFeatured ? "featured" : "rest", listing.id);
      }}
      // On phones the controls drop to a second line so the title stays readable.
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-card px-3 py-3 last:border-b-0 sm:flex-nowrap"
    >
      <span
        className="cursor-grab text-muted active:cursor-grabbing"
        aria-hidden="true"
        title="Drag to move"
      >
        <GripVertical size={16} />
      </span>

      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[var(--radius)] bg-paper-2">
        {listing.cover ? (
          <Image
            src={mediaSrc(listing.cover.url)}
            alt={listing.cover.alt ?? listing.title}
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
        <p className="truncate font-medium text-ink">{listing.title}</p>
        <p className="truncate text-sm text-muted">
          {[
            formatRef(listing.refNumber),
            listing.suburb,
            KIND_LABEL[listing.kind] ?? listing.kind,
            formatPrice(listing.price, { kind: listing.kind, period: listing.rentPeriod }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="flex w-full items-center justify-end gap-1 sm:w-auto sm:gap-3">
      {/* Keyboard alternative to dragging. */}
      <span className="hidden items-center gap-0.5 sm:flex">
        <button
          type="button"
          onClick={() => h.nudge(listing.id, -1)}
          className="rounded px-1.5 py-1 text-xs text-muted hover:bg-paper-2 hover:text-ink"
          aria-label={`Move ${listing.title} up`}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => h.nudge(listing.id, 1)}
          className="rounded px-1.5 py-1 text-xs text-muted hover:bg-paper-2 hover:text-ink"
          aria-label={`Move ${listing.title} down`}
        >
          ↓
        </button>
      </span>

      <select
        value={statusChoice(listing.status, listing.kind)}
        onChange={(e) => {
          const choice = fromStatusChoice(e.target.value);
          if (choice.status === "sold") h.markSold(listing, choice.kind ?? listing.kind);
          else h.start(() => void setListingStatus(listing.id, choice.status));
        }}
        aria-label={`Status of ${listing.title}`}
        className="rounded-full border border-line bg-paper-2 px-2.5 py-1 text-xs text-ink"
      >
        {statusChoices(listing.kind).map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <a
        href={isDraft ? `/admin/preview/${listing.id}` : `/listings/${listing.slug}`}
        target="_blank"
        rel="noreferrer"
        title={isDraft ? "Preview this draft" : "View on the live site"}
        className="inline-flex items-center gap-1.5 rounded-[var(--radius)] px-2.5 py-2 text-sm text-ink-soft hover:bg-paper-2"
      >
        {isDraft ? <Eye size={15} /> : <ExternalLink size={15} />}
        <span className="hidden lg:inline">{isDraft ? "Preview" : "View"}</span>
      </a>

      <Link
        href={`/admin/listings/${listing.id}/edit`}
        className="inline-flex items-center gap-1.5 rounded-[var(--radius)] px-2.5 py-2 text-sm text-ink-soft hover:bg-paper-2"
      >
        <Pencil size={15} />
        <span className="hidden lg:inline">Edit</span>
      </Link>

      <ConfirmDelete
        action={deleteListing.bind(null, listing.id)}
        iconOnly
        message={`Move "${listing.title}" to the recycle bin? You can restore it within ${LISTING_BIN_DAYS} days.`}
      />
      </div>
    </div>
  );
}


function Zone({
  name,
  highlight = name,
  rows,
  empty,
  overZone,
  h,
}: {
  name: "featured" | "rest";
  /** Which box lights up while dragging over it (the sale and rent groups
   *  are both "rest" but light up separately). */
  highlight?: string;
  rows: BoardListing[];
  empty: string;
  overZone: string | null;
  h: Handlers;
}) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        h.setOverZone(() => highlight);
      }}
      onDragLeave={() => h.setOverZone((z) => (z === highlight ? null : z))}
      onDrop={(e) => {
        e.preventDefault();
        const id = h.getDragId();
        h.setOverZone(() => null);
        // Dropped on the zone rather than a card: send it to the end.
        if (id) h.move(id, name);
      }}
      className={cn(
        "overflow-hidden rounded-xl border transition-colors",
        overZone === highlight ? "border-brand bg-brand-50/40" : "border-line",
        rows.length === 0 && "border-dashed",
      )}
    >
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">{empty}</p>
      ) : (
        rows.map((l) => <Card key={l.id} listing={l} h={h} />)
      )}
    </div>
  );
}



export function ListingBoard({ listings }: { listings: BoardListing[] }) {
  const [pending, start] = useTransition();
  // Optimistic so a drag settles instantly; the action reconciles behind it.
  const [items, setItems] = useOptimistic(
    listings,
    (_prev: BoardListing[], next: BoardListing[]) => next,
  );
  const dragId = useRef<string | null>(null);
  const [overZone, setOverZone] = useState<string | null>(null);
  /** Says where a listing marked Sold / Rented went, rather than it vanishing. */
  const [soldNotice, setSoldNotice] = useState<{ title: string; rent: boolean } | null>(null);

  function markSold(listing: BoardListing, kind: "sale" | "rent") {
    // Rented on a for-sale listing (or Sold on a rental) changes its type:
    // check first, since its price then reads as rent (or a sale price).
    if (
      kind !== listing.kind &&
      !window.confirm(
        kind === "rent"
          ? `"${listing.title}" is listed For Sale. Mark it Rented? It becomes a rental — check its price is the monthly rent.`
          : `"${listing.title}" is listed To Rent. Mark it Sold? It becomes a sale — check its price is the sale price.`,
      )
    ) {
      return;
    }
    setSoldNotice({ title: listing.title, rent: kind === "rent" });
    start(() => {
      setItems(items.filter((l) => l.id !== listing.id));
      void setListingStatus(listing.id, "sold", kind);
    });
  }

  const featured = items.filter((l) => l.isFeatured);
  const rest = items.filter((l) => !l.isFeatured);
  const forSale = rest.filter((l) => l.kind === "sale");
  const toRent = rest.filter((l) => l.kind === "rent");

  /** Apply a new arrangement locally, then persist the featured set. */
  function commit(next: BoardListing[]) {
    const ids = next.filter((l) => l.isFeatured).map((l) => l.id);
    start(() => {
      setItems(next);
      void setFeaturedOrder(ids);
    });
  }

  /** Move `id` into a zone, positioned before `beforeId` (or at the end). */
  function move(id: string, zone: "featured" | "rest", beforeId?: string) {
    const moving = items.find((l) => l.id === id);
    if (!moving) return;

    const others = items.filter((l) => l.id !== id);
    const updated = { ...moving, isFeatured: zone === "featured" };

    const featuredList = others.filter((l) => l.isFeatured);
    const restList = others.filter((l) => !l.isFeatured);
    const target = zone === "featured" ? featuredList : restList;

    const at = beforeId ? target.findIndex((l) => l.id === beforeId) : -1;
    if (at === -1) target.push(updated);
    else target.splice(at, 0, updated);

    commit(zone === "featured" ? [...target, ...restList] : [...featuredList, ...target]);
  }

  /** Keyboard equivalent of a drag, so this isn't mouse-only. */
  function nudge(id: string, direction: -1 | 1) {
    const list = items.find((l) => l.id === id)?.isFeatured ? featured : rest;
    const index = list.findIndex((l) => l.id === id);
    const to = index + direction;
    if (index === -1 || to < 0 || to >= list.length) return;
    move(id, list === featured ? "featured" : "rest", list[to + (direction === 1 ? 1 : 0)]?.id);
  }

  const handlers: Handlers = {
    setDragId: (id) => {
      dragId.current = id;
    },
    getDragId: () => dragId.current,
    move,
    nudge,
    start,
    markSold,
    setOverZone,
  };

  return (
    <div className="space-y-8">
      {soldNotice && (
        <p
          role="status"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--radius)] bg-brand-50 px-4 py-3 text-sm text-brand"
        >
          “{soldNotice.title}” is marked {soldNotice.rent ? "Rented" : "Sold"} and has moved to
          the {soldNotice.rent ? "Rented" : "Sold"} tab.
          <Link
            href={soldNotice.rent ? "/admin/rented" : "/admin/sold"}
            className="font-medium underline underline-offset-2"
          >
            Open {soldNotice.rent ? "Rented" : "Sold"}
          </Link>
        </p>
      )}
      <section>
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="flex items-center gap-2 text-lg">
            <Star size={17} className="text-sand" />
            On the homepage
          </h2>
          <p className="text-sm text-muted">
            Shown in the featured grid, in this order. Drag to rearrange.
          </p>
          {pending && <Loader2 size={14} className="animate-spin text-muted" />}
        </div>
        <Zone
          name="featured"
          overZone={overZone}
          h={handlers}
          rows={featured}
          empty="Nothing featured yet — drag a listing up here to put it on the homepage."
        />
      </section>

      {/* Sales and rentals kept apart. Both are "not on the homepage": dropping
          a listing in either takes it off the homepage, into its own group. */}
      {(
        [
          { kind: "sale", title: "For sale", rows: forSale, empty: "No listings for sale that aren't on the homepage." },
          { kind: "rent", title: "To rent", rows: toRent, empty: "No rentals yet — set a listing's type to To Rent and it appears here." },
        ] as const
      ).map((group) => (
        <section key={group.kind}>
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg">
              {group.title}{" "}
              <span className="text-sm font-normal text-muted">({group.rows.length})</span>
            </h2>
            <p className="text-sm text-muted">
              Drag one up into the homepage group to feature it.
            </p>
          </div>
          <Zone
            name="rest"
            highlight={`rest-${group.kind}`}
            rows={group.rows}
            overZone={overZone}
            h={handlers}
            empty={group.empty}
          />
        </section>
      ))}
    </div>
  );
}
