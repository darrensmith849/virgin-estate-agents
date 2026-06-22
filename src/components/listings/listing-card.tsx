import Link from "next/link";
import Image from "next/image";
import { BedDouble, Bath, Maximize, MapPin, ImageOff } from "lucide-react";

import type { Listing } from "@/db/schema";
import { StatusBadge } from "./status-badge";
import { formatPrice, formatArea, cn } from "@/lib/utils";

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
  const isStand = listing.propertyType === "stand";

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className={cn("group block", className)}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-paper-2">
        {cover ? (
          <Image
            src={cover.url}
            alt={cover.alt ?? listing.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
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
      </div>

      <div className="mt-3.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-medium text-ink">
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
          {!isStand && (
            <>
              <span className="flex items-center gap-1.5">
                <BedDouble size={15} className="text-muted" />
                {listing.bedrooms}
              </span>
              <span className="flex items-center gap-1.5">
                <Bath size={15} className="text-muted" />
                {listing.bathrooms}
              </span>
            </>
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
