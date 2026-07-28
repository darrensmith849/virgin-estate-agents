"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

import { formatPrice } from "@/lib/utils";

/*
 * ListingsMap — every located property on one map, using the same token-free
 * CARTO "Positron" basemap as the single-property maps (see LeafletMap). Prices
 * are the markers; clicking one opens a card that links through to the listing.
 * Leaflet is imported inside the effect so it only ever runs in the browser.
 */

type MapListing = {
  id: string;
  slug: string;
  title: string;
  price: number;
  kind: "sale" | "rent";
  rentPeriod: string | null;
  latitude: number | null;
  longitude: number | null;
  suburb: string | null;
};

/** Marker labels have to stay short — "$1.2m", not "$1,200,000". */
function compactPrice(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (n >= 1_000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function ListingsMap({ items }: { items: MapListing[] }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  const withCoords = items.filter(
    (i) => i.latitude != null && i.longitude != null,
  );
  // Re-run only when the actual set of pins changes, not on every render.
  const key = withCoords
    .map((l) => `${l.id}:${l.latitude},${l.longitude}`)
    .join("|");

  useEffect(() => {
    if (!withCoords.length) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      });
      mapRef.current = map;
      map.attributionControl.setPrefix("");

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 20,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        },
      ).addTo(map);

      for (const l of withCoords) {
        const marker = L.marker([l.latitude!, l.longitude!], {
          icon: L.divIcon({
            className: "vea-price-pin",
            html: `<span>${compactPrice(l.price)}</span>`,
            iconSize: [0, 0], // sized by its own content, not a fixed box
          }),
          title: l.title,
        }).addTo(map);

        marker.bindPopup(
          `<a class="vea-map-card" href="/listings/${encodeURIComponent(l.slug)}">
             <span class="vea-map-card__price">${escapeHtml(
               formatPrice(l.price, { kind: l.kind, period: l.rentPeriod }),
             )}</span>
             <span class="vea-map-card__title">${escapeHtml(l.title)}</span>
             ${l.suburb ? `<span class="vea-map-card__suburb">${escapeHtml(l.suburb)}</span>` : ""}
           </a>`,
          { closeButton: false, offset: [0, -34], minWidth: 190 },
        );

        // Keep in-app navigation client-side rather than a full page load.
        marker.on("popupopen", (e: { popup: { getElement: () => HTMLElement | undefined } }) => {
          const link = e.popup.getElement()?.querySelector("a.vea-map-card");
          link?.addEventListener(
            "click",
            (ev) => {
              ev.preventDefault();
              router.push(`/listings/${l.slug}`);
            },
            { once: true },
          );
        });
      }

      map.fitBounds(
        L.latLngBounds(withCoords.map((l) => [l.latitude!, l.longitude!])),
        { padding: [56, 56], maxZoom: 15 },
      );

      // Settle sizing if the container mounted while hidden or animating.
      requestAnimationFrame(() => map.invalidateSize());
      setTimeout(() => map.invalidateSize(), 250);
    })();

    return () => {
      cancelled = true;
      const m = mapRef.current as { remove?: () => void } | null;
      if (m && typeof m.remove === "function") m.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, router]);

  if (!withCoords.length) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-paper-2 p-8 text-center">
        <MapPin size={28} className="text-sand" />
        <p className="mt-3 font-medium text-ink">Nothing to map yet</p>
        <p className="mt-1 max-w-sm text-sm text-muted">
          None of the properties matching your search have a pinned location.
          Switch back to list view to browse them.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[70vh] overflow-hidden rounded-xl border border-line"
      aria-label="Map of available properties"
    />
  );
}
