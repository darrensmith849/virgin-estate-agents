import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPinned } from "lucide-react";

import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { ListingCard } from "@/components/listings/listing-card";
import { PropertyMap } from "@/components/listings/property-map";
import { listPublicListings } from "@/lib/data/listings";
import { SITE } from "@/lib/constants";
import { slugifySuburb, suburbFromSlug, suburbBlurb } from "@/lib/suburbs";
import { suburbCoords } from "@/lib/suburb-coords";

// Listings reflect the live database.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const suburb = suburbFromSlug(slug);
  if (!suburb) return { title: "Neighbourhood guide" };
  return {
    title: `Property for sale & rent in ${suburb}, Harare`,
    description: `Houses, apartments and stands in ${suburb}, ${SITE.city}. ${suburbBlurb(suburb)}`,
    alternates: { canonical: `/guides/${slug}` },
  };
}

export default async function SuburbGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const suburb = suburbFromSlug(slug);
  if (!suburb) notFound();

  const coords = suburbCoords(suburb);

  const { items, total } = await listPublicListings({
    suburb,
    perPage: 9,
    sort: "newest",
  });

  return (
    <Container className="py-12 sm:py-16">
      <Link
        href="/guides"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ChevronLeft size={15} /> All areas
      </Link>

      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand">
          Neighbourhood guide
        </p>
        <h1 className="mt-4 text-4xl sm:text-5xl">{suburb}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          {suburbBlurb(suburb)}
        </p>
        <p className="mt-2 text-sm text-muted">
          {total} {total === 1 ? "property" : "properties"} available in {suburb},{" "}
          {SITE.city}.
        </p>
      </div>

      {coords && (
        <div className="mt-8">
          <PropertyMap
            latitude={coords.lat}
            longitude={coords.lng}
            label={`${suburb}, ${SITE.city}`}
          />
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line bg-card/60 p-10 text-center">
          <MapPinned size={26} className="mx-auto text-sand" />
          <p className="mt-3 font-medium text-ink">
            No live listings in {suburb} right now.
          </p>
          <p className="mt-1 text-sm text-muted">
            New homes come up here often — register your interest and we&rsquo;ll
            be in touch.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/contact"
              className={buttonVariants({ variant: "primary", size: "md" })}
            >
              Register your interest
            </Link>
            <Link
              href="/listings"
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              Browse all listings
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} priority={i < 3} />
            ))}
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-3">
            <Link
              href={`/listings?suburb=${encodeURIComponent(suburb)}`}
              className={buttonVariants({ variant: "primary", size: "md" })}
            >
              See all {suburb} listings
            </Link>
            <Link
              href="/contact"
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              Talk to us about {suburb}
            </Link>
          </div>
        </>
      )}
    </Container>
  );
}
