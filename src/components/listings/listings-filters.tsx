"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Map as MapIcon } from "lucide-react";

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

export function ListingsFilters({
  propertyTypes,
}: {
  /** Types actually in use, so agency-invented types are filterable. */
  propertyTypes: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = useCallback(
    (changes: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      next.delete("page"); // reset pagination on filter change
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const kind = params.get("kind") ?? "";
  const view = params.get("view") === "map" ? "map" : "list";

  return (
    <div className="rounded-xl border border-line bg-card p-4">
      {/* Kind segmented + view toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-[var(--radius)] bg-paper-2 p-1">
          {[
            { label: "All", value: "" },
            { label: "For sale", value: "sale" },
            { label: "To rent", value: "rent" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ kind: opt.value })}
              className={cn(
                "rounded-[calc(var(--radius)-2px)] px-4 py-1.5 text-sm transition-colors",
                kind === opt.value
                  ? "bg-card text-ink shadow-sm"
                  : "text-muted hover:text-ink",
              )}
            >
              {opt.label}
            </button>
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

      {/* Selects */}
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        <Select
          aria-label="Suburb"
          value={params.get("suburb") ?? ""}
          onChange={(e) => update({ suburb: e.target.value })}
        >
          <option value="">Any suburb</option>
          {HARARE_SUBURBS.map((s) => (
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
