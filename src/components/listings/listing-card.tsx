import Link from "next/link";
import Image from "next/image";
import { BedDouble, Bath, Maximize, MapPin, ImageOff, ArrowRight } from "lucide-react";

import type { Listing } from "@/db/schema";
import { StatusBadge } from "./status-badge";
import { formatPrice, formatArea, cn } from "@/lib/utils";
import { mediaSrc } from "@/lib/media";

export type CardListing = Pick<
  Listing,
  | "id"
  | "slug"
  | "title"
  | "price"
  | "kind"
  | "rentPeriod"
  | "status"
  | "suburb"
  | "city"
  | "bedrooms"
  | "bathrooms"
  | "propertyType"
  | "landSizeSqm"
  | "floorSizeSqm"
> & {
  images: { url: string; alt: string | null; isCover: boolean }[];
};

export function ListingCard({
  listing,
  className,
  priority = false,
}: {
  listing: CardListing;
  className?: string;
  priority?: boolean;
}) {
  const cover =
    listing.images.find((i) => i.isCover) ?? listing.images[0] ?? null;
  const area = formatArea(listing.floorSizeSqm ?? listing.landSizeSqm);

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className={cn(
        "group block transition-transform duration-300 ease-out hover:-translate-y-1",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-paper-2 shadow-sm ring-1 ring-black/[0.04] transition-shadow duration-300 group-hover:shadow-xl">
        {cover ? (
          <div className="ve-parallax absolute inset-0">
            <Image
              src={mediaSrc(cover.url)}
              alt={cover.alt ?? listing.title}
              fill
              priority={priority}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <ImageOff size={28} />
          </div>
        )}
        {listing.status !== "for_sale" && (
          <div className="absolute left-3 top-3">
            <StatusBadge
              status={listing.status}
              className="shadow-sm backdrop-blur"
            />
          </div>
        )}

        {/* Hover affordance — a soft scrim and a quiet prompt rise into view. */}
        {cover && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/45 to-transparent opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100" />
            <div className="pointer-events-none absolute bottom-3 left-3.5 flex translate-y-1.5 items-center gap-1.5 text-sm font-medium text-white opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
              View property
              <ArrowRight
                size={14}
                className="transition-transform duration-300 ease-out group-hover:translate-x-0.5"
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-3.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-medium tabular-nums text-ink">
            {formatPrice(listing.price, {
              kind: listing.kind,
              period: listing.rentPeriod,
            })}
          </p>
        </div>
        <h3 className="mt-1 line-clamp-1 font-serif text-lg leading-snug text-ink transition-colors group-hover:text-brand">
          {listing.title}
        </h3>
        {listing.suburb && (
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
            <MapPin size={13} className="text-sand" />
            {listing.suburb}, {listing.city}
          </p>
        )}

        <div className="mt-3 flex items-center gap-4 text-sm text-ink-soft">
          {/* Shown only where the spec applies: null means the agency marked it
              not applicable (a commercial unit, bare land), 0 is a real zero. */}
          {listing.bedrooms != null && (
            <span className="flex items-center gap-1.5">
              <BedDouble size={15} className="text-muted" />
              {listing.bedrooms}
            </span>
          )}
          {listing.bathrooms != null && (
            <span className="flex items-center gap-1.5">
              <Bath size={15} className="text-muted" />
              {listing.bathrooms}
            </span>
          )}
          {area && (
            <span className="flex items-center gap-1.5">
              <Maximize size={15} className="text-muted" />
              {area}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
