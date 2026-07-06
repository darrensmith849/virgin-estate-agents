import { Navigation } from "lucide-react";

import { directionsUrls, addressDirectionsUrls } from "@/lib/maps";

/*
 * MapDirections — a compact "Get directions" row that opens the location in the
 * visitor's preferred maps app (Google Maps, Apple Maps or Waze) for live
 * navigation. Pure links, so it renders in both server and client components.
 * Pass `address` for a named place (geocoded precisely) or fall back to coords.
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
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs ${className}`}
    >
      <span className="inline-flex items-center gap-1.5 font-medium text-ink-soft">
        <Navigation size={12} className="text-sand" />
        Get directions
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {apps.map((a) => (
          <a
            key={a.label}
            href={a.href}
            target="_blank"
            rel="noreferrer"
            className="text-muted underline-offset-2 transition-colors hover:text-brand hover:underline"
          >
            {a.label}
          </a>
        ))}
      </span>
    </div>
  );
}
