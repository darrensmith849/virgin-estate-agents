/*
 * Unpack a .zip of photos and videos in the browser, so a bundle someone sent
 * over WhatsApp or email can be added in one go.
 *
 * Reads the zip's table of contents (the central directory at the end) rather
 * than streaming through the whole thing, which means:
 *  - a file stored uncompressed is just a slice of the zip — instant, no copy;
 *  - a compressed one is unpacked by the browser's own native decompression
 *    (DecompressionStream), which is fast and doesn't freeze the page;
 *  - ZIP64 is understood, so single files over 2GB/4GB work.
 * Folders, macOS "__MACOSX" metadata and anything that isn't a photo or video
 * are skipped.
 *
 * `onProgress(0)` is reported the moment the zip could be opened. Until then
 * the computer may still be fetching it (a file kept in iCloud Drive is
 * downloaded in full before the first byte can be read), which the uploader
 * explains rather than showing a bar that never moves.
 */

import { abortable, throwIfCancelled } from "@/lib/client-cancel";

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

export function isZip(file: File): boolean {
  return (
    /\.zip$/i.test(file.name) ||
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed"
  );
}

type Entry = {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  localHeaderOffset: number;
};

async function bytes(blob: Blob, start: number, end: number): Promise<DataView> {
  return new DataView(await blob.slice(start, end).arrayBuffer());
}

/** Read a 64-bit little-endian integer as a (safe) JavaScript number. */
function u64(view: DataView, offset: number): number {
  return view.getUint32(offset, true) + view.getUint32(offset + 4, true) * 2 ** 32;
}

async function readDirectory(zip: Blob): Promise<Entry[]> {
  // The end-of-central-directory record sits in the last 64KB + 22 bytes.
  const tailStart = Math.max(0, zip.size - 65_557);
  const tail = await bytes(zip, tailStart, zip.size);
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a zip file.");

  let count = tail.getUint16(eocd + 10, true);
  let dirSize = tail.getUint32(eocd + 12, true);
  let dirOffset = tail.getUint32(eocd + 16, true);

  // ZIP64: the real figures live in a separate record, found via a locator
  // just before the end record.
  if (dirOffset === 0xffffffff || count === 0xffff || dirSize === 0xffffffff) {
    const locator = eocd - 20;
    if (locator >= 0 && tail.getUint32(locator, true) === 0x07064b50) {
      const recOffset = u64(tail, locator + 8);
      const rec = await bytes(zip, recOffset, recOffset + 56);
      if (rec.getUint32(0, true) === 0x06064b50) {
        count = u64(rec, 32);
        dirSize = u64(rec, 40);
        dirOffset = u64(rec, 48);
      }
    }
  }

  const dir = await bytes(zip, dirOffset, dirOffset + dirSize);
  const decoder = new TextDecoder();
  const entries: Entry[] = [];
  let p = 0;
  for (let n = 0; n < count && p + 46 <= dir.byteLength; n++) {
    if (dir.getUint32(p, true) !== 0x02014b50) break;
    const method = dir.getUint16(p + 10, true);
    let compressedSize = dir.getUint32(p + 20, true);
    let size = dir.getUint32(p + 24, true);
    const nameLen = dir.getUint16(p + 28, true);
    const extraLen = dir.getUint16(p + 30, true);
    const commentLen = dir.getUint16(p + 32, true);
    let localHeaderOffset = dir.getUint32(p + 42, true);
    const name = decoder.decode(new Uint8Array(dir.buffer, dir.byteOffset + p + 46, nameLen));

    // ZIP64 extra field: 64-bit values for whichever of the three overflowed.
    let e = p + 46 + nameLen;
    const extraEnd = e + extraLen;
    while (e + 4 <= extraEnd) {
      const id = dir.getUint16(e, true);
      const len = dir.getUint16(e + 2, true);
      if (id === 0x0001) {
        let q = e + 4;
        if (size === 0xffffffff) {
          size = u64(dir, q);
          q += 8;
        }
        if (compressedSize === 0xffffffff) {
          compressedSize = u64(dir, q);
          q += 8;
        }
        if (localHeaderOffset === 0xffffffff) localHeaderOffset = u64(dir, q);
      }
      e += 4 + len;
    }

    entries.push({ name, method, compressedSize, size, localHeaderOffset });
    p = extraEnd + commentLen;
  }
  return entries;
}

export async function unzipMedia(
  zip: File,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<{ files: File[]; skipped: string[] }> {
  const entries = await abortable(readDirectory(zip), signal);
  onProgress?.(0);
  const files: File[] = [];
  const skipped: string[] = [];

  const wanted = entries.filter((en) => {
    const base = en.name.split("/").pop() ?? en.name;
    if (en.name.endsWith("/") || en.name.startsWith("__MACOSX/") || base.startsWith(".")) {
      return false;
    }
    if (!TYPES[base.split(".").pop()?.toLowerCase() ?? ""]) {
      skipped.push(base);
      return false;
    }
    return true;
  });

  const totalBytes = wanted.reduce((n, en) => n + en.compressedSize, 0) || 1;
  let doneBytes = 0;

  for (const en of wanted) {
    throwIfCancelled(signal);
    const base = en.name.split("/").pop() ?? en.name;
    const type = TYPES[base.split(".").pop()!.toLowerCase()];
    try {
      // The data starts after the entry's local header (its own name/extra).
      const head = await abortable(
        bytes(zip, en.localHeaderOffset, en.localHeaderOffset + 30),
        signal,
      );
      if (head.getUint32(0, true) !== 0x04034b50) throw new Error("bad header");
      const start = en.localHeaderOffset + 30 + head.getUint16(26, true) + head.getUint16(28, true);
      const raw = zip.slice(start, start + en.compressedSize);

      let blob: Blob;
      if (en.method === 0) {
        blob = raw; // stored: the bytes are the file
      } else if (en.method === 8 && typeof DecompressionStream !== "undefined") {
        let seen = 0;
        const counted = raw.stream().pipeThrough(
          new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, ctl) {
              // Stops the read (and the decompression after it) on Cancel.
              throwIfCancelled(signal);
              seen += chunk.byteLength;
              onProgress?.(Math.min(1, (doneBytes + seen) / totalBytes));
              ctl.enqueue(chunk);
            },
          }),
        );
        blob = await abortable(
          new Response(
            counted.pipeThrough(new DecompressionStream("deflate-raw") as unknown as TransformStream<Uint8Array, Uint8Array>),
          ).blob(),
          signal,
        );
      } else {
        throw new Error(`unsupported compression ${en.method}`);
      }
      files.push(new File([blob], base, { type }));
    } catch (err) {
      if (signal?.aborted) throw err;
      skipped.push(base);
    }
    doneBytes += en.compressedSize;
    onProgress?.(Math.min(1, doneBytes / totalBytes));
  }
  return { files, skipped };
}
