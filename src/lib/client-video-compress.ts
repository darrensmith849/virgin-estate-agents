/*
 * Shrink a video in the browser while it uploads.
 *
 * Phone and camera footage is huge: a few minutes of 4K is gigabytes, and a
 * long 1080p tour can be too. Sending the original over an office line took
 * half an hour, then the server spent as long again re-encoding it. Modern
 * browsers can encode H.264 on the computer's own video hardware (WebCodecs),
 * so the clip is converted here to what the site actually shows — 1080p
 * H.264 — and each piece is uploaded the moment it is ready. Compressing and
 * uploading overlap, so the whole thing takes about as long as the slower of
 * the two rather than both added together, and nothing large is held in
 * memory, so long videos are fine.
 *
 * Every step is optional: if the browser can't do it, the file is already
 * small or web-ready, or anything goes wrong part-way, this returns null (after
 * cancelling anything half-sent) and the caller uploads the original as before.
 */

import type { Conversion } from "mediabunny";

import { UploadCancelled, abortable, throwIfCancelled } from "@/lib/client-cancel";
import { ChunkedUpload } from "@/lib/client-video-upload";

/** Below this, uploading as-is is quicker than converting. */
const MIN_BYTES = 40 * 1024 * 1024;
/** Nothing on the site displays larger than this on either edge. */
const MAX_EDGE = 1920;
/** Target bitrate at 1080p (scaled for smaller frames): sharp at the size the
 *  site shows video, and light enough to upload quickly. */
const BITRATE_1080P = 3_500_000;
const AUDIO_BITRATE = 128_000;
/** Already-web-ready H.264 at or below this bitrate is uploaded untouched. */
const OK_BITRATE = 5_000_000;

export type CompressProgress = {
  /** 0–1: how much of the video has been converted. */
  converted: number;
  /** Pieces uploaded so far, and produced so far. */
  sent: number;
  produced: number;
};

/**
 * Convert `file` and upload it as it goes. Resolves to the upload id (the
 * server then finishes and attaches it), or null if the original should be
 * uploaded instead. Throws UploadCancelled if `signal` fires, having stopped
 * the conversion and told the server to discard what it received.
 */
export async function compressAndUpload(
  file: File,
  prefix: string,
  onProgress: (p: CompressProgress) => void,
  signal?: AbortSignal,
): Promise<string | null> {
  throwIfCancelled(signal);
  if (file.size < MIN_BYTES) return null;
  if (typeof window === "undefined" || typeof VideoEncoder === "undefined") return null;

  let upload: ChunkedUpload | null = null;
  let conversion: Conversion | null = null;
  const onAbort = () => {
    void conversion?.cancel();
    void upload?.abort();
  };
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const mb = await import("mediabunny");
    const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
    // Reading the header can wait on the computer (a file still in iCloud,
    // say), so let Cancel through rather than waiting with it.
    const video = await abortable(input.getPrimaryVideoTrack(), signal);
    if (!video) return null;

    const [width, height, codec, duration] = await abortable(
      Promise.all([
        video.getDisplayWidth(),
        video.getDisplayHeight(),
        video.getCodec(),
        input.computeDuration(),
      ]),
      signal,
    );
    if (!width || !height || !duration) return null;

    // Already what the site needs: don't spend the user's time re-encoding.
    const sourceBitrate = (file.size * 8) / duration;
    if (codec === "avc" && Math.max(width, height) <= MAX_EDGE && sourceBitrate <= OK_BITRATE) {
      return null;
    }

    // Fit the long edge inside MAX_EDGE, keeping both sides even.
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const outW = Math.round((width * scale) / 2) * 2;
    const outH = Math.round((height * scale) / 2) * 2;
    const bitrate = Math.max(
      1_200_000,
      Math.round(BITRATE_1080P * ((outW * outH) / (1920 * 1080))),
    );
    const estimate = Math.round(((duration * (bitrate + AUDIO_BITRATE)) / 8) * 1.1);
    // Not worth it if the result wouldn't be clearly smaller.
    if (estimate > file.size * 0.8) return null;

    if (!(await mb.canEncodeVideo("avc", { width: outW, height: outH, bitrate }))) return null;

    // Everything checks out: open the upload, then stream into it.
    throwIfCancelled(signal);
    const base = file.name.replace(/\.[^.]+$/, "") || "video";
    upload = await ChunkedUpload.start({
      prefix,
      filename: `${base}.mp4`,
      type: "video/mp4",
      estimatedSize: estimate,
    });
    const target = upload;
    const chunkBytes = target.chunkBytes;

    // Collect the converter's output into upload-sized pieces. A fragmented
    // MP4 is written strictly front to back, so each full piece can go at once.
    let buffer = new Uint8Array(chunkBytes);
    let filled = 0;
    let written = 0;
    let produced = 0;
    let sent = 0;
    let converted = 0;
    const report = () => onProgress({ converted, sent, produced });
    const ship = async (bytes: Uint8Array) => {
      const index = produced++;
      report();
      await target.put(index, new Blob([bytes as BlobPart]), () => {
        sent++;
        report();
      });
    };

    const sink = new WritableStream<{ type: "write"; data: Uint8Array; position: number }>({
      async write(chunk) {
        if (chunk.position !== written) {
          throw new Error("Unexpected out-of-order write from the converter.");
        }
        let data = chunk.data;
        written += data.byteLength;
        while (data.byteLength > 0) {
          const take = Math.min(chunkBytes - filled, data.byteLength);
          buffer.set(data.subarray(0, take), filled);
          filled += take;
          data = data.subarray(take);
          if (filled === chunkBytes) {
            const full = buffer;
            buffer = new Uint8Array(chunkBytes);
            filled = 0;
            // Waits while the upload pipe is full — the converter slows to
            // match the network rather than piling data up in memory.
            await ship(full);
          }
        }
      },
    });

    const output = new mb.Output({
      format: new mb.Mp4OutputFormat({ fastStart: "fragmented" }),
      target: new mb.StreamTarget(sink),
    });
    conversion = await mb.Conversion.init({
      input,
      output,
      tracks: "primary",
      video: {
        codec: "avc",
        // Only one side is set so the other follows the true aspect ratio.
        ...(width >= height ? { width: outW } : { height: outH }),
        quality: new mb.Quality({ bitrate }),
        forceTranscode: true,
      },
      audio: { codec: "aac", quality: new mb.Quality({ bitrate: AUDIO_BITRATE }) },
      showWarnings: false,
    });

    // Never trade away the sound: if audio can't be carried over, let the
    // server do the whole job instead.
    const lostTrack = conversion.discardedTracks.some(
      (d) => d.reason !== "discarded_by_user" && d.reason !== "max_track_count_of_type_reached",
    );
    if (!conversion.isValid || lostTrack) {
      await upload.abort();
      return null;
    }
    throwIfCancelled(signal);

    conversion.onProgress = (fraction) => {
      converted = Math.min(1, Math.max(0, fraction));
      report();
    };
    await conversion.execute();
    throwIfCancelled(signal);

    // Send whatever is left as the final, shorter piece.
    if (filled > 0) await ship(buffer.slice(0, filled));
    if (written === 0) throw new Error("The converter produced nothing.");

    await upload.finish({ size: written, totalChunks: produced });
    console.log(
      `[video] ${file.name}: ${(file.size / 1048576).toFixed(0)}MB -> ${(written / 1048576).toFixed(0)}MB, compressed while uploading`,
    );
    return upload.id;
  } catch (err) {
    await upload?.abort();
    if (signal?.aborted) throw new UploadCancelled();
    console.warn("[video] in-browser compression unavailable, uploading the original:", err);
    return null;
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}
