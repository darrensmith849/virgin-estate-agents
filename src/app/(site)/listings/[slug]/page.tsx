import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getListingBySlug, getSimilarListings } from "@/lib/data/listings";
import { ListingDetail } from "@/components/listings/listing-detail";
import { formatPrice } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) return { title: "Listing not found" };

  const cover = listing.images.find((i) => i.isCover) ?? listing.images[0];
  const desc = `${formatPrice(listing.price, { kind: listing.kind, period: listing.rentPeriod })} · ${
    listing.suburb ?? listing.city
  } · ${listing.bedrooms} bed ${listing.bathrooms} bath`;

  return {
    title: listing.title,
    description: listing.description?.slice(0, 160) || desc,
    openGraph: {
      title: listing.title,
      description: desc,
      images: cover ? [{ url: cover.url }] : undefined,
      type: "website",
    },
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Published listings only — `getListingBySlug` filters out drafts, so an
  // unpublished listing 404s here even if its slug is known.
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const similar = await getSimilarListings(listing.id, {
    suburb: listing.suburb,
    propertyType: listing.propertyType,
    limit: 3,
  });

  return <ListingDetail listing={listing} similar={similar} />;
}
