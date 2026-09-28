/*
 * Unpack a .zip of photos and videos in the browser, so a bundle someone sent
 * over WhatsApp or email can be added in one go. Entries are read as the zip
 * streams in and folded into disk-backed Blobs as they grow, so even a
 * multi-gigabyte zip doesn't have to fit in memory. Folders, macOS "__MACOSX"
 * metadata and anything that isn't a photo or video are skipped.
 */

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  "3gp": "video/3gpp",
};

/** Hand accumulated pieces to a Blob every so often, to free the memory. */
const FOLD_BYTES = 64 * 1024 * 1024;

export function isZip(file: File): boolean {
  return (
    /\.zip$/i.test(file.name) ||
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed"
  );
}

export async function unzipMedia(
  zip: File,
  onProgress?: (fraction: number) => void,
): Promise<{ files: File[]; skipped: string[] }> {
  const { Unzip, UnzipInflate, UnzipPassThrough } = await import("fflate");
  const files: File[] = [];
  const skipped: string[] = [];
  const pending: Promise<void>[] = [];

  const unzip = new Unzip();
  unzip.register(UnzipPassThrough);
  unzip.register(UnzipInflate);
  unzip.onfile = (entry) => {
    const path = entry.name;
    const name = path.split("/").pop() ?? path;
    if (path.endsWith("/") || path.startsWith("__MACOSX/") || name.startsWith(".")) return;
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const type = TYPES[ext];
    if (!type) {
      skipped.push(name);
      return;
    }

    pending.push(
      new Promise<void>((resolve) => {
        let blob = new Blob([], { type });
        let parts: Uint8Array[] = [];
        let held = 0;
        entry.ondata = (err, data, final) => {
          if (err) {
            skipped.push(name);
            resolve();
            return;
          }
          if (data?.byteLength) {
            parts.push(data);
            held += data.byteLength;
          }
          if (held >= FOLD_BYTES || final) {
            blob = new Blob([blob, ...(parts as BlobPart[])], { type });
            parts = [];
            held = 0;
          }
          if (final) {
            files.push(new File([blob], name, { type }));
            resolve();
          }
        };
        try {
          entry.start();
        } catch {
          // A compression method the browser can't unpack (rare): skip it.
          skipped.push(name);
          resolve();
        }
      }),
    );
  };

  const reader = zip.stream().getReader();
  let read = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      unzip.push(new Uint8Array(0), true);
      break;
    }
    unzip.push(value);
    read += value.byteLength;
    onProgress?.(zip.size ? read / zip.size : 0);
  }
  await Promise.all(pending);
  return { files, skipped };
}
