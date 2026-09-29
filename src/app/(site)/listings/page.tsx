import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, SearchX } from "lucide-react";

import { Container } from "@/components/ui/container";
import { ListingCard } from "@/components/listings/listing-card";
import { ListingsFilters } from "@/components/listings/listings-filters";
import { ListingsMap } from "@/components/listings/listings-map";
import {
  listCategoryCounts,
  listPublicListings,
  listSearchAreas,
  listTypeFilterOptions,
} from "@/lib/data/listings";
import { getAgencySettings } from "@/lib/data/settings";
import {
  PROPERTY_CATEGORIES,
  isPropertyCategory,
  listingCategory,
  resolveVocabulary,
} from "@/lib/vocabulary";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Listings",
  description:
    "Browse houses, apartments, stands, commercial and industrial property for sale and to rent across Zimbabwe.",
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

  const kind = sp.kind === "sale" || sp.kind === "rent" ? sp.kind : undefined;
  const category = isPropertyCategory(sp.category) ? sp.category : undefined;
  const sort = (sp.sort as "newest" | "price_asc" | "price_desc") ?? "newest";

  const [settings, areas, categories] = await Promise.all([
    getAgencySettings(),
    listSearchAreas(),
    listCategoryCounts(kind),
  ]);
  const vocabulary = resolveVocabulary(settings);

  const [propertyTypes, { items, total, sold, rented, page, pageCount }] = await Promise.all([
    // The same list of types the dashboard offers (Settings → Property types).
    listTypeFilterOptions(vocabulary.propertyTypeOptions),
    listPublicListings({
      kind,
      category,
      propertyType: sp.type,
      suburb: sp.suburb,
      minPrice: num(sp.minPrice),
      maxPrice: num(sp.maxPrice),
      minBeds: num(sp.minBeds),
      q: sp.q,
      sort,
      page: num(sp.page) ?? 1,
      perPage: view === "map" ? 60 : 12,
    }),
  ]);

  /** This search narrowed to one category. */
  const categoryHref = (key: string) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page") next.set(k, v);
    next.set("category", key);
    return `/listings?${next.toString()}`;
  };

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
          {total - sold - rented} available
          {sold > 0 ? ` · ${sold} sold` : ""}
          {rented > 0 ? ` · ${rented} rented` : ""}
        </p>
      </header>

      <ListingsFilters
        propertyTypes={propertyTypes}
        areas={areas}
        kindLabels={vocabulary.kindLabels}
        categories={categories}
      />

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

            // For sale first, then to rent; within each, Residential,
            // Commercial, then Land. The database returns them in this order
            // already, so a category never splits across pages.
            const count = (n: number) => `${n} ${n === 1 ? "property" : "properties"}`;
            const kindGroups = (["sale", "rent"] as const)
              .map((kind) => {
                const rows = items.filter((l) => l.kind === kind);
                return {
                  kind,
                  label: vocabulary.kindLabels[kind],
                  rows,
                  categories: PROPERTY_CATEGORIES.map((c) => ({
                    ...c,
                    rows: rows.filter((l) => listingCategory(l) === c.key),
                  })).filter((c) => c.rows.length > 0),
                };
              })
              .filter((g) => g.rows.length > 0);
            const bothKinds = kindGroups.length > 1;

            let rendered = 0;
            const grid = (rows: typeof items) => (
              <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} priority={rendered++ < 3} />
                ))}
              </div>
            );

            return (
              <div className="space-y-14">
                {kindGroups.map((group) => (
                  <section key={group.kind}>
                    {/* The sale / rent heading is only worth showing when both
                        are on the page. */}
                    {bothKinds && (
                      <h2 className="mb-6 flex items-baseline gap-3 text-2xl">
                        {group.label}
                        <span className="text-sm font-normal text-muted">
                          {count(group.rows.length)}
                        </span>
                      </h2>
                    )}
                    <div className="space-y-12">
                      {group.categories.map((cat) => {
                        const Heading = bothKinds ? "h3" : "h2";
                        return (
                          <div key={cat.key}>
                            <Heading
                              className={cn(
                                "mb-5 flex items-baseline gap-3",
                                bothKinds ? "text-lg" : "text-xl",
                              )}
                            >
                              {/* Click a category to see only that category:
                                  name, count, then the arrow. */}
                              {category ? (
                                <>
                                  {cat.label}
                                  <span className="text-sm font-normal text-muted">
                                    {count(cat.rows.length)}
                                  </span>
                                </>
                              ) : (
                                <Link
                                  href={categoryHref(cat.key)}
                                  prefetch
                                  scroll={false}
                                  className="group inline-flex items-baseline gap-3 transition-colors hover:text-brand"
                                >
                                  {cat.label}
                                  <span className="text-sm font-normal text-muted">
                                    {count(cat.rows.length)}
                                  </span>
                                  <ArrowRight
                                    size={15}
                                    aria-hidden
                                    className="-ml-1 self-center text-muted transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-brand"
                                  />
                                </Link>
                              )}
                            </Heading>
                            {grid(cat.rows)}
                          </div>
                        );
                      })}
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
