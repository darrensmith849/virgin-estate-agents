import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";

import { Container } from "@/components/ui/container";
import { ListingCard } from "@/components/listings/listing-card";
import { ListingsFilters } from "@/components/listings/listings-filters";
import { ListingsMap } from "@/components/listings/listings-map";
import { listPropertyTypesInUse, listPublicListings } from "@/lib/data/listings";
import { getAgencySettings } from "@/lib/data/settings";
import { resolveVocabulary } from "@/lib/vocabulary";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Listings",
  description:
    "Browse houses, apartments, stands and commercial property for sale and to rent across Harare.",
};

type SP = Record<string, string | undefined>;

function num(v: string | undefined) {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const view = sp.view === "map" ? "map" : "list";

  const [settings, propertyTypes] = await Promise.all([
    getAgencySettings(),
    listPropertyTypesInUse(),
  ]);
  const vocabulary = resolveVocabulary(settings);
  const sort = (sp.sort as "newest" | "price_asc" | "price_desc") ?? "newest";

  const { items, total, page, pageCount } = await listPublicListings({
    kind: sp.kind === "sale" || sp.kind === "rent" ? sp.kind : undefined,
    propertyType: sp.type,
    suburb: sp.suburb,
    minPrice: num(sp.minPrice),
    maxPrice: num(sp.maxPrice),
    minBeds: num(sp.minBeds),
    q: sp.q,
    sort,
    page: num(sp.page) ?? 1,
    perPage: view === "map" ? 60 : 12,
  });

  const buildPageHref = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v) next.set(k, v);
    next.set("page", String(p));
    return `/listings?${next.toString()}`;
  };

  return (
    <Container className="py-10 sm:py-14">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl">Listings</h1>
        <p className="mt-1.5 text-sm text-muted">
          {total} {total === 1 ? "property" : "properties"} available
        </p>
      </header>

      <ListingsFilters propertyTypes={propertyTypes} />

      <div className="mt-8">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-card py-20 text-center">
            <SearchX size={28} className="text-muted" />
            <p className="mt-3 font-medium text-ink">No properties match your search</p>
            <p className="mt-1 text-sm text-muted">Try widening your filters.</p>
            <Link href="/listings" className="mt-4 text-sm text-brand hover:underline">
              Clear all filters
            </Link>
          </div>
        ) : view === "map" ? (
          <ListingsMap
            items={items.map((l) => ({
              id: l.id,
              slug: l.slug,
              title: l.title,
              price: l.price,
              kind: l.kind,
              rentPeriod: l.rentPeriod,
              latitude: l.latitude,
              longitude: l.longitude,
              suburb: l.suburb,
            }))}
          />
        ) : (
          (() => {
            // Group the page into "for sale" then "to rent" so the two never
            // interleave. An explicit price sort keeps one continuous run —
            // splitting it would contradict what was asked for.
            const grouped = sort === "newest";
            if (!grouped) {
              return (
                <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((listing, i) => (
                    <ListingCard key={listing.id} listing={listing} priority={i < 3} />
                  ))}
                </div>
              );
            }

            const groups = (["sale", "rent"] as const)
              .map((kind) => ({
                kind,
                label: vocabulary.kindLabels[kind],
                rows: items.filter((l) => l.kind === kind),
              }))
              .filter((g) => g.rows.length > 0);

            let rendered = 0;
            return (
              <div className="space-y-12">
                {groups.map((group) => (
                  <section key={group.kind}>
                    {/* Only worth a heading when both kinds are on the page. */}
                    {groups.length > 1 && (
                      <h2 className="mb-5 flex items-baseline gap-3 text-xl">
                        {group.label}
                        <span className="text-sm font-normal text-muted">
                          {group.rows.length}{" "}
                          {group.rows.length === 1 ? "property" : "properties"}
                        </span>
                      </h2>
                    )}
                    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                      {group.rows.map((listing) => (
                        <ListingCard
                          key={listing.id}
                          listing={listing}
                          priority={rendered++ < 3}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            );
          })()
        )}
      </div>

      {/* Pagination */}
      {view === "list" && pageCount > 1 && (
        <nav className="mt-12 flex items-center justify-center gap-1">
          <Link
            href={buildPageHref(Math.max(1, page - 1))}
            aria-disabled={page === 1}
            className={cn(
              "inline-flex h-9 items-center gap-1 rounded-[var(--radius)] px-3 text-sm",
              page === 1
                ? "pointer-events-none text-muted/50"
                : "text-ink-soft hover:bg-paper-2",
            )}
          >
            <ChevronLeft size={16} /> Prev
          </Link>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildPageHref(p)}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-sm",
                p === page
                  ? "bg-brand text-white"
                  : "text-ink-soft hover:bg-paper-2",
              )}
            >
              {p}
            </Link>
          ))}
          <Link
            href={buildPageHref(Math.min(pageCount, page + 1))}
            aria-disabled={page === pageCount}
            className={cn(
              "inline-flex h-9 items-center gap-1 rounded-[var(--radius)] px-3 text-sm",
              page === pageCount
                ? "pointer-events-none text-muted/50"
                : "text-ink-soft hover:bg-paper-2",
            )}
          >
            Next <ChevronRight size={16} />
          </Link>
        </nav>
      )}
    </Container>
  );
}
