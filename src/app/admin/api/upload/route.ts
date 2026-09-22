import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { listings } from "@/db/schema";
import { getStorage, storageKey } from "@/lib/storage";
import { prepareVideo } from "@/lib/video";

/*
 * Upload ceilings. Both must stay below Caddy's `request_body max_size` (110MB).
 *
 * The image cap is deliberately generous. Every photo is re-encoded to a
 * web-sized WebP further down, so a 24MP phone original costs a few seconds of
 * CPU and lands as a few hundred KB. The previous 8MB cap rejected precisely
 * the oversized photos the optimiser exists to fix, and all the agency saw for
 * it was "is larger than 8 MB".
 */
const MAX_IMAGE_BYTES = 30 * 1024 * 1024; // 30 MB per image
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB per video

/** Cap in the error message, derived so the text can't drift from the limit. */
function asMb(bytes: number): string {
  return `${Math.round(bytes / 1048576)} MB`;
}


/**
 * Alt text for an uploaded image.
 *
 * Filenames off a phone are noise — "WhatsApp Image 2026-09-15 at 10.23.45",
 * "IMG_4821", "PXL_20260915_081500" — and using them verbatim put that text on
 * the public page and into search results. Prefer the property's own title and
 * number the photos; only fall back to the filename when it actually reads like
 * a description.
 */
const JUNK_FILENAME =
  /^(whatsapp|img|image|photo|pxl|dsc|dcim|screenshot|signal|received|fb_img|inshot|scaled)(?![a-z])/i;

function altFor(knownListing: boolean, filename: string): string | null {
  // When the image belongs to a listing, store nothing: every render site falls
  // back to the listing's current title (`alt ?? title`), so the alt text tracks
  // renames instead of freezing whatever the title happened to be at upload.
  if (knownListing) return null;
  const base = filename.replace(/\.[^.]+$/, "").trim();
  if (!base || JUNK_FILENAME.test(base) || /^\d[\d._\s-]*$/.test(base)) return null;
  return base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}


/*
 * How a stored photo is encoded.
 *
 * These were 2400px at quality 82, which barely compressed the agency's actual
 * uploads: their photos arrive already downscaled (most are 1600px or less,
 * having been through WhatsApp), so the resize never fired, and quality 82 on
 * an already-lossy source spends most of its bytes preserving the previous
 * encoder's artefacts. Re-encoding the stored library at those settings saved
 * 2%. At these, 24%.
 *
 * 1920 is the widest the site ever renders, so it costs nothing visible while
 * still capping a large upload. `effort: 6` spends more CPU looking for a
 * smaller encoding — it is a one-off cost per upload and lossless in quality
 * terms. `smartSubsample` reduces chroma bleed at these quality levels.
 */
const MAX_EDGE = 1920;
const WEBP_QUALITY = 74;
const WEBP_EFFORT = 6;

/**
 * Re-encode an uploaded photo before it is stored.
 *
 * Previously the original went to disk untouched, so a listing held several
 * megabytes per photo and every view leaned on Next's optimiser to fix it at
 * request time. Doing it once here means the stored file is already web-sized.
 *
 * `rotate()` with no argument applies the EXIF orientation and then drops the
 * tag, which is what stops phone photos appearing on their side. Metadata is
 * not carried over — camera EXIF includes GPS coordinates, which have no
 * business being published on a property listing.
 *
 * Falls back to storing the original if anything goes wrong: an unconverted
 * photo is worth more to the agency than a failed upload.
 */
