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
import { LISTING_STATUSES } from "@/lib/constants";
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
  setOverZone: (fn: (z: "featured" | "rest" | null) => "featured" | "rest" | null) => void;
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
      className="flex items-center gap-3 border-b border-line bg-card px-3 py-3 last:border-b-0"
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
            listing.suburb,
            KIND_LABEL[listing.kind] ?? listing.kind,
            formatPrice(listing.price, { kind: listing.kind, period: listing.rentPeriod }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

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
        value={listing.status}
        onChange={(e) => h.start(() => void setListingStatus(listing.id, e.target.value))}
        aria-label={`Status of ${listing.title}`}
        className="rounded-full border border-line bg-paper-2 px-2.5 py-1 text-xs text-ink"
      >
        {LISTING_STATUSES.map((s) => (
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
        message={`Delete "${listing.title}"? This can't be undone.`}
      />
    </div>
  );
}


function Zone({
  name,
  rows,
  empty,
  overZone,
  h,
}: {
  name: "featured" | "rest";
  rows: BoardListing[];
  empty: string;
  overZone: "featured" | "rest" | null;
  h: Handlers;
}) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        h.setOverZone(() => name);
      }}
      onDragLeave={() => h.setOverZone((z) => (z === name ? null : z))}
      onDrop={(e) => {
        e.preventDefault();
        const id = h.getDragId();
        h.setOverZone(() => null);
        // Dropped on the zone rather than a card: send it to the end.
        if (id) h.move(id, name);
      }}
      className={cn(
        "overflow-hidden rounded-xl border transition-colors",
        overZone === name ? "border-brand bg-brand-50/40" : "border-line",
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
  const [overZone, setOverZone] = useState<"featured" | "rest" | null>(null);

  const featured = items.filter((l) => l.isFeatured);
  const rest = items.filter((l) => !l.isFeatured);

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
    setOverZone,
  };

  return (
    <div className="space-y-8">
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

      <section>
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-lg">All listings</h2>
          <p className="text-sm text-muted">
            Drag one up into the group above to feature it on the homepage.
          </p>
        </div>
        <Zone name="rest" rows={rest} overZone={overZone} h={handlers} empty="Every listing is featured." />
      </section>
    </div>
  );
}
