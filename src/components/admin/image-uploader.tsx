"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Star, Trash2, UploadCloud, GripVertical, Loader2 } from "lucide-react";

import {
  addListingImages,
  deleteListingImage,
  reorderListingImages,
  setCoverImage,
} from "@/lib/actions/listings";
import { cn } from "@/lib/utils";

type Img = { id: string; url: string; alt: string | null; isCover: boolean };

export function ImageUploader({
  listingId,
  initialImages,
}: {
  listingId: string;
  initialImages: Img[];
}) {
  const [images, setImages] = useState<Img[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const dragIndex = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      fd.append("prefix", `listings/${listingId}`);

      const res = await fetch("/admin/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      const created = await addListingImages(listingId, data.files);
      setImages((prev) => [
        ...prev,
        ...created.map((c) => ({ id: c.id, url: c.url, alt: c.alt, isCover: c.isCover })),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDelete(id: string) {
    setImages((prev) => {
      const removed = prev.find((i) => i.id === id);
      let next = prev.filter((i) => i.id !== id);
      if (removed?.isCover && next.length) {
        next = next.map((i, idx) => ({ ...i, isCover: idx === 0 }));
      }
      return next;
    });
    startTransition(() => {
      deleteListingImage(id);
    });
  }

  function handleCover(id: string) {
    setImages((prev) => prev.map((i) => ({ ...i, isCover: i.id === id })));
    startTransition(() => {
      setCoverImage(listingId, id);
    });
  }

  function handleDrop(targetIndex: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === targetIndex) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(targetIndex, 0, moved);
      startTransition(() => {
        reorderListingImages(
          listingId,
          next.map((i) => i.id),
        );
      });
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-line bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg">Photos</h2>
          <p className="mt-1 text-sm text-muted">
            Drag to reorder · the starred image is the cover.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-[var(--radius)] bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, index) => (
          <div
            key={img.id}
            draggable
            onDragStart={() => (dragIndex.current = index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            className={cn(
              "group relative aspect-[4/3] overflow-hidden rounded-lg border bg-paper-2",
              img.isCover ? "border-brand ring-1 ring-brand" : "border-line",
            )}
          >
            <Image
              src={img.url}
              alt={img.alt ?? ""}
              fill
              sizes="200px"
              className="object-cover"
            />
            <div className="absolute left-1.5 top-1.5 rounded bg-black/40 p-1 text-white">
              <GripVertical size={14} />
            </div>
            {img.isCover && (
              <span className="absolute bottom-1.5 left-1.5 rounded bg-brand px-1.5 py-0.5 text-[0.65rem] font-medium text-white">
                Cover
              </span>
            )}
            <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {!img.isCover && (
                <button
                  type="button"
                  onClick={() => handleCover(img.id)}
                  title="Set as cover"
                  className="rounded bg-white/90 p-1.5 text-ink hover:bg-white"
                >
                  <Star size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(img.id)}
                title="Delete"
                className="rounded bg-white/90 p-1.5 text-red-600 hover:bg-white"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {/* Upload tile */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line text-muted transition-colors hover:border-brand-300 hover:text-ink"
        >
          {uploading ? (
            <Loader2 size={22} className="animate-spin" />
          ) : (
            <UploadCloud size={22} />
          )}
          <span className="text-xs">{uploading ? "Uploading…" : "Add photos"}</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