async function optimiseImage(
  input: ArrayBuffer,
  filename: string,
): Promise<{ data: Buffer | ArrayBuffer; filename: string; contentType: string }> {
  try {
    const sharp = (await import("sharp")).default;
    const data = await sharp(Buffer.from(input))
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT, smartSubsample: true })
      .toBuffer();

    const base = filename.replace(/\.[^.]+$/, "") || "photo";
    return { data, filename: `${base}.webp`, contentType: "image/webp" };
  } catch (err) {
    console.error("[upload] image optimisation failed, storing the original:", err);
    return { data: input, filename, contentType: "image/jpeg" };
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const prefix = (form.get("prefix") as string) || "misc";
  const mediaType = form.get("mediaType");
  const isVideoUpload = mediaType === "video";

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  /*
   * Sort the batch into what we can take and what we cannot, rather than
   * rejecting the lot.
   *
   * This used to return on the first offending file, so one oversized photo in
   * a selection of twenty threw away the other nineteen — and the message named
   * only the one file, which made it look as though nothing had been wrong with
   * the rest. Now the acceptable files are stored and the caller is told
   * precisely which ones were left behind.
   */
  const maxBytes = isVideoUpload ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  const accepted: File[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const isExpectedType = isVideoUpload
      ? file.type.startsWith("video/")
      : file.type.startsWith("image/");
    if (!isExpectedType) {
      skipped.push(`"${file.name}" is not ${isVideoUpload ? "a video" : "an image"}.`);
      continue;
    }
    if (file.size > maxBytes) {
      skipped.push(`"${file.name}" is larger than ${asMb(maxBytes)}.`);
      continue;
    }
    accepted.push(file);
  }

  if (accepted.length === 0) {
    return NextResponse.json(
      { error: skipped.join(" ") || "No usable files were provided." },
      { status: 413 },
    );
  }

  try {
    // The prefix is "listings/<uuid>"; use the property's title for alt text.
    const listingId = /^listings\/([0-9a-f-]{36})$/i.exec(prefix)?.[1];
    let listingTitle: string | null = null;
    if (listingId) {
      const row = await db.query.listings.findFirst({
        where: eq(listings.id, listingId),
        columns: { title: true },
      });
      listingTitle = row?.title?.trim() || null;
    }

    const storage = await getStorage();
    const uploaded: {
      key: string;
      url: string;
      alt: string | null;
      /** Set for videos when a still could be taken. */
      posterUrl?: string;
    }[] = [];

    for (const file of accepted) {
      const buf = await file.arrayBuffer();

      if (isVideoUpload) {
        const prepared = await prepareVideo(buf, file.name);
        const key = storageKey(prefix, prepared.filename);
        const res = await storage.put(key, prepared.data, prepared.contentType);
        console.log(
          `[upload] video ${prepared.action}: ${(buf.byteLength / 1048576).toFixed(1)}MB -> ` +
            `${(prepared.data.byteLength / 1048576).toFixed(1)}MB`,
        );

        // Store the still alongside the clip, under a matching key, so a
        // gallery has something to show before anyone presses play.
        let posterUrl: string | undefined;
        if (prepared.poster) {
          const posterRes = await storage.put(
            key.replace(/\.[^.]+$/, "") + "-poster.webp",
            prepared.poster.data,
            prepared.poster.contentType,
          );
          posterUrl = posterRes.url;
        }

        uploaded.push({
          ...res,
          alt: altFor(Boolean(listingTitle), file.name),
          posterUrl,
        });
        continue;
      }

      // Photos are re-encoded to a web-sized WebP.
      const prepared = await optimiseImage(buf, file.name);
      const key = storageKey(prefix, prepared.filename);
      const res = await storage.put(key, prepared.data, prepared.contentType);
      // Logged like videos are: when the agency reports photos being heavy,
      // this is the difference between evidence and inference.
      console.log(
        `[upload] image ${prepared.contentType === "image/webp" ? "optimised" : "original"}: ` +
          `${(buf.byteLength / 1048576).toFixed(2)}MB -> ` +
          `${(prepared.data.byteLength / 1048576).toFixed(2)}MB`,
      );
      uploaded.push({ ...res, alt: altFor(Boolean(listingTitle), file.name) });
    }

    if (uploaded.length === 0) {
      return NextResponse.json(
        { error: `No valid ${isVideoUpload ? "video" : "image"} files were provided.` },
        { status: 400 },
      );
    }

    return NextResponse.json({ files: uploaded, skipped });
  } catch (err) {
    // Always return JSON — an unhandled throw here produces an empty body,
    // which the client sees as "Unexpected end of JSON input".
    console.error("[upload] storage put failed:", err);
    return NextResponse.json(
      {
        error:
          "Media storage is not available. Files can't be saved until the media bucket (R2) is configured.",
      },
      { status: 500 },
    );
  }
}
