import "server-only";
import { execFile, spawn } from "node:child_process";
import { mkdtemp, open, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Run ffmpeg at low priority on Linux. Compressing a long 4K video keeps every
 * core busy for many minutes, and the production server hosts other sites that
 * shouldn't slow down while it does.
 */
function ffmpeg(
  args: string[],
  opts: { timeout: number; maxBuffer: number; duration?: number | null; onProgress?: (f: number) => void },
): Promise<void> {
  const { duration, onProgress, timeout } = opts;
  // Machine-readable progress on stdout: "out_time_us=…" lines as it works.
  const fullArgs = onProgress && duration ? ["-progress", "pipe:1", "-nostats", ...args] : args;
  const [cmd, cmdArgs] =
    process.platform === "linux" ? ["nice", ["-n", "15", "ffmpeg", ...fullArgs]] : ["ffmpeg", fullArgs];

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    let pending = "";
    child.stdout.on("data", (buf: Buffer) => {
      if (!onProgress || !duration) return;
      pending += buf.toString();
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        const m = /^out_time_us=(\d+)/.exec(line);
        if (m) onProgress(Math.min(1, Number(m[1]) / 1e6 / duration));
      }
    });
    child.stderr.on("data", (buf: Buffer) => {
      stderr = (stderr + buf.toString()).slice(-4000);
    });
    const timer = setTimeout(() => child.kill("SIGKILL"), timeout);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg ${signal ? `killed (${signal})` : `exited ${code}`}: ${stderr.slice(-600)}`));
    });
  });
}

/*
 * Preparing an uploaded video for the web.
 *
 * Phone clips are large and, worse, often have their metadata at the end of the
 * file, which means a browser has to download the whole thing before it can
 * start playing. Two problems, two fixes:
 *
 *  - Always move the metadata to the front (`+faststart`), so playback and
 *    seeking start immediately.
 *  - Re-encode only when the clip is genuinely oversized, since re-encoding is
 *    slow and lossy. A clip already within bounds is remuxed without touching
 *    the picture, which takes a second or two rather than a minute.
 *
 * A poster frame is pulled out either way, so galleries have something to show
 * before anyone presses play.
 *
 * Every step falls back to the original file. A large video is worth more to
 * the agency than a failed upload.
 */

/** 8-bit 4:2:0 plays everywhere; 10-bit (HDR) H.264 does not. */
const WEB_SAFE_PIXEL_FORMATS = new Set(["yuv420p", "yuvj420p"]);
/** Above this (bits per second), a large clip is worth shrinking. */
const MAX_BITRATE = 10_000_000;
/** Below this size, a clip is left alone whatever its bitrate. */
const TRANSCODE_OVER_BYTES = 24 * 1024 * 1024;
/** Nothing on the site displays larger than this on either edge. */
const MAX_EDGE = 1920;
/** Hard ceiling on ffmpeg, so a request can't hang indefinitely. */
const FFMPEG_TIMEOUT_MS = 150_000;

export type PreparedVideo = {
  data: Buffer;
  filename: string;
  contentType: string;
  /** JPEG/WebP still from the start of the clip, when one could be taken. */
  poster: { data: Buffer; contentType: string } | null;
  /** What was actually done, for logging. */
  action: "transcoded" | "remuxed" | "original";
};

/** Like PreparedVideo, but the result is a file on disk rather than in memory. */
export type PreparedVideoFile = Omit<PreparedVideo, "data"> & {
  /** True when processing broke and the untouched original is being returned
   *  as a fallback — as opposed to an original kept because it was already
   *  as good as it gets. */
  failed?: boolean;
  /** Path of the file to store: the processed output, or the source itself. */
  file: string;
  bytes: number;
};

export type ProbeResult = {
  width: number | null;
  height: number | null;
  codec: string | null;
  pixFmt: string | null;
  /** Seconds. */
  duration: number | null;
  /** Bits per second, overall. */
  bitRate: number | null;
};

export async function probe(file: string): Promise<ProbeResult> {
  const none: ProbeResult = {
    width: null, height: null, codec: null, pixFmt: null, duration: null, bitRate: null,
  };
  try {
    const { stdout } = await run(
      "ffprobe",
      [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=codec_name,width,height,pix_fmt:format=duration,bit_rate",
        "-of", "json",
        file,
      ],
      { timeout: 15_000 },
    );
    const data = JSON.parse(String(stdout)) as {
      streams?: { codec_name?: string; width?: number; height?: number; pix_fmt?: string }[];
      format?: { duration?: string; bit_rate?: string };
    };
    const stream = data.streams?.[0];
    const num = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    return {
      width: num(stream?.width),
      height: num(stream?.height),
      codec: stream?.codec_name?.toLowerCase() ?? null,
      pixFmt: stream?.pix_fmt ?? null,
      duration: num(data.format?.duration),
      bitRate: num(data.format?.bit_rate),
    };
  } catch {
    return none;
  }
}

/** Whether an MP4 is fragmented (has movie-fragment boxes near the start). */
async function isFragmented(file: string): Promise<boolean> {
  try {
    const fh = await open(file, "r");
    try {
      const head = Buffer.alloc(4 * 1024 * 1024);
      const { bytesRead } = await fh.read(head, 0, head.length, 0);
      return head.subarray(0, bytesRead).includes("moof");
    } finally {
      await fh.close();
    }
  } catch {
    return false;
  }
}

/* Codecs that can be dropped into an MP4 container without re-encoding. Copying
 * anything else fails outright — a WebM's VP8/Opus cannot be remuxed into MP4,
 * which is exactly how the first version of this broke. */
const MP4_SAFE_VIDEO = new Set(["h264", "avc1"]);

function transcodeArgs(src: string, out: string): string[] {
  return [
    "-y", "-i", src,
    /*
     * Fit the long edge inside MAX_EDGE, scaling down only; -2 keeps the other
     * side even, which H.264 requires. Bounding the long edge rather than the
     * width matters for phone clips shot upright: a portrait 4K clip is
     * 2160x3840, and capping only the width left it at 1920x3413.
     *
     * format=yuv420p: iPhone HDR clips are 10-bit, and x264 carries that
     * through as a High 10 stream that Chrome, Firefox and most Android
     * phones refuse to play. 8-bit 4:2:0 plays everywhere.
     */
    "-vf",
    `scale='if(gte(iw,ih),min(${MAX_EDGE},iw),-2)':'if(gte(iw,ih),-2,min(${MAX_EDGE},ih))',format=yuv420p`,
    "-c:v", "libx264", "-preset", "superfast", "-crf", "28",
    "-profile:v", "high", "-level:v", "4.1",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart",
    out,
  ];
}

/**
 * Prepare a video that is already on disk. Used directly by the chunked upload
 * path, where the clip can be far too large to hold in memory.
 *
 * `workDir` must be a private scratch directory; outputs are written there and
 * left for the caller to clean up.
 */
export async function prepareVideoFile(
  src: string,
  filename: string,
  workDir: string,
  opts: { timeoutMs?: number; onProgress?: (fraction: number) => void } = {},
): Promise<PreparedVideoFile> {
  const timeout = opts.timeoutMs ?? FFMPEG_TIMEOUT_MS;
  const onProgress = opts.onProgress;
  const srcBytes = (await stat(src)).size;
  const original: PreparedVideoFile = {
    file: src,
    bytes: srcBytes,
    filename,
    contentType: "video/mp4",
    poster: null,
    action: "original",
  };

  try {
    const out = path.join(workDir, "out.mp4");
    const posterFile = path.join(workDir, "poster.webp");

    const { width, height, codec, pixFmt, bitRate, duration } = await probe(src);
    const longEdge = Math.max(width ?? 0, height ?? 0);
    /*
     * Re-encode when the clip is oversized, too wide, or in a codec that can't
     * live in an MP4. That last case covers two common uploads: WebM from a
     * browser, and HEVC from an iPhone — the latter plays on Safari but not in
     * Chrome or on most Android phones, so converting it is a compatibility fix
     * as much as a size one.
     */
    /*
     * Re-encode only when the clip genuinely needs it. A clip that is already
     * 8-bit H.264, no larger than the site shows and at a sensible bitrate —
     * which is what the admin's browser now produces before uploading — only
     * needs its metadata moved to the front, which takes seconds.
     */
    const needsReencode =
      codec === null ||
      !MP4_SAFE_VIDEO.has(codec) ||
      (pixFmt !== null && !WEB_SAFE_PIXEL_FORMATS.has(pixFmt)) ||
      longEdge > MAX_EDGE ||
      (srcBytes > TRANSCODE_OVER_BYTES && (bitRate ?? 0) > MAX_BITRATE);
    let transcoded = needsReencode;

    if (needsReencode) {
      await ffmpeg(transcodeArgs(src, out), { timeout, maxBuffer: 1 << 24, duration, onProgress });
    } else {
      try {
        // No re-encode: copy the streams and just relocate the metadata.
        await ffmpeg(
          ["-y", "-i", src, "-c", "copy", "-movflags", "+faststart", out],
          { timeout, maxBuffer: 1 << 24, duration, onProgress },
        );
      } catch {
        // H.264 picture but an audio track MP4 can't carry (PCM from some
        // cameras): copying fails, re-encoding doesn't.
        await ffmpeg(transcodeArgs(src, out), { timeout, maxBuffer: 1 << 24, duration, onProgress });
        transcoded = true;
      }
    }
    const outBytes = (await stat(out)).size;

    // A remux that somehow grew the file isn't worth keeping — except when the
    // source is a fragmented MP4 (what the browser streams up while it
    // compresses): a plain MP4 plays and seeks more reliably everywhere, and
    // the few extra bytes are worth it.
    const useProcessed = transcoded || outBytes <= srcBytes || (await isFragmented(src));

    let poster: PreparedVideo["poster"] = null;
    try {
      await run(
        "ffmpeg",
        // Seek a fraction in rather than a full second: a short clip has
        // no frame at 1s and the extraction would fail.
        ["-y", "-ss", "00:00:00.3", "-i", src, "-frames:v", "1",
         "-vf", `scale='min(1280,iw)':-2`, posterFile],
        { timeout: 30_000, maxBuffer: 1 << 24 },
      );
      poster = { data: await readFile(posterFile), contentType: "image/webp" };
    } catch {
      // Clips shorter than a second, or an odd codec — not worth failing over.
    }

    const base = filename.replace(/\.[^.]+$/, "") || "video";
    return useProcessed
      ? {
          file: out,
          bytes: outBytes,
          filename: `${base}.mp4`,
          contentType: "video/mp4",
          poster,
          action: transcoded ? "transcoded" : "remuxed",
        }
      : { ...original, poster };
  } catch (err) {
    console.error("[upload] video preparation failed, storing the original:", err);
    return { ...original, failed: true };
  }
}

export async function prepareVideo(
  input: ArrayBuffer,
  filename: string,
): Promise<PreparedVideo> {
  const original: PreparedVideo = {
    data: Buffer.from(input),
    filename,
    contentType: "video/mp4",
    poster: null,
    action: "original",
  };

  let dir: string | null = null;
  try {
    dir = await mkdtemp(path.join(tmpdir(), "vea-video-"));
    const ext = (filename.match(/\.([a-z0-9]+)$/i)?.[1] ?? "mp4").toLowerCase();
    const src = path.join(dir, `in.${ext}`);
    await writeFile(src, Buffer.from(input));

    const prepared = await prepareVideoFile(src, filename, dir);
    if (prepared.action === "original") return { ...original, poster: prepared.poster };
    const { file, bytes: _bytes, ...rest } = prepared;
    return { ...rest, data: await readFile(file) };
  } catch (err) {
    console.error("[upload] video preparation failed, storing the original:", err);
    return original;
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
