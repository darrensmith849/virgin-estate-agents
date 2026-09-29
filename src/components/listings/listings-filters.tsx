"use client";

import { useCallback, useTransition } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Loader2, Map as MapIcon } from "lucide-react";

import { Select } from "@/components/ui/form";
import { HARARE_SUBURBS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const PRICE_OPTS = [
  { label: "Any", value: "" },
  { label: "$50k", value: "50000" },
  { label: "$100k", value: "100000" },
  { label: "$250k", value: "250000" },
  { label: "$500k", value: "500000" },
  { label: "$1m", value: "1000000" },
];

/** Dims a tab or button while its page is on the way. */
function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 size={13} className="ml-1.5 inline animate-spin text-muted" aria-hidden /> : null;
}

export function ListingsFilters({
  propertyTypes,
  areas = [...HARARE_SUBURBS],
  kindLabels = { sale: "For Sale", rent: "To Rent" },
  categories = [],
}: {
  /** The agency's types that have properties (see listTypeFilterOptions). */
  propertyTypes: string[];
  /** Areas to offer: Harare suburbs plus anywhere that has listings. */
  areas?: string[];
  /** The agency's wording for "For Sale" / "To Rent", from Settings. */
  kindLabels?: { sale: string; rent: string };
  /** Categories with properties, for the quick category buttons. */
  categories?: { key: string; label: string; count: number }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  /** The current URL with some filters changed (and back to page 1). */
  const hrefWith = useCallback(
    (changes: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      next.delete("page"); // reset pagination on filter change
      const qs = next.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [params, pathname],
  );

  const update = useCallback(
    (changes: Record<string, string>) => {
      startTransition(() => router.push(hrefWith(changes), { scroll: false }));
    },
    [hrefWith, router],
  );

  const kind = params.get("kind") ?? "";
  const category = params.get("category") ?? "";
  const view = params.get("view") === "map" ? "map" : "list";

  /*
   * The tabs and category buttons are links, fetched in the background as
   * soon as the page opens, so switching between them is instant rather than
   * a round trip to the server.
   */
  const tabClass = (on: boolean) =>
    cn(
      "inline-flex items-center rounded-[calc(var(--radius)-2px)] px-4 py-1.5 text-sm transition-colors",
      on ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink",
    );

  return (
    <div className={cn("rounded-xl border border-line bg-card p-4 transition-opacity", pending && "opacity-70")}>
      {/* Kind segmented + view toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-[var(--radius)] bg-paper-2 p-1">
          {[
            { label: "All", value: "" },
            { label: kindLabels.sale, value: "sale" },
            { label: kindLabels.rent, value: "rent" },
          ].map((opt) => (
            <Link
              key={opt.value}
              href={hrefWith({ kind: opt.value })}
              prefetch
              scroll={false}
              aria-current={kind === opt.value ? "page" : undefined}
              className={tabClass(kind === opt.value)}
            >
              {opt.label}
              <Pending />
            </Link>
          ))}
        </div>

        <div className="inline-flex rounded-[var(--radius)] bg-paper-2 p-1">
          <button
            type="button"
            onClick={() => update({ view: "" })}
            aria-label="List view"
            className={cn(
              "rounded-[calc(var(--radius)-2px)] p-2 transition-colors",
              view === "list" ? "bg-card text-ink shadow-sm" : "text-muted",
            )}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            onClick={() => update({ view: "map" })}
            aria-label="Map view"
            className={cn(
              "rounded-[calc(var(--radius)-2px)] p-2 transition-colors",
              view === "map" ? "bg-card text-ink shadow-sm" : "text-muted",
            )}
          >
            <MapIcon size={16} />
          </button>
        </div>
      </div>

      {/* Quick category buttons: Residential, Commercial, Industrial, Land. */}
      {categories.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[{ key: "", label: "All", count: 0 }, ...categories].map((c) => {
            const on = category === c.key;
            return (
              <Link
                key={c.key || "all"}
                href={hrefWith({ category: c.key })}
                prefetch
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                  on
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-card text-ink-soft hover:border-brand/40 hover:text-brand",
                )}
              >
                {c.label}
                {c.key && <span className={cn("ml-1.5 text-xs", on ? "text-white/80" : "text-muted")}>{c.count}</span>}
                <Pending />
              </Link>
            );
          })}
        </div>
      )}

      {/* Selects */}
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        <Select
          aria-label="Area"
          value={params.get("suburb") ?? ""}
          onChange={(e) => update({ suburb: e.target.value })}
        >
          <option value="">Any area</option>
          {areas.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Property type"
          value={params.get("type") ?? ""}
          onChange={(e) => update({ type: e.target.value })}
        >
          <option value="">Any type</option>
          {propertyTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Bedrooms"
          value={params.get("minBeds") ?? ""}
          onChange={(e) => update({ minBeds: e.target.value })}
        >
          <option value="">Any beds</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={String(n)}>
              {n}+ beds
            </option>
          ))}
        </Select>

        <Select
          aria-label="Minimum price"
          value={params.get("minPrice") ?? ""}
          onChange={(e) => update({ minPrice: e.target.value })}
        >
          {PRICE_OPTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.value ? `Min ${o.label}` : "Min price"}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Maximum price"
          value={params.get("maxPrice") ?? ""}
          onChange={(e) => update({ maxPrice: e.target.value })}
        >
          {PRICE_OPTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.value ? `Max ${o.label}` : "Max price"}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Sort"
          value={params.get("sort") ?? "newest"}
          onChange={(e) => update({ sort: e.target.value })}
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </Select>
      </div>
    </div>
  );
}
