"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Expand, ImageOff } from "lucide-react";
import { mediaSrc } from "@/lib/media";

type GalleryImage = { url: string; alt: string | null };

export function Gallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [main, setMain] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

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
        <Image
          src={mediaSrc(images[main].url)}
          alt={images[main].alt ?? title}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 66vw"
          quality={60}
          className="object-cover"
        />
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
              onClick={() => setMain(i)}
              className={`relative aspect-square overflow-hidden rounded-lg bg-paper-2 ring-offset-2 transition ${
                main === i ? "ring-2 ring-brand" : "hover:opacity-80"
              }`}
            >
              <Image
                src={mediaSrc(img.url)}
                alt={img.alt ?? ""}
                fill
                sizes="120px"
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
              sizes="100vw"
              quality={60}
              className="object-contain"
            />
          </div>
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
