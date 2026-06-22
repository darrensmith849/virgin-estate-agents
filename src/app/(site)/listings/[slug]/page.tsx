import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BedDouble,
  Bath,
  Car,
  Maximize,
  LandPlot,
  Home,
  MapPin,
  Check,
  ChevronLeft,
} from "lucide-react";

import { getListingBySlug, getSimilarListings } from "@/lib/data/listings";
import { Container } from "@/components/ui/container";
import { StatusBadge } from "@/components/listings/status-badge";
import { Gallery } from "@/components/listings/gallery";
import { PropertyMap } from "@/components/listings/property-map";
import { AgentCard } from "@/components/listings/agent-card";
import { EnquiryForm } from "@/components/listings/enquiry-form";
import { ShareButton } from "@/components/listings/share-button";
import { ViewTracker } from "@/components/listings/view-tracker";
import { ListingCard } from "@/components/listings/listing-card";
import { PROPERTY_TYPES, SITE } from "@/lib/constants";
import { formatArea, formatPrice } from "@/lib/utils";

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

const typeLabel = (v: string) =>
  PROPERTY_TYPES.find((t) => t.value === v)?.label ?? v;

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const similar = await getSimilarListings(listing.id, {
    suburb: listing.suburb,
    propertyType: listing.propertyType,
    limit: 3,
  });

  const isStand = listing.propertyType === "stand";
  const stats = [
    !isStand && { icon: BedDouble, label: "Bedrooms", value: listing.bedrooms },
    !isStand && { icon: Bath, label: "Bathrooms", value: listing.bathrooms },
    !isStand && listing.garages > 0 && { icon: Car, label: "Garages", value: listing.garages },
    listing.floorSizeSqm && { icon: Maximize, label: "Floor area", value: formatArea(listing.floorSizeSqm) },
    listing.landSizeSqm && { icon: LandPlot, label: "Land", value: formatArea(listing.landSizeSqm) },
    { icon: Home, label: "Type", value: typeLabel(listing.propertyType) },
  ].filter(Boolean) as { icon: typeof Home; label: string; value: React.ReactNode }[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: listing.title,
    description: listing.description || undefined,
    url: `${SITE.url}/listings/${listing.slug}`,
    image: listing.images.map((i) => i.url),
    datePosted: listing.publishedAt ?? undefined,
    offers: {
      "@type": "Offer",
      price: listing.price,
      priceCurrency: "USD",
      availability:
        listing.status === "sold"
          ? "https://schema.org/SoldOut"
          : "https://schema.org/InStock",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: listing.suburb ?? undefined,
      addressRegion: listing.city,
      addressCountry: "ZW",
    },
  };

  return (
    <Container className="py-8 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ViewTracker listingId={listing.id} path={`/listings/${listing.slug}`} />

      <Link
        href="/listings"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ChevronLeft size={15} /> All listings
      </Link>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2">
          <Gallery
            images={listing.images.map((i) => ({ url: i.url, alt: i.alt }))}
            title={listing.title}
          />

          <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl sm:text-4xl">{listing.title}</h1>
                {listing.status !== "for_sale" && <StatusBadge status={listing.status} />}
              </div>
              {(listing.suburb || listing.addressLine) && (
                <p className="mt-2 flex items-center gap-1.5 text-muted">
                  <MapPin size={16} className="text-sand" />
                  {[listing.addressLine, listing.suburb, listing.city]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-medium text-ink">
                {formatPrice(listing.price, { kind: listing.kind, period: listing.rentPeriod })}
              </p>
              <p className="text-sm text-muted">
                {listing.kind === "rent" ? "To rent" : "For sale"}
              </p>
            </div>
          </div>

          {/* Key stats */}
          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
            {stats.map((s, i) => (
              <div key={i} className="bg-card p-4">
                <s.icon size={18} className="text-brand" />
                <p className="mt-2 text-lg font-medium text-ink">{s.value}</p>
                <p className="text-xs text-muted">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          {listing.description && (
            <div className="mt-10">
              <h2 className="text-2xl">About this property</h2>
              <p className="mt-4 whitespace-pre-line leading-relaxed text-ink-soft">
                {listing.description}
              </p>
            </div>
          )}

          {/* Features */}
          {listing.features.length > 0 && (
            <div className="mt-10">
              <h2 className="text-2xl">Features</h2>
              <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {listing.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-ink-soft">
                    <Check size={16} className="shrink-0 text-brand" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Map */}
          {listing.latitude != null && listing.longitude != null && (
            <div className="mt-10">
              <h2 className="text-2xl">Location</h2>
              <p className="mt-1 mb-4 text-sm text-muted">
                {listing.suburb}, {listing.city}
              </p>
              <PropertyMap
                latitude={listing.latitude}
                longitude={listing.longitude}
                label={`${listing.suburb ?? ""} ${listing.city}`}
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <div className="space-y-5 lg:sticky lg:top-24">
            <div className="flex justify-end">
              <ShareButton title={listing.title} />
            </div>
            {listing.agent && (
              <AgentCard agent={listing.agent} listingTitle={listing.title} />
            )}
            <div className="rounded-xl border border-line bg-card p-5">
              <h3 className="text-lg">Enquire about this property</h3>
              <p className="mt-1 mb-4 text-sm text-muted">
                Send a message and we&rsquo;ll be in touch.
              </p>
              <EnquiryForm listingId={listing.id} listingTitle={listing.title} />
            </div>
          </div>
        </aside>
      </div>

      {/* Similar */}
      {similar.length > 0 && (
        <section className="mt-20">
          <h2 className="text-2xl sm:text-3xl">Similar properties</h2>
          <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}
