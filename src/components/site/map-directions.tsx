import { ExternalLink, Navigation } from "lucide-react";

import { directionsUrls, addressDirectionsUrls, mapSearchUrl } from "@/lib/maps";

const PILL =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-line bg-card px-3.5 text-xs text-ink-soft transition-colors hover:border-brand-300 hover:text-brand";

/*
 * MapDirections — the row under a map: "Directions" in the visitor's own maps
 * app (Google Maps, Apple Maps or Waze), plus a larger map. Neat pill buttons,
 * two by two on a phone. Pure links, so it renders in server and client
 * components. Pass `address` for a named place (geocoded precisely) or fall
 * back to coords.
 */
export function MapDirections({
  latitude,
  longitude,
  address,
  className = "",
}: {
  latitude: number;
  longitude: number;
  address?: string;
  className?: string;
}) {
  const { google, apple, waze } = address
    ? addressDirectionsUrls(address)
    : directionsUrls(latitude, longitude);
  const apps = [
    { href: google, label: "Google Maps" },
    { href: apple, label: "Apple Maps" },
    { href: waze, label: "Waze" },
  ];

  return (
    <div className={`grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center ${className}`}>
      <span className="col-span-2 inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft sm:mr-1">
        <Navigation size={12} className="text-sand" />
        Directions
      </span>
      {apps.map((a) => (
        <a key={a.label} href={a.href} target="_blank" rel="noreferrer" className={PILL}>
          {a.label}
        </a>
      ))}
      <a
        href={mapSearchUrl(latitude, longitude)}
        target="_blank"
        rel="noreferrer"
        className={`${PILL} sm:ml-auto`}
      >
        Larger map
        <ExternalLink size={12} />
      </a>
    </div>
  );
}
