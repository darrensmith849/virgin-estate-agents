"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Star, Trash2, UploadCloud, GripVertical, Loader2 } from "lucide-react";

import {
  addListingImages,
  addListingVideos,
  deleteListingImage,
  deleteListingVideo,
  reorderListingImages,
  setCoverImage,
} from "@/lib/actions/listings";
import { cn } from "@/lib/utils";
import { mediaSrc } from "@/lib/media";
import { shrinkImages } from "@/lib/client-image";
import { uploadVideo } from "@/lib/client-video-upload";

type Img = { id: string; url: string; alt: string | null; isCover: boolean };
type Vid = { id: string; url: string; title: string | null };

export function ImageUploader({
  listingId,
  ensureListingId,
  initialImages,
  initialVideos,
}: {
  /** Existing listing id (edit page). May be null on a not-yet-saved listing. */
  listingId?: string | null;
  /** Lazily creates the listing on first upload and returns its id (new page). */
  ensureListingId?: () => Promise<string>;
  initialImages: Img[];
  initialVideos: Vid[];
}) {
  const [images, setImages] = useState<Img[]>(initialImages);
  const [videos, setVideos] = useState<Vid[]>(initialVideos);
  const [uploading, setUploading] = useState(false);
  /** What the button says while working — compressing, then uploading. */
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(listingId ?? null);
  const [, startTransition] = useTransition();
  const dragIndex = useRef<number | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  /*
   * Keep each request well under the proxy's 110MB body limit. Compressed
   * photos are a few hundred KB, so this only really bites on originals the
   * browser could not decode (HEIC in Chrome) and on videos.
   */
  const CHUNK_BYTES = 24 * 1024 * 1024;

  /** Split a list into requests that are each small enough to succeed. */
  function chunkBySize(files: File[]): File[][] {
    const chunks: File[][] = [];
    let current: File[] = [];
    let bytes = 0;
    for (const f of files) {
      // A single file over the budget still goes on its own — the server
      // decides whether it is acceptable, not us.
      if (current.length > 0 && bytes + f.size > CHUNK_BYTES) {
        chunks.push(current);
        current = [];
        bytes = 0;
      }
      current.push(f);
      bytes += f.size;
    }
    if (current.length > 0) chunks.push(current);
    return chunks;
  }

  async function postGroup(
    id: string,
    files: File[],
    mediaType: "image" | "video",
  ): Promise<{
    files: { key: string; url: string; alt: string | null }[];
    skipped: string[];
  }> {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.append("prefix", `listings/${id}`);
    fd.append("mediaType", mediaType);
    const res = await fetch("/admin/api/upload", { method: "POST", body: fd });

    /*
     * Read the body defensively. A request rejected by the proxy for being too
     * large never reaches the route, so it comes back with no JSON at all —
     * and parsing it first, before checking `res.ok`, used to surface
     * "Unexpected end of JSON input" to the user instead of anything about
     * the size of their photos.
     */
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const fromServer =
        body && typeof body === "object" && "error" in body
          ? String((body as { error: unknown }).error)
          : null;
      throw new Error(
        fromServer ??
          (res.status === 413
            ? "Those files were too large to send in one go. Try fewer at a time."
            : `Upload failed (${res.status}).`),
      );
    }
    const parsed = body as {
      files: { key: string; url: string; alt: string | null }[];
      skipped?: string[];
    };
    return { files: parsed.files, skipped: parsed.skipped ?? [] };
  }

  /** Upload in chunks, so one rejected file cannot take the rest with it. */
  async function uploadGroup(
    id: string,
    files: File[],
    mediaType: "image" | "video",
  ): Promise<{ key: string; url: string; alt: string | null }[]> {
    const chunks = chunkBySize(files);
    const out: { key: string; url: string; alt: string | null }[] = [];
    const problems: string[] = [];

    for (const [index, chunk] of chunks.entries()) {
      if (chunks.length > 1) {
        setProgress(`Uploading ${index + 1} of ${chunks.length}…`);
      }
      try {
        const result = await postGroup(id, chunk, mediaType);
        out.push(...result.files);
        // Files the server declined individually — named, so they can be fixed.
        problems.push(...result.skipped);
      } catch (e) {
        problems.push(e instanceof Error ? e.message : "Upload failed");
      }
    }

    // Partial success is still success: keep what landed, say what did not.
    if (problems.length > 0) {
      if (out.length === 0) throw new Error(problems[0]);
      setError(problems.join(" "));
    }
    return out;
  }

  // One picker for both — photos and videos are sorted by file type and each
  // group is uploaded separately (the endpoint validates one type per request).
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const all = Array.from(files);
    const imageFiles = all.filter((f) => f.type.startsWith("image/"));
    const videoFiles = all.filter((f) => f.type.startsWith("video/"));
    if (imageFiles.length === 0 && videoFiles.length === 0) {
      setError("Please choose image or video files.");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      // Ensure a listing exists to attach to (creates a draft on the new page).
      let id = currentId;
      if (!id) {
        if (!ensureListingId) throw new Error("No listing to attach media to.");
        id = await ensureListingId();
        setCurrentId(id);
      }

      if (imageFiles.length) {
        /*
         * Compress before uploading, not after. The server re-encodes whatever
         * arrives, but that is no help when the photo has to cross a slow line
         * first — this is what turns a 12MB original into a few hundred KB
         * before it leaves the machine.
         */
        setProgress(`Compressing 0 of ${imageFiles.length}…`);
        const shrunk = await shrinkImages(imageFiles, (done, total) =>
          setProgress(`Compressing ${done} of ${total}…`),
        );
        const saved =
          shrunk.reduce((n, r) => n + r.fromBytes - r.file.size, 0) / 1048576;
        if (saved > 0.5) {
          console.log(`[uploader] compressed before upload, saving ${saved.toFixed(1)}MB`);
        }
        setProgress("Uploading…");
        const created = await uploadGroup(id, shrunk.map((r) => r.file), "image");
        const added = await addListingImages(id, created);
        setImages((prev) => [
          ...prev,
          ...added.map((c) => ({ id: c.id, url: c.url, alt: c.alt, isCover: c.isCover })),
        ]);
      }
      if (videoFiles.length) {
        /*
         * Videos go one at a time through the chunked endpoint, which has no
         * 100MB ceiling and compresses in the background — the regular route
         * can't take a large HD clip in a single request.
         */
        const created: { key: string; url: string; alt: string | null }[] = [];
        const problems: string[] = [];
        for (const [index, file] of videoFiles.entries()) {
          const label =
            videoFiles.length > 1 ? `video ${index + 1} of ${videoFiles.length}` : "video";
          try {
            created.push(
              await uploadVideo(file, `listings/${id}`, (p) =>
                setProgress(
                  p.phase === "uploading"
                    ? `Uploading ${label}… ${p.percent}%`
                    : `Optimising ${label}… (can take a few minutes)`,
                ),
              ),
            );
          } catch (e) {
            problems.push(e instanceof Error ? e.message : `"${file.name}" failed to upload.`);
          }
        }
        if (problems.length > 0) {
          if (created.length === 0) throw new Error(problems.join(" "));
          setError(problems.join(" "));
        }
        const added = await addListingVideos(
          id,
          created.map((file) => ({ ...file, title: file.alt })),
        );
        setVideos((prev) => [
          ...prev,
          ...added.map((video) => ({ id: video.id, url: video.url, title: video.title })),
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(null);
      if (mediaInputRef.current) mediaInputRef.current.value = "";
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

  function handleDeleteVideo(id: string) {
    setVideos((prev) => prev.filter((video) => video.id !== id));
    startTransition(() => {
      deleteListingVideo(id);
    });
  }

  function handleCover(id: string) {
    if (!currentId) return;
    const listing = currentId;
    // Cover = first photo, so making a photo the cover moves it to the front.
    setImages((prev) => {
      const chosen = prev.find((i) => i.id === id);
      if (!chosen) return prev;
      const rest = prev.filter((i) => i.id !== id);
      return [chosen, ...rest].map((img, idx) => ({ ...img, isCover: idx === 0 }));
    });
    startTransition(() => {
      setCoverImage(listing, id);
    });
  }

  function handleDrop(targetIndex: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === targetIndex || !currentId) return;
    const id = currentId;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(targetIndex, 0, moved);
      // The first photo is the cover — keep the badge in sync with the order.
      const reordered = next.map((img, idx) => ({ ...img, isCover: idx === 0 }));
      startTransition(() => {
        reorderListingImages(
          id,
          reordered.map((i) => i.id),
        );
      });
      return reordered;
    });
  }

  return (
    <div className="rounded-xl border border-line bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg">Photos &amp; videos</h2>
          <p className="mt-1 text-sm text-muted">
            The first photo is the cover shown on the site · drag to reorder, or
            star a photo to move it to the front. Videos appear on the listing page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => mediaInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-line px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-paper-2 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <UploadCloud size={15} />
          )}
          {uploading ? (progress ?? "Uploading…") : "Add photos & videos"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-[var(--radius)] bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {images.length === 0 && videos.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
          No photos or videos yet — use the “Add photos &amp; videos” button above.
        </p>
      ) : (
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
              src={mediaSrc(img.url)}
              alt={img.alt ?? ""}
              fill
              sizes="200px"
              quality={50}
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

        {videos.map((video) => (
          <div
            key={video.id}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-black"
          >
            <video
              src={video.url}
              preload="metadata"
              muted
              className="h-full w-full object-cover"
            />
            <span className="absolute left-1.5 top-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[0.65rem] font-medium text-white">
              Video
            </span>
            <button
              type="button"
              onClick={() => handleDeleteVideo(video.id)}
              title="Delete video"
              className="absolute right-1.5 top-1.5 rounded bg-white/90 p-1.5 text-red-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white"
            >
              <Trash2 size={14} />
            </button>
            {video.title && (
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-xs text-white">
                {video.title}
              </span>
            )}
          </div>
        ))}

        </div>
      )}

      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
