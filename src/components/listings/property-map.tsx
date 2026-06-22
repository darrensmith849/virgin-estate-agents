"use client";

import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin } from "lucide-react";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function PropertyMap({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label?: string | null;
}) {
  if (!TOKEN) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-paper-2 text-center">
        <MapPin size={24} className="text-sand" />
        <p className="mt-2 text-sm text-muted">{label ?? "Location"}</p>
        <p className="text-xs text-muted/70">Map appears once Mapbox is configured.</p>
      </div>
    );
  }

  return (
    <div className="h-72 overflow-hidden rounded-xl border border-line">
      <Map
        mapboxAccessToken={TOKEN}
        initialViewState={{ latitude, longitude, zoom: 14 }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
        <Marker latitude={latitude} longitude={longitude} anchor="bottom">
          <MapPin size={32} className="fill-brand text-brand drop-shadow" />
        </Marker>
      </Map>
    </div>
  );
}
