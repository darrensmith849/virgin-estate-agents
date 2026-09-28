"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Star, Trash2, UploadCloud, GripVertical, Loader2, Play } from "lucide-react";

import {
  addListingImages,
  deleteListingImage,
  deleteListingVideo,
  reorderListingImages,
  setCoverImage,
} from "@/lib/actions/listings";
import { cn } from "@/lib/utils";
import { mediaSrc } from "@/lib/media";
import { shrinkImages } from "@/lib/client-image";
import { sendVideo } from "@/lib/client-video-upload";
import { compressAndUpload } from "@/lib/client-video-compress";
import { isZip, unzipMedia } from "@/lib/client-unzip";

type Img = { id: string; url: string; alt: string | null; isCover: boolean };
type Vid = { id: string; url: string; title: string | null; posterUrl?: string | null };
type VideoActivity = {
  id: string;
  name: string;
  stage: "uploading" | "processing" | "error";
  percent: number | null;
  interrupted?: boolean;
  error?: string;
};

/** A thin bar; with no figure it shows a gentle moving stripe instead. */
function ProgressBar({ value, className }: { value: number | null; className?: string }) {
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-line", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
    >
      {value === null ? (
        <div className="h-full w-1/3 animate-pulse rounded-full bg-brand/60" />
      ) : (
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      )}
    </div>
  );
}

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
  const [progress, setProgressText] = useState<string | null>(null);
  /** 0–100 for the progress bar, or null when there's no figure. */
  const [percent, setPercent] = useState<number | null>(null);
  /** Update the label and, when the label carries a percentage, the bar. */
  const setProgress = (text: string | null, pct?: number | null) => {
    setProgressText(text);
    const fromText = text ? /(\d+)%/.exec(text)?.[1] : undefined;
    setPercent(pct !== undefined ? pct : fromText !== undefined ? Number(fromText) : null);
  };
  const [error, setError] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(listingId ?? null);
  const [, startTransition] = useTransition();
  const dragIndex = useRef<number | null>(null);

  /** Videos the server is still receiving or finishing for this listing —
   *  from this page or any other — with real progress. */
  const [activity, setActivity] = useState<VideoActivity[]>([]);
  /** Bumped to start checking with the server again (e.g. after an upload). */
  const [pollKey, setPollKey] = useState(0);
  /** Server-side failures already shown, so each is reported only once. */
  const reportedFailures = useRef(new Set<string>());
  /** A file is being dragged over the box. */
  const [dragActive, setDragActive] = useState(false);

  /* Compressing and uploading happen in this page, so leaving mid-way would
     lose the video. Ask before it's closed. (Once uploaded, the server
     finishes on its own, so there's no need to stay.) */
  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  /* Keep the grid in step with the server: videos it has finished get added,
     and anything still arriving or being finished shows as a tile with its
     progress. Checks on load, and every few seconds while anything is live. */
  useEffect(() => {
    if (!currentId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let quietChecks = 0;
    const check = async () => {
      try {
        const res = await fetch(`/admin/api/upload/video?listing=${currentId}`, { cache: "no-store" });
        if (!res.ok || stopped) return;
        const data = (await res.json()) as { activity: VideoActivity[]; videos: Vid[] };
        setVideos((prev) => {
          const fresh = new Map(data.videos.map((v) => [v.id, v]));
          const known = new Set(prev.map((v) => v.id));
          const added = data.videos.filter((v) => !known.has(v.id));
          // Pick up preview pictures that arrived after the tile was shown.
          const gotPoster = prev.some((v) => !v.posterUrl && fresh.get(v.id)?.posterUrl);
          if (!added.length && !gotPoster) return prev;
          return [
            ...prev.map((v) => (v.posterUrl ? v : { ...v, posterUrl: fresh.get(v.id)?.posterUrl ?? null })),
            ...added,
          ];
        });
        setActivity(data.activity);
        // Report each failure once, not on every check.
        const failures = data.activity.filter(
          (a) => a.stage === "error" && a.error && !reportedFailures.current.has(a.id),
        );
        if (failures.length) {
          failures.forEach((a) => reportedFailures.current.add(a.id));
          setError(failures.map((a) => a.error).join(" "));
        }
        const live = data.activity.some((a) => a.stage !== "error");
        // Right after an upload the server may take a moment to list it, so
        // give it a few checks before going quiet.
        quietChecks = live ? 0 : quietChecks + 1;
        if (live || (pollKey > 0 && quietChecks < 3)) timer = setTimeout(check, 3000);
      } catch {
        if (!stopped) timer = setTimeout(check, 5000);
      }
    };
    check();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [currentId, pollKey]);

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
    let all = Array.from(files);
    let zipNote: string | null = null;

    // Unpack any .zip first: its photos and videos join the rest.
    const zips = all.filter(isZip);
    if (zips.length) {
      setUploading(true);
      const skipped: string[] = [];
      try {
        for (const zip of zips) {
          setProgress(`Unzipping ${zip.name}…`, 0);
          const out = await unzipMedia(zip, (f) =>
            setProgress(`Unzipping ${zip.name}… ${Math.round(f * 100)}%`),
          );
          all = [...all, ...out.files];
          skipped.push(...out.skipped);
        }
      } catch {
        setError("That zip file couldn't be opened. Try unzipping it and adding the files instead.");
      } finally {
        setUploading(false);
        setProgress(null);
      }
      all = all.filter((f) => !isZip(f));
      if (skipped.length) {
        zipNote =
          skipped.length === 1
            ? `Skipped 1 file in the zip that isn't a photo or video (${skipped[0]}).`
            : `Skipped ${skipped.length} files in the zip that aren't photos or videos.`;
      }
    }

    const imageFiles = all.filter((f) => f.type.startsWith("image/"));
    const videoFiles = all.filter((f) => f.type.startsWith("video/"));
    if (imageFiles.length === 0 && videoFiles.length === 0) {
      setError(zips.length ? "No photos or videos were found in that zip." : "Please choose image or video files.");
      return;
    }

    setError(null);
    if (zipNote) setError(zipNote);
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
         * Each video is first shrunk in the browser to 1080p H.264 (when the
         * browser can), then sent in pieces. Once the last piece is in, the
         * server finishes and attaches it on its own, so the button frees up
         * straight away and the admin can carry on or leave.
         */
        const listing = id;
        const problems: string[] = [];
        for (const [index, original] of videoFiles.entries()) {
          const label =
            videoFiles.length > 1 ? `video ${index + 1} of ${videoFiles.length}` : "video";
          try {
            setProgress(`Preparing ${label}…`);
            // Compress and upload at the same time where the browser can;
            // otherwise send the original as before.
            let uploadId = await compressAndUpload(original, `listings/${listing}`, (p) => {
              const pct = Math.round(p.converted * 100);
              setProgress(
                p.converted < 1
                  ? `Compressing & uploading ${label}… ${pct}%`
                  : `Uploading ${label}… ${p.sent} of ${p.produced}`,
              );
            });
            if (!uploadId) {
              uploadId = await sendVideo(original, `listings/${listing}`, (p) => {
                if (p.phase === "uploading") setProgress(`Uploading ${label}… ${p.percent}%`);
              });
            }
            // The server finishes and attaches it; the tiles below follow it.
            setPollKey((k) => k + 1);
          } catch (e) {
            problems.push(e instanceof Error ? e.message : `"${original.name}" failed to upload.`);
          }
        }
        if (problems.length > 0) setError(problems.join(" "));
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

  /** Only files dragged in from outside count — not photos being reordered. */
  const isFileDrag = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const liveActivity = activity.filter((a) => a.stage !== "error");
  const pendingCount = liveActivity.length;

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card p-6 transition-colors",
        dragActive ? "border-brand ring-2 ring-brand/30" : "border-line",
      )}
      onDragEnter={(e) => {
        if (isFileDrag(e) && !uploading) setDragActive(true);
      }}
      onDragOver={(e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = uploading ? "none" : "copy";
      }}
      onDragLeave={(e) => {
        // Leaving for a child element isn't leaving the box.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragActive(false);
      }}
      onDrop={(e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        setDragActive(false);
        if (!uploading) handleFiles(e.dataTransfer.files);
      }}
    >
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-brand-50/90">
          <p className="flex items-center gap-2 text-sm font-medium text-brand">
            <UploadCloud size={18} /> Drop photos or videos to add them
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg">Photos &amp; videos</h2>
          <p className="mt-1 text-sm text-muted">
            The first photo is the cover shown on the site · drag to reorder, or
            star a photo to move it to the front. Videos appear on the listing page.
            Drag files straight in from your computer (a .zip works too), or use the button.
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
      {uploading && (
        <div className="mt-4 rounded-lg border border-line bg-paper px-4 py-3">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink-soft">{progress ?? "Working…"}</span>
            {percent !== null && <span className="tabular-nums text-muted">{percent}%</span>}
          </div>
          <ProgressBar value={percent} className="mt-2" />
          <p className="mt-2 text-xs text-muted">
            Keep this page open until the upload finishes — the server does the rest.
          </p>
        </div>
      )}
      {!uploading && pendingCount > 0 && (
        <p className="mt-3 text-xs text-muted" role="status">
          {pendingCount === 1 ? "A video is" : `${pendingCount} videos are`} being finished on the
          server — you can carry on or leave this page; it will appear here when ready.
        </p>
      )}

      {images.length === 0 && videos.length === 0 && pendingCount === 0 ? (
        <button
          type="button"
          onClick={() => mediaInputRef.current?.click()}
          disabled={uploading}
          className="mt-5 flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-line px-6 py-10 text-center text-sm text-muted transition-colors hover:border-brand/40 hover:bg-paper-2"
        >
          <UploadCloud size={22} className="text-muted" />
          Drag photos, videos or a .zip here, or click to choose them.
        </button>
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
            {video.posterUrl ? (
              <Image
                src={mediaSrc(video.posterUrl)}
                alt=""
                fill
                sizes="200px"
                quality={50}
                className="object-cover"
              />
            ) : (
              // No picture yet: show a frame a second in (the very first is
              // often black) until the server has made one.
              <video
                src={`${video.url}#t=1`}
                preload="metadata"
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            )}
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white">
                <Play size={18} className="translate-x-px" fill="currentColor" />
              </span>
            </span>
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

        {liveActivity.map((a) => (
          <div
            key={a.id}
            className="relative flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-paper-2 px-4 text-center text-xs text-muted"
          >
            {!a.interrupted && <Loader2 size={18} className="animate-spin" />}
            <span className="line-clamp-2 text-ink-soft">{a.name}</span>
            {a.interrupted ? (
              <span className="text-amber">
                Upload stopped at {a.percent ?? 0}% — was the page closed? Please add it again.
              </span>
            ) : (
              <>
                <span>
                  {a.stage === "uploading"
                    ? `Uploading${a.percent !== null ? ` ${a.percent}%` : "…"}`
                    : a.percent === null
                      ? "Waiting to be processed…"
                      : `Processing ${a.percent}%`}
                </span>
                <ProgressBar value={a.percent} />
              </>
            )}
          </div>
        ))}

        </div>
      )}

      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*,.zip,application/zip"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
