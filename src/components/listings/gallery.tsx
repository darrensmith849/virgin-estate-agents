"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Expand, ImageOff } from "lucide-react";
import { mediaSrc } from "@/lib/media";

type GalleryImage = { url: string; alt: string | null };

export function Gallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [main, setMain] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  /** Where a swipe in the viewer started. */
  const touchX = useRef<number | null>(null);

  const close = useCallback(() => setLightbox(null), []);
  const go = useCallback(
    (dir: 1 | -1) =>
      setLightbox((i) =>
        i === null ? i : (i + dir + images.length) % images.length,
      ),
    [images.length],
  );

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, close, go]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-paper-2 text-muted">
        <ImageOff size={32} />
      </div>
    );
  }

  return (
    <>
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-paper-2">
        {/* The whole photo opens the viewer, not just the button on it. */}
        <button
          type="button"
          onClick={() => setLightbox(main)}
          aria-label={`Open photo ${main + 1} of ${images.length} full screen`}
          className="group absolute inset-0 block cursor-zoom-in"
        >
          <Image
            src={mediaSrc(images[main].url)}
            alt={images[main].alt ?? title}
            fill
            preload
            sizes="(max-width: 1024px) 100vw, 66vw"
            quality={60}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.015]"
          />
        </button>
        <button
          type="button"
          onClick={() => setLightbox(main)}
          className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3.5 py-2 text-sm text-white backdrop-blur transition-colors hover:bg-black/70"
        >
          <Expand size={15} /> {images.length} photos
        </button>
      </div>

      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2 sm:gap-3">
          {images.slice(0, 5).map((img, i) => (
            <button
              key={i}
              type="button"
              // The "+N" tile opens the viewer to see the rest.
              onClick={() => (i === 4 && images.length > 5 ? setLightbox(4) : setMain(i))}
              className={`relative aspect-square overflow-hidden rounded-lg bg-paper-2 ring-offset-2 transition ${
                main === i ? "ring-2 ring-brand" : "hover:opacity-80"
              }`}
            >
              <Image
                src={mediaSrc(img.url)}
                alt={img.alt ?? ""}
                fill
                // Square tiles cropped from landscape photos need roughly
                // twice their width in pixels, or they come out soft.
                sizes="(max-width: 640px) 34vw, 260px"
                quality={50}
                className="object-cover"
              />
              {i === 4 && images.length > 5 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
                  +{images.length - 5}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — photo ${lightbox + 1} of ${images.length}`}
          // Swipe left or right on a phone to move between photos.
          onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            const start = touchX.current;
            touchX.current = null;
            const end = e.changedTouches[0]?.clientX;
            if (start === null || end === undefined || Math.abs(end - start) < 50) return;
            go(end < start ? 1 : -1);
          }}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X size={24} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-4 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Previous"
          >
            <ChevronLeft size={28} />
          </button>
          <div
            className="relative h-[80vh] w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={mediaSrc(images[lightbox].url)}
              alt={images[lightbox].alt ?? title}
              fill
              loading="eager"
              sizes="100vw"
              quality={60}
              className="object-contain"
            />
          </div>
          {/* Load the photos either side now, so moving to them is instant. */}
          {images.length > 1 &&
            [1, -1].map((d) => {
              const i = (lightbox + d + images.length) % images.length;
              return (
                <div key={d} className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0" aria-hidden>
                  <Image src={mediaSrc(images[i].url)} alt="" fill sizes="100vw" quality={60} loading="eager" />
                </div>
              );
            })}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-4 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Next"
          >
            <ChevronRight size={28} />
          </button>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm text-white/70">
            {lightbox + 1} / {images.length}
          </span>
        </div>
      )}
    </>
  );
}
