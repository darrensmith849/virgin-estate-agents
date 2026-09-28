/*
 * Shrink a video in the browser before it is uploaded.
 *
 * Phone and camera footage is huge: a few minutes of 4K is gigabytes, and
 * sending that over an office line took half an hour before the server could
 * even start on it — and then the server spent as long again re-encoding it.
 * Modern browsers can encode H.264 on the computer's own video hardware
 * (WebCodecs), so the clip is converted here to what the site actually shows —
 * 1080p H.264 — and only that is uploaded. The server then just checks and
 * stores it.
 *
 * Every step is optional: if the browser can't do it, the file is small
 * already, or anything at all goes wrong, this returns null and the original
 * is uploaded exactly as before.
 */

/** Below this, uploading as-is is quicker than converting. */
const MIN_BYTES = 40 * 1024 * 1024;
/** Nothing on the site displays larger than this on either edge. */
const MAX_EDGE = 1920;
/** Target bitrate at 1080p; scaled down for smaller frames. */
const BITRATE_1080P = 5_000_000;
/** Already-web-ready H.264 at or below this bitrate is left alone. */
const OK_BITRATE = 8_000_000;
/** The result is held in memory until uploaded, so keep it to a sane size. */
const MAX_OUTPUT_BYTES = 1.5 * 1024 * 1024 * 1024;

export async function compressVideoInBrowser(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<File | null> {
  if (file.size < MIN_BYTES) return null;
  if (typeof window === "undefined" || typeof VideoEncoder === "undefined") return null;

  try {
    const mb = await import("mediabunny");
    const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
    const video = await input.getPrimaryVideoTrack();
    if (!video) return null;

    const [width, height, codec, duration] = await Promise.all([
      video.getDisplayWidth(),
      video.getDisplayHeight(),
      video.getCodec(),
      input.computeDuration(),
    ]);
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
      1_500_000,
      Math.round(BITRATE_1080P * ((outW * outH) / (1920 * 1080))),
    );
    if ((duration * (bitrate + 160_000)) / 8 > MAX_OUTPUT_BYTES) return null;

    const canEncode = await mb.canEncodeVideo("avc", { width: outW, height: outH, bitrate });
    if (!canEncode) return null;

    const output = new mb.Output({
      format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }),
      target: new mb.BufferTarget(),
    });
    const conversion = await mb.Conversion.init({
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
      audio: { codec: "aac", quality: new mb.Quality({ bitrate: 128_000 }) },
      showWarnings: false,
    });

    // Never trade away the sound: if audio can't be carried over, let the
    // server do the whole job instead.
    const lostTrack = conversion.discardedTracks.some(
      (d) => d.reason !== "discarded_by_user" && d.reason !== "max_track_count_of_type_reached",
    );
    if (!conversion.isValid || lostTrack) return null;

    conversion.onProgress = (fraction) => onProgress(Math.min(1, Math.max(0, fraction)));
    await conversion.execute();

    const buffer = (output.target as InstanceType<typeof mb.BufferTarget>).buffer;
    if (!buffer || buffer.byteLength === 0 || buffer.byteLength >= file.size) return null;

    const base = file.name.replace(/\.[^.]+$/, "") || "video";
    return new File([buffer], `${base}.mp4`, { type: "video/mp4" });
  } catch (err) {
    console.warn("[video] in-browser compression unavailable, uploading the original:", err);
    return null;
  }
}
