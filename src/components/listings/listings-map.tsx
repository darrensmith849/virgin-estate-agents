"use client";

import { useState } from "react";
import Link from "next/link";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin } from "lucide-react";

import { formatPrice } from "@/lib/utils";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

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

function compactPrice(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

export function ListingsMap({ items }: { items: MapListing[] }) {
  const withCoords = items.filter(
    (i) => i.latitude != null && i.longitude != null,
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = withCoords.find((l) => l.id === activeId) ?? null;

  if (!TOKEN) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-paper-2 p-8 text-center">
        <MapPin size={28} className="text-sand" />
        <p className="mt-3 font-medium text-ink">Map view</p>
        <p className="mt-1 max-w-sm text-sm text-muted">
          The interactive map appears once a Mapbox token is configured
          (<code className="text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code>). Showing{" "}
          {withCoords.length} located {withCoords.length === 1 ? "property" : "properties"}.
        </p>
      </div>
    );
  }

  const center = withCoords[0]
    ? { longitude: withCoords[0].longitude!, latitude: withCoords[0].latitude! }
    : { longitude: 31.05, latitude: -17.82 };

  return (
    <div className="h-[70vh] overflow-hidden rounded-xl border border-line">
      <Map
        mapboxAccessToken={TOKEN}
        initialViewState={{ ...center, zoom: 11 }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: "100%", height: "100%" }}
        onClick={() => setActiveId(null)}
      >
        <NavigationControl position="top-right" />
        {withCoords.map((l) => (
          <Marker
            key={l.id}
            longitude={l.longitude!}
            latitude={l.latitude!}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setActiveId(l.id);
            }}
          >
            <button
              type="button"
              className="rounded-full bg-brand px-2.5 py-1 text-xs font-medium text-white shadow-md ring-2 ring-white transition-transform hover:scale-105"
            >
              {compactPrice(l.price)}
            </button>
          </Marker>
        ))}

        {active && active.longitude != null && active.latitude != null && (
          <Popup
            longitude={active.longitude}
            latitude={active.latitude}
            anchor="top"
            closeButton={false}
            offset={12}
            onClose={() => setActiveId(null)}
          >
            <Link href={`/listings/${active.slug}`} className="block p-1">
              <p className="text-sm font-medium text-ink">
                {formatPrice(active.price, { kind: active.kind, period: active.rentPeriod })}
              </p>
              <p className="text-xs text-muted">{active.title}</p>
              {active.suburb && (
                <p className="mt-0.5 text-xs text-brand">{active.suburb}</p>
              )}
            </Link>
          </Popup>
        )}
      </Map>
    </div>
  );
}
