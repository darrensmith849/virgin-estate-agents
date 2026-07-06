"use client";

import { useRef, useState } from "react";
import { MapPin, ArrowRight, X, ExternalLink } from "lucide-react";

import { LeafletMap } from "@/components/listings/leaflet-map";
import { MapDirections } from "@/components/site/map-directions";
import { mapSearchUrl } from "@/lib/maps";

/*
 * OfficeMapDialog — renders the office address as a button that opens a small
 * popup with the premium CARTO map (via LeafletMap, no token). The map only
 * mounts once the dialog is opened, so it adds no cost to pages where it's
 * never used. Native <dialog> gives us focus-trapping, Escape-to-close and a
 * backdrop for free.
 */
export function OfficeMapDialog({
  address,
  latitude,
  longitude,
  label,
}: {
  address: string;
  latitude: number;
  longitude: number;
  label?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  const show = () => {
    setOpen(true);
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="group flex items-start gap-3 text-left transition-colors hover:text-ink"
      >
        <MapPin size={16} className="mt-0.5 shrink-0 text-sand" />
        <span className="leading-relaxed">
          {address}
          <span className="mt-1 flex items-center gap-1 text-xs font-medium text-sand transition-colors group-hover:text-brand">
            View on map
            <ArrowRight
              size={12}
              className="transition-transform duration-300 ease-out group-hover:translate-x-0.5"
            />
          </span>
        </span>
      </button>

      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
        className="fixed left-1/2 top-1/2 m-0 max-h-[85vh] w-[min(92vw,34rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-line bg-card p-0 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0 leading-tight">
            <p className="font-serif text-base text-ink">{label ?? "Find us"}</p>
            <p className="truncate text-xs text-muted">{address}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close map"
            className="-mr-1 shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-paper-2 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="h-64 w-full sm:h-72">
          {open && (
            <LeafletMap
              latitude={latitude}
              longitude={longitude}
              label={label ?? address}
              className="h-full w-full"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line px-5 py-3">
          <MapDirections
            latitude={latitude}
            longitude={longitude}
            address={address}
          />
          <a
            href={mapSearchUrl(latitude, longitude)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
          >
            View larger map
            <ExternalLink size={12} />
          </a>
        </div>
      </dialog>
    </>
  );
}
