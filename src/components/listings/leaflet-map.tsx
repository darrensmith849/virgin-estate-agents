"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

/*
 * LeafletMap — a clean, premium single-location map. Uses CARTO's minimal
 * "Positron" basemap (free, no token) for an elegant monochrome look, with a
 * custom brand-green pin. Leaflet is dynamically imported inside the effect so
 * it only ever runs in the browser — never during SSR or on the Worker.
 */
export function LeafletMap({
  latitude,
  longitude,
  label,
  className,
}: {
  latitude: number;
  longitude: number;
  label?: string | null;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [latitude, longitude],
        zoom: 15,
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      });
      mapRef.current = map;
      map.attributionControl.setPrefix("");

      // Standard OpenStreetMap tiles: free, no API key, no usage gate. CARTO's
      // basemaps now stamp "API KEY REQUIRED" across unauthenticated tiles, so
      // they can't be used token-less. The muted, monochrome look the design
      // wants is restored with a CSS filter on .leaflet-tile-pane instead.
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const pin = L.divIcon({
        className: "vea-pin",
        html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15 0C6.716 0 0 6.716 0 15c0 9.65 13.5 23.7 14.07 24.29a1.29 1.29 0 0 0 1.86 0C16.5 38.7 30 24.65 30 15 30 6.716 23.284 0 15 0z" fill="#1f4434"/>
            <circle cx="15" cy="15" r="5.4" fill="#faf9f5"/>
          </svg>`,
        iconSize: [30, 40],
        iconAnchor: [15, 40],
      });
      L.marker([latitude, longitude], {
        icon: pin,
        title: label ?? undefined,
        keyboard: false,
      }).addTo(map);

      // Settle sizing if the container mounted hidden/animating (e.g. in a dialog).
      requestAnimationFrame(() => map.invalidateSize());
      setTimeout(() => map.invalidateSize(), 250);
    })();

    return () => {
      cancelled = true;
      const m = mapRef.current as { remove?: () => void } | null;
      if (m && typeof m.remove === "function") m.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, label]);

  return <div ref={containerRef} className={className} aria-label={label ?? "Map"} />;
}
