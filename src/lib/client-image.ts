/*
 * Shrinking a photo in the browser, before it is uploaded.
 *
 * The server already re-encodes every photo it stores, but that happens after
 * the upload finishes — which is the wrong end of the problem when the photo is
 * 12MB and the connection is a Harare office line. Uploading twenty such photos
 * means a quarter of a gigabyte on the wire before anything gets compressed, and
 * the request is over the proxy's body limit long before it arrives.
 *
 * Doing it here instead turns each photo into a few hundred KB before it leaves
 * the machine. The upload is then fast, the size limits stop being reachable in
 * normal use, and the server-side pass becomes a safety net rather than the only
 * line of defence.
 *
 * Everything falls back to the original file. A slow upload beats a lost photo,
 * and the server will still re-encode whatever arrives.
 */

/** Matches the server's stored dimension, so this pass is the only resize. */
const MAX_EDGE = 1920;
/** Slightly above the server's 74: this is the last generation before storage. */
const QUALITY = 0.8;
/**
 * Below this, re-encoding is not worth it — the photo is already small enough
 * that the round trip through a canvas risks making it bigger, not smaller.
 */
const SKIP_UNDER_BYTES = 600 * 1024;

export type ShrinkResult = {
  file: File;
  /** Original size, so the caller can show what the compression achieved. */
  fromBytes: number;
  /** False when the original is being sent as-is. */
  changed: boolean;
};

function canvasFor(width: number, height: number) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  const el = document.createElement("canvas");
  el.width = width;
  el.height = height;
  return el;
}

async function toWebp(
  canvas: OffscreenCanvas | HTMLCanvasElement,
): Promise<Blob | null> {
  if ("convertToBlob" in canvas) {
    return canvas.convertToBlob({ type: "image/webp", quality: QUALITY });
  }
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", QUALITY),
  );
}

/**
 * Re-encode one image to a web-sized WebP, or return it untouched.
 *
 * Returns the original unchanged when the photo is already small, when the
 * browser cannot decode the format (HEIC off an iPhone decodes in Safari but
 * not in Chrome — those go up as-is and the server converts them), or when the
 * re-encode somehow came out larger.
 */
export async function shrinkImage(file: File): Promise<ShrinkResult> {
  const unchanged: ShrinkResult = { file, fromBytes: file.size, changed: false };
  if (file.size < SKIP_UNDER_BYTES) return unchanged;

  let bitmap: ImageBitmap | null = null;
  try {
    // `from-image` applies the EXIF orientation, so a photo taken in portrait
    // does not end up sideways — the same job `sharp().rotate()` does server
    // side, which would otherwise be skipped for anything we pre-encode here.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = canvasFor(width, height);
    const ctx = canvas.getContext("2d") as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null;
    if (!ctx) return unchanged;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await toWebp(canvas);
    // A photo that grew is a photo best left alone — small graphics and
    // screenshots can both come out worse through a lossy encoder.
    if (!blob || blob.size >= file.size) return unchanged;

    const name = file.name.replace(/\.[^.]+$/, "") || "photo";
    return {
      file: new File([blob], `${name}.webp`, { type: "image/webp" }),
      fromBytes: file.size,
      changed: true,
    };
  } catch {
    // Undecodable format, tainted canvas, out of memory — send the original.
    return unchanged;
  } finally {
    bitmap?.close();
  }
}

/**
 * Shrink a list of photos, a couple at a time.
 *
 * Sequential would be needlessly slow on a batch of twenty; all at once would
 * hold twenty decoded bitmaps in memory and stall the tab. Two at a time keeps
 * the picker responsive while still overlapping the work.
 */
export async function shrinkImages(
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<ShrinkResult[]> {
  const results: ShrinkResult[] = new Array(files.length);
  let next = 0;
  let done = 0;

  async function worker() {
    for (;;) {
      const index = next++;
      if (index >= files.length) return;
      results[index] = await shrinkImage(files[index]);
      onProgress?.(++done, files.length);
    }
  }

  await Promise.all([worker(), worker()]);
  return results;
}
