import Link from "next/link";
import {
  BedDouble,
  Bath,
  Car,
  Maximize,
  LandPlot,
  Home,
  Info,
  MapPin,
  Check,
  ChevronRight,
  ArrowRight,
  Eye,
} from "lucide-react";

import type { getListingBySlug } from "@/lib/data/listings";
import { Container } from "@/components/ui/container";
import { StatusBadge } from "@/components/listings/status-badge";
import { Gallery } from "@/components/listings/gallery";
import { VideoGallery } from "@/components/listings/video-gallery";
import { PropertyMap } from "@/components/listings/property-map";
import { AgentCard } from "@/components/listings/agent-card";
import { EnquiryForm } from "@/components/listings/enquiry-form";
import { ShareButton } from "@/components/listings/share-button";
import { ViewTracker } from "@/components/listings/view-tracker";
import { ListingCard } from "@/components/listings/listing-card";
import { BondCalculator } from "@/components/site/bond-calculator";
import { SITE } from "@/lib/constants";
import { formatPropertyType, type Vocabulary } from "@/lib/vocabulary";
import { slugifySuburb, suburbBlurb } from "@/lib/suburbs";
import { formatArea, formatPrice } from "@/lib/utils";

export type DetailListing = NonNullable<
  Awaited<ReturnType<typeof getListingBySlug>>
>;

/**
 * The full property page. Rendered publicly at `/listings/[slug]` and, for
 * unpublished listings, by the admin-only preview at
 * `/admin/listings/[id]/preview` — so the agency sees exactly what visitors
 * will see before publishing. In `preview` mode the view isn't counted and a
 * banner makes it obvious the listing isn't live.
 */
export function ListingDetail({
  listing,
  similar,
  preview = false,
  vocabulary,
}: {
  listing: DetailListing;
  similar: React.ComponentProps<typeof ListingCard>["listing"][];
  preview?: boolean;
  /** The agency's own wording for the spec labels. */
  vocabulary: Vocabulary;
}) {
  const typeName = formatPropertyType(listing.propertyType);
  const labels = vocabulary.specLabels;
  // Which specs show is driven by the data, not by guessing from the property
  // type: null means the agency marked it not applicable, so a commercial unit
  // simply has no bedroom row, while 0 is still a real zero worth stating.
  const stats = [
    listing.bedrooms != null && { icon: BedDouble, label: labels.bedrooms, value: listing.bedrooms },
    listing.bathrooms != null && { icon: Bath, label: labels.bathrooms, value: listing.bathrooms },
    listing.garages != null && { icon: Car, label: labels.garages, value: listing.garages },
    listing.floorSizeSqm && { icon: Maximize, label: labels.floorSize, value: formatArea(listing.floorSizeSqm) },
    listing.landSizeSqm && { icon: LandPlot, label: labels.landSize, value: formatArea(listing.landSizeSqm) },
    // Anything the agency added themselves for this property.
    ...(listing.customSpecs ?? []).map((spec) => ({
      icon: Info,
      label: spec.label,
      value: spec.value,
    })),
    { icon: Home, label: "Type", value: typeName },
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

  // Breadcrumb trail (+ schema): Home › Listings › Suburb › Title
  const suburbSlug = listing.suburb ? slugifySuburb(listing.suburb) : null;
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Listings", href: "/listings" },
    ...(listing.suburb && suburbSlug
      ? [{ name: listing.suburb, href: `/guides/${suburbSlug}` }]
      : []),
    { name: listing.title, href: `/listings/${listing.slug}` },
  ];
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE.url}${c.href}`,
    })),
  };

  // At-a-glance key facts (factual data only).
  const statusLabels: Record<string, string> = {
    for_sale: "For sale",
    under_offer: "Under offer",
    sold: "Sold",
    draft: "Draft",
  };
  const keyFacts = [
    { label: "Reference", value: `VE-${listing.id.slice(0, 6).toUpperCase()}` },
    listing.publishedAt
      ? {
          label: "Listed",
          value: new Date(listing.publishedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        }
      : null,
    { label: "Status", value: statusLabels[listing.status] ?? listing.status },
    listing.kind === "sale" && listing.floorSizeSqm
      ? {
          label: "Price per m²",
          value: `$${Math.round(listing.price / listing.floorSizeSqm).toLocaleString("en-US")}`,
        }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <Container className="py-8 sm:py-10">
      {!preview && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
          />
          <ViewTracker listingId={listing.id} path={`/listings/${listing.slug}`} />
        </>
      )}

      {preview && (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-line bg-brand-50 px-4 py-3 text-sm text-brand">
          <Eye size={15} className="shrink-0" />
          <span className="font-medium">Preview</span>
          <span className="text-brand/80">
            This is how the property will look once published. It isn&rsquo;t
            visible to visitors yet and this view isn&rsquo;t counted.
          </span>
        </div>
      )}

      <nav aria-label="Breadcrumb" className="mb-5">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <li key={c.href} className="flex items-center gap-1.5">
                {i > 0 && (
                  <ChevronRight size={13} className="shrink-0 text-muted/50" />
                )}
                {last ? (
                  <span className="line-clamp-1 text-ink-soft">{c.name}</span>
                ) : (
                  <Link href={c.href} className="hover:text-ink">
                    {c.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2">
          <Gallery
            images={listing.images.map((i) => ({ url: i.url, alt: i.alt }))}
            title={listing.title}
          />
          <VideoGallery
            videos={listing.videos.map((video) => ({
              id: video.id,
              url: video.url,
              title: video.title,
            }))}
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

          {/* Key facts — at a glance */}
          <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
            {keyFacts.map((f) => (
              <div key={f.label} className="bg-card p-4">
                <dt className="text-xs text-muted">{f.label}</dt>
                <dd className="mt-1 text-sm font-medium text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>

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

          {/* About the area */}
          {listing.suburb && (
            <div className="mt-10">
              <h2 className="text-2xl">About {listing.suburb}</h2>
              <p className="mt-4 leading-relaxed text-ink-soft">
                {suburbBlurb(listing.suburb)}
              </p>
              {suburbSlug && (
                <Link
                  href={`/guides/${suburbSlug}`}
                  className="group mt-4 inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand-700"
                >
                  <span className="link-underline">
                    Explore the {listing.suburb} guide
                  </span>
                  <ArrowRight
                    size={14}
                    className="transition-transform duration-300 ease-out group-hover:translate-x-1"
                  />
                </Link>
              )}
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
            {listing.kind === "sale" && listing.price > 0 && (
              <BondCalculator price={listing.price} />
            )}
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
