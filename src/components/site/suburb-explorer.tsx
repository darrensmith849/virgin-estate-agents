import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/ui/container";
import { listAreasWithPhotos } from "@/lib/data/listings";
import { mediaSrc } from "@/lib/media";
import { SUBURB_BLURBS } from "@/lib/suburbs";

/** How many areas the section needs before it's worth showing. */
const MIN_AREAS = 3;
/** Listings an area needs before it gets a card. */
const MIN_LISTINGS = 2;

/*
 * "Areas we know inside out", told with the agency's own properties: each card
 * is an area where it has several listings, pictured with a photo from one of
 * them. Stock photos never matched the suburbs, so there are none — and until
 * enough areas qualify, the section simply isn't shown. It appears by itself
 * as the portfolio grows.
 */
export async function SuburbExplorer() {
  const areas = (await listAreasWithPhotos(MIN_LISTINGS)).slice(0, 3);
  if (areas.length < MIN_AREAS) return null;

  return (
    <section className="reveal py-20 sm:py-28">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand">
              Where we work
            </p>
            <h2 className="mt-4 text-3xl sm:text-4xl">Areas we know inside out.</h2>
            <p className="mt-4 text-muted">
              The neighbourhoods where we&rsquo;re busiest, pictured with our own properties.
            </p>
          </div>
          <Link
            href="/guides"
            className="group flex items-center gap-1.5 text-sm text-brand transition-colors hover:text-brand-700"
          >
            <span className="link-underline">View all areas</span>
            <ArrowRight
              size={15}
              className="transition-transform duration-300 ease-out group-hover:translate-x-1"
            />
          </Link>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <Link
              key={area.name}
              href={`/listings?suburb=${encodeURIComponent(area.name)}`}
              className="ve-card group flex flex-col overflow-hidden rounded-2xl transition-all duration-300 ease-out hover:-translate-y-1"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-paper-2">
                {area.photo && (
                  <Image
                    src={mediaSrc(area.photo.url)}
                    alt={area.photo.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    quality={60}
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-serif text-2xl text-ink transition-colors group-hover:text-brand">
                  {area.name}
                </h3>
                <p className="mt-1 text-sm text-sand">
                  {area.count} {area.count === 1 ? "property" : "properties"}
                </p>
                {SUBURB_BLURBS[area.name] && (
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                    {SUBURB_BLURBS[area.name]}
                  </p>
                )}
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                  View properties
                  <ArrowRight
                    size={14}
                    className="transition-transform duration-300 ease-out group-hover:translate-x-1"
                  />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
