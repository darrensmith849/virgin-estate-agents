"use client";

import { useEffect, useMemo, useRef } from "react";
import "leaflet/dist/leaflet.css";

/*
 * The map pin, placed by hand.
 *
 * Typing an address gets the pin roughly right, but Zimbabwean street data
 * rarely has house numbers, so "roughly right" is often the whole street. This
 * lets staff drag the pin to the actual gate instead of reasoning about
 * latitude. Click anywhere to place it; drag to refine.
 *
 * Same Leaflet + OpenStreetMap stack as the public maps, imported inside the
 * effect so it only ever runs in the browser.
 */

/** Harare city centre — where the map opens before a pin exists. */
const DEFAULT_CENTRE: [number, number] = [-17.8252, 31.0335];

type LatLng = { lat: number; lng: number };

export type ResolvedPlace = {
  label: string | null;
  road: string | null;
  addressLine: string | null;
  suburb: string | null;
  city: string | null;
};

export function LocationPicker({
  lat,
  lng,
  onChange,
  onPlace,
}: {
  /** Current values as held by the form (strings, possibly empty). */
  lat: string;
  lng: string;
  onChange: (next: LatLng) => void;
  /** Called with whatever place the new pin position resolves to, so the form
   *  can keep the suburb and city in step with the map. */
  onPlace?: (place: ResolvedPlace) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const onChangeRef = useRef(onChange);
  const onPlaceRef = useRef(onPlace);
  /** Aborts an in-flight reverse lookup when the pin moves again. */
  const revAbort = useRef<AbortController | null>(null);
  /** The last position this component itself reported, so the sync effect can
   *  tell an external change (a chosen address) from its own echo and avoid
   *  yanking the map while someone is dragging. */
  const selfSet = useRef<string | null>(null);
  /** Set during init so the sync effect can create the pin on a new listing,
   *  where the map starts with no marker at all. */
  const placeRef = useRef<((p: LatLng) => void) | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceRef.current = onPlace;
  });

  // Memoised so the sync effect below doesn't see a fresh object every render.
  const parsed = useMemo<LatLng | null>(() => {
    const a = Number(lat);
    const b = Number(lng);
    if (lat.trim() === "" || lng.trim() === "") return null;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return { lat: a, lng: b };
  }, [lat, lng]);

  // Init once. The map is torn down only when the component unmounts.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: DEFAULT_CENTRE,
        zoom: 12,
        scrollWheelZoom: true,
        zoomControl: true,
        attributionControl: true,
      });
      mapRef.current = map;
      map.attributionControl.setPrefix("");

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const icon = L.divIcon({
        className: "vea-pin",
        html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15 0C6.716 0 0 6.716 0 15c0 9.65 13.5 23.7 14.07 24.29a1.29 1.29 0 0 0 1.86 0C16.5 38.7 30 24.65 30 15 30 6.716 23.284 0 15 0z" fill="#1f4434"/>
            <circle cx="15" cy="15" r="5.4" fill="#faf9f5"/>
          </svg>`,
        iconSize: [30, 40],
        iconAnchor: [15, 40],
      });

      const report = (p: LatLng) => {
        const rounded = { lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) };
        selfSet.current = `${rounded.lat},${rounded.lng}`;
        onChangeRef.current(rounded);

        // Ask what is actually at the new position so the suburb and city can
        // follow the pin rather than describing where it used to be.
        if (!onPlaceRef.current) return;
        revAbort.current?.abort();
        const controller = new AbortController();
        revAbort.current = controller;
        void fetch(
          `/admin/api/geocode?mode=reverse&lat=${rounded.lat}&lon=${rounded.lng}`,
          { signal: controller.signal },
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.place) onPlaceRef.current?.(d.place);
          })
          .catch(() => {
            // Aborted by a newer drag, or the lookup is unavailable — the pin
            // itself is already set either way.
          });
      };

      const place = (p: LatLng) => {
        const existing = markerRef.current as
          | { setLatLng: (v: [number, number]) => void }
          | null;
        if (existing) {
          existing.setLatLng([p.lat, p.lng]);
          return;
        }
        const marker = L.marker([p.lat, p.lng], {
          icon,
          draggable: true,
          autoPan: true,
          keyboard: true,
          title: "Drag to move the pin",
        }).addTo(map);
        marker.on("dragend", () => {
          const ll = marker.getLatLng();
          report({ lat: ll.lat, lng: ll.lng });
        });
        markerRef.current = marker;
      };
      placeRef.current = place;

      // Clicking bare map places the pin, or moves it if it already exists.
      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        place(e.latlng);
        report(e.latlng);
      });

      if (parsed) {
        place(parsed);
        map.setView([parsed.lat, parsed.lng], 16);
      }

      // The panel can mount inside a section that is still settling.
      requestAnimationFrame(() => map.invalidateSize());
      setTimeout(() => map.invalidateSize(), 250);
    })();

    return () => {
      cancelled = true;
      const m = mapRef.current as { remove?: () => void } | null;
      if (m && typeof m.remove === "function") m.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Init only; later coordinate changes are handled by the sync effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow coordinates that changed elsewhere — picking an address suggestion,
  // or typing into the latitude/longitude boxes.
  useEffect(() => {
    const map = mapRef.current as
      | { setView: (c: [number, number], z?: number) => void; getZoom: () => number }
      | null;
    if (!map || !parsed) return;

    const key = `${parsed.lat},${parsed.lng}`;
    if (selfSet.current === key) return; // our own drag/click echoing back

    // Creates the pin when there isn't one yet — the new-listing case, where
    // the map opened empty and an address has just been chosen.
    placeRef.current?.(parsed);
    map.setView([parsed.lat, parsed.lng], Math.max(map.getZoom(), 16));
  }, [parsed]);

  return (
    <div>
      <div
        ref={containerRef}
        className="h-72 overflow-hidden rounded-xl border border-line"
        aria-label="Map for placing the property pin"
      />
      <p className="mt-2 text-sm text-muted">
        {parsed
          ? "Drag the pin to the exact spot, or click elsewhere on the map to move it."
          : "Click the map to place the pin — or pick an address above and it will be placed for you."}
      </p>
    </div>
  );
}
