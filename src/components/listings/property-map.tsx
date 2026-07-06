import { ExternalLink } from "lucide-react";

import { LeafletMap } from "@/components/listings/leaflet-map";
import { MapDirections } from "@/components/site/map-directions";
import { mapSearchUrl } from "@/lib/maps";

/*
 * PropertyMap — a single-location map that pinpoints a place using the clean,
 * premium CARTO "Positron" basemap (via LeafletMap, no access token), plus
 * "Get directions" links that open the visitor's own maps app.
 */
export function PropertyMap({
  latitude,
  longitude,
  label,
  directionsAddress,
}: {
  latitude: number;
  longitude: number;
  label?: string | null;
  /** When set, "Get directions" navigates to this address rather than coords. */
  directionsAddress?: string;
}) {
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-line shadow-sm">
        <LeafletMap
          latitude={latitude}
          longitude={longitude}
          label={label}
          className="h-72 w-full sm:h-80"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <MapDirections
          latitude={latitude}
          longitude={longitude}
          address={directionsAddress}
        />
        <a
          href={mapSearchUrl(latitude, longitude)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
        >
          View larger map
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
