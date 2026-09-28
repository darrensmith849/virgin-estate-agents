import "server-only";
import { mkdir, mkdtemp, open, readdir, readFile, rm, stat, statfs } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { listingVideos } from "@/db/schema";
import { ensureVideoTable } from "@/db/bootstrap";
import { getStorage, storageKey } from "@/lib/storage";
import { posterKeyFor, prepareVideoFile, probe } from "@/lib/video";

/*
 * Resumable video uploads.
 *
 * The regular upload route takes a whole file in one request and prepares it
 * while that request waits. That is fine for photos and short clips, but it is
 * what broke large HD videos:
 *
 *  - A single request can't be larger than Caddy's 110MB body limit, and a
 *    minute of 4K from a phone is several hundred MB.
 *  - One request carrying 80MB over an office line is a long time for nothing
 *    to go wrong; when something does, the whole upload starts again.
 *  - Re-encoding a long 4K clip takes longer than the 150s the route allows,
 *    so it fell back to storing the raw original — often HEVC or 10-bit HDR,
 *    which Chrome and most Android phones can't play at all.
 *
 * So the browser sends the file in small chunks (each retried on its own), the
 * chunks are written straight to disk, and once the last one lands the clip is
 * compressed in the background while the admin page polls for the result.
 *
 * State lives in this process's memory. The app runs as a single `next start`
 * process, and a restart mid-upload only costs that upload — the admin sees an
 * error and tries again.
 */

const GB = 1024 * 1024 * 1024;

/** Largest video accepted: a long 4K recording, or a full-length tour film.
 *  Whether there's room for it right now is checked separately (hasRoomFor). */
export const MAX_VIDEO_UPLOAD_BYTES = 10 * GB;
/** Above this, a video that failed to convert is refused rather than stored. */
const ORIGINAL_FALLBACK_MAX_BYTES = 200 * 1024 * 1024;
/** Disk always left free for the other sites on the same server. */
const DISK_RESERVE_BYTES = 5 * GB;
/** Largest single chunk the server takes; the browser sends 8MB. */
export const MAX_CHUNK_BYTES = 16 * 1024 * 1024;
/** Ceiling on the background compression of one clip: an hour, plus a minute
 *  for every 50MB beyond that, up to four hours for the very largest. */
function processTimeoutMs(bytes: number): number {
  const minutes = Math.min(240, Math.max(60, bytes / (50 * 1024 * 1024)));
  return Math.round(minutes * 60 * 1000); // execFile insists on a whole number
}
/** Abandoned uploads are swept after this long without activity. */
const IDLE_EXPIRY_MS = 6 * 60 * 60 * 1000;
/** An upload with no new piece for this long has been abandoned (the page was
 *  closed or lost its connection): clear it rather than show it as pending. */
const STALLED_UPLOAD_MS = 5 * 60 * 1000;
/** Finished or failed uploads stay reportable for this long. */
const REPORT_FOR_MS = 30 * 60 * 1000;
/** Uploads in flight at once. Each can be 2GB of scratch space. */
export const MAX_ACTIVE_UPLOADS = 4;

/** Scratch space. Override when /tmp is small or memory-backed (tmpfs). */
const SCRATCH_ROOT = path.join(
  process.env.VIDEO_UPLOAD_TMP || tmpdir(),
  "vea-video-uploads",
);

export type VideoUploadResult = {
  key: string;
  url: string;
  alt: string | null;
  posterUrl?: string;
  /** Set when the clip was attached to its listing here on the server. */
  video?: { id: string; url: string; title: string | null; posterUrl: string | null };
};

/** "listings/<uuid>" → the listing id, or null for any other prefix. */
function listingIdFrom(prefix: string): string | null {
  return /^listings\/([0-9a-f-]{36})$/i.exec(prefix)?.[1] ?? null;
}

type Session = {
  id: string;
  prefix: string;
  filename: string;
  alt: string | null;
  size: number;
  chunkBytes: number;
  totalChunks: number;
  received: Set<number>;
  /** Size of each piece that arrived, for checking a streamed upload at the end. */
  lengths: Map<number, number>;
  /** True while the browser is still producing the file (compress-as-you-go):
   *  the exact size and piece count are only known when it finishes. */
  streaming: boolean;
  dir: string;
  src: string;
  state: "receiving" | "processing" | "done" | "error";
  result?: VideoUploadResult;
  error?: string;
  touched: number;
  /** 0–1 through the server's own processing, when it reports it. */
  progress: number;
  /** Processing has actually begun (rather than waiting its turn). */
  running?: boolean;
  /** When it finished or failed, for reporting it back for a while after. */
  endedAt?: number;
};

// Kept on globalThis so dev-mode reloads don't orphan in-flight uploads.
const g = globalThis as unknown as {
  __veaVideoSessions?: Map<string, Session>;
  __veaVideoQueue?: Promise<void>;
  __veaVideoScratchCleaned?: boolean;
};
const sessions = (g.__veaVideoSessions ??= new Map<string, Session>());

/** Whether another upload can start right now. */
export function canStartVideoUpload(): boolean {
  let active = 0;
  for (const s of sessions.values()) {
    if (s.state === "receiving" || s.state === "processing") active++;
  }
  return active < MAX_ACTIVE_UPLOADS;
}

/**
 * Whether the server has room to take a video of this size now. The scratch
 * copy needs the original plus the compressed result, uploads already in
 * flight have claimed theirs, and a margin always stays free — the disk is
 * shared with other sites, and filling it would take them down too.
 */
export async function hasRoomFor(bytes: number): Promise<boolean> {
  try {
    await mkdir(SCRATCH_ROOT, { recursive: true });
    const fs = await statfs(SCRATCH_ROOT);
    const free = fs.bavail * fs.bsize;
    let claimed = 0;
    for (const s of sessions.values()) {
      if (s.state === "receiving" || s.state === "processing") claimed += s.size * 2;
    }
    return free - claimed >= bytes * 2 + DISK_RESERVE_BYTES;
  } catch {
    // Can't tell (unusual platform): don't block the upload on it.
    return true;
  }
}

async function sweep() {
  const now = Date.now();
  // Once per process: scratch folders left behind by a restart belong to no
  // session any more, so nothing else would ever remove them.
  if (!g.__veaVideoScratchCleaned) {
    g.__veaVideoScratchCleaned = true;
    const known = new Set([...sessions.values()].map((s) => s.dir));
    const entries = await readdir(SCRATCH_ROOT).catch(() => [] as string[]);
    for (const name of entries) {
      const dir = path.join(SCRATCH_ROOT, name);
      if (known.has(dir)) continue;
      const info = await stat(dir).catch(() => null);
      if (info && now - info.mtimeMs > 60 * 60 * 1000) {
        await rm(dir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }
  await clearStale();
}

/** Drop abandoned uploads and old results. Cheap; safe to call often. */
async function clearStale() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (s.state === "processing") continue;
    const stalled = s.state === "receiving" && now - s.touched > STALLED_UPLOAD_MS;
    const old = s.state !== "receiving" && now - (s.endedAt ?? s.touched) > Math.max(REPORT_FOR_MS, 0);
    if (stalled || old || now - s.touched > IDLE_EXPIRY_MS) {
      if (stalled) console.log(`[upload] cleared an abandoned upload of "${s.filename}"`);
      sessions.delete(id);
      await rm(s.dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

/** What a listing's edit page needs to show about its videos in flight. */
export type VideoActivity = {
  id: string;
  name: string;
  /** uploading: pieces still arriving; processing: the server is finishing. */
  stage: "uploading" | "processing" | "error";
  /** 0–100, or null when there's no meaningful figure yet. */
  percent: number | null;
  /** Uploading, but no piece has arrived for over a minute — most likely the
   *  page that was sending it was closed. Cleared automatically soon after. */
  interrupted?: boolean;
  error?: string;
};

export async function videoActivityFor(listingId: string): Promise<VideoActivity[]> {
  await clearStale();
  const out: VideoActivity[] = [];
  for (const s of sessions.values()) {
    if (listingIdFrom(s.prefix) !== listingId) continue;
    if (s.state === "receiving") {
      const got = [...s.lengths.values()].reduce((a, b) => a + b, 0);
      out.push({
        id: s.id,
        name: s.filename,
        stage: "uploading",
        // A streamed upload's size is only an estimate until it finishes.
        percent: s.size > 0 ? Math.min(99, Math.round((got / s.size) * 100)) : null,
        interrupted: Date.now() - s.touched > 60_000,
      });
    } else if (s.state === "processing") {
      out.push({
        id: s.id,
        name: s.filename,
        stage: "processing",
        // Waiting its turn behind another video: no figure yet.
        percent: s.running ? Math.round(s.progress * 100) : null,
      });
    } else if (s.state === "error") {
      out.push({ id: s.id, name: s.filename, stage: "error", percent: null, error: s.error });
    }
  }
  return out;
}

export async function startVideoUpload(input: {
  prefix: string;
  filename: string;
  alt: string | null;
  size: number;
  chunkBytes: number;
  streaming?: boolean;
}): Promise<Session> {
  await sweep();
  await mkdir(SCRATCH_ROOT, { recursive: true });
  const dir = await mkdtemp(path.join(SCRATCH_ROOT, "u-"));
  const ext = (input.filename.match(/\.([a-z0-9]+)$/i)?.[1] ?? "mp4").toLowerCase();
  const src = path.join(dir, `in.${ext}`);
  // Create the file now so chunks can be written into place in any order.
  await (await open(src, "w")).close();

  const session: Session = {
    id: crypto.randomUUID(),
    ...input,
    streaming: Boolean(input.streaming),
    // For a streamed upload this is only an upper bound until it finishes.
    totalChunks: input.streaming
      ? Math.ceil(MAX_VIDEO_UPLOAD_BYTES / input.chunkBytes)
      : Math.max(1, Math.ceil(input.size / input.chunkBytes)),
    received: new Set(),
    lengths: new Map(),
    progress: 0,
    dir,
    src,
    state: "receiving",
    touched: Date.now(),
  };
  sessions.set(session.id, session);
  return session;
}

export function getVideoUpload(id: string): Session | undefined {
  return sessions.get(id);
}

/**
 * Write one chunk at its own offset. Writing by position rather than appending
 * makes a retried chunk harmless: it simply overwrites itself.
 */
export async function writeVideoChunk(s: Session, index: number, data: Uint8Array) {
  if (s.streaming) {
    // Only the final piece may be short, and that's checked on finish.
    if (data.byteLength === 0 || data.byteLength > s.chunkBytes) {
      throw new Error(`Chunk ${index + 1} arrived incomplete. Please try again.`);
    }
  } else {
    const expected =
      index === s.totalChunks - 1 ? s.size - index * s.chunkBytes : s.chunkBytes;
    if (data.byteLength !== expected) {
      throw new Error(`Chunk ${index + 1} arrived incomplete. Please try again.`);
    }
  }
  const fh = await open(s.src, "r+");
  try {
    await fh.write(data, 0, data.byteLength, index * s.chunkBytes);
  } finally {
    await fh.close();
  }
  s.received.add(index);
  s.lengths.set(index, data.byteLength);
  s.touched = Date.now();
}

/**
 * Close a streamed upload once the browser knows how big the file turned out:
 * every piece must be there, all but the last full-sized, adding up exactly.
 * Returns an error message, or null when the file is complete.
 */
export async function sealStreamedUpload(
  s: Session,
  size: number,
  totalChunks: number,
): Promise<string | null> {
  if (!Number.isInteger(size) || size <= 0 || size > MAX_VIDEO_UPLOAD_BYTES) return "Bad file size.";
  if (totalChunks !== Math.ceil(size / s.chunkBytes)) return "Bad piece count.";
  for (let i = 0; i < totalChunks; i++) {
    const expected = i === totalChunks - 1 ? size - i * s.chunkBytes : s.chunkBytes;
    if (s.lengths.get(i) !== expected) return "Some of the video is missing. Please try again.";
  }
  if (s.received.size !== totalChunks) return "Unexpected extra pieces. Please try again.";
  const fh = await open(s.src, "r+");
  try {
    await fh.truncate(size);
  } finally {
    await fh.close();
  }
  s.size = size;
  s.totalChunks = totalChunks;
  s.streaming = false;
  return null;
}

/** Abandon an upload and clear away what arrived. */
export async function abortVideoUpload(s: Session): Promise<void> {
  if (s.state !== "receiving") return;
  sessions.delete(s.id);
  await rm(s.dir, { recursive: true, force: true }).catch(() => {});
}

/** How many videos for this listing are still uploading or being processed. */
export async function pendingVideosFor(listingId: string): Promise<number> {
  const activity = await videoActivityFor(listingId);
  return activity.filter((a) => a.stage !== "error").length;
}

/** Queue the clip for compression. Returns immediately; poll for the result. */
export function finishVideoUpload(s: Session) {
  s.state = "processing";
  s.touched = Date.now();
  // One clip at a time: the box is shared, and ffmpeg will use every core.
  const queue = g.__veaVideoQueue ?? Promise.resolve();
  g.__veaVideoQueue = queue.then(() => processSession(s)).catch(() => {});
}

async function processSession(s: Session) {
  const started = Date.now();
  s.running = true;
  try {
    const { codec } = await probe(s.src);
    if (!codec) {
      throw new Error(`"${s.filename}" doesn't look like a video we can read.`);
    }

    const prepared = await prepareVideoFile(s.src, s.filename, s.dir, {
      timeoutMs: processTimeoutMs(s.size),
      onProgress: (f) => {
        s.progress = f;
        s.touched = Date.now();
      },
    });
    s.progress = 1;
    /*
     * Conversion failed. For a small clip the original is still worth keeping,
     * but a big one (a multi-GB 4K or HDR file) would be too heavy to stream
     * and often won't play in Chrome or on Android at all. Say so, rather than
     * quietly attaching a file that breaks the listing page.
     */
    if (prepared.failed && s.size > ORIGINAL_FALLBACK_MAX_BYTES) {
      throw new Error(
        `"${s.filename}" couldn't be converted for the web. Please try again, or upload a shorter clip.`,
      );
    }
    const storage = await getStorage();
    const key = storageKey(s.prefix, prepared.filename);
    const res = storage.putFile
      ? await storage.putFile(key, prepared.file, prepared.contentType)
      : await storage.put(key, await readFile(prepared.file), prepared.contentType);

    let posterUrl: string | undefined;
    if (prepared.poster) {
      const posterRes = await storage.put(
        posterKeyFor(key, prepared.poster.ext),
        prepared.poster.data,
        prepared.poster.contentType,
      );
      posterUrl = posterRes.url;
    }

    console.log(
      `[upload] video ${prepared.action} (chunked): ${(s.size / 1048576).toFixed(1)}MB -> ` +
        `${(prepared.bytes / 1048576).toFixed(1)}MB in ${Math.round((Date.now() - started) / 1000)}s`,
    );
    /*
     * Attach it to the listing here, not from the browser. Compressing a long
     * clip can take a while, and the admin shouldn't have to keep the page
     * open for it — the video simply appears on the listing when it's ready.
     */
    let video: VideoUploadResult["video"];
    const listingId = listingIdFrom(s.prefix);
    if (listingId) {
      await ensureVideoTable();
      const [row] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(listingVideos)
        .where(eq(listingVideos.listingId, listingId));
      const [created] = await db
        .insert(listingVideos)
        .values({
          listingId,
          key: res.key,
          url: res.url,
          title: s.alt,
          posterUrl: posterUrl ?? null,
          sortOrder: row?.c ?? 0,
        })
        .returning({
          id: listingVideos.id,
          url: listingVideos.url,
          title: listingVideos.title,
          posterUrl: listingVideos.posterUrl,
        });
      video = created;
    }

    s.result = { ...res, alt: s.alt, posterUrl, video };
    s.state = "done";
  } catch (err) {
    console.error("[upload] chunked video failed:", err);
    s.error =
      err instanceof Error && err.message.startsWith('"')
        ? err.message
        : `"${s.filename}" could not be saved. Please try again.`;
    s.state = "error";
  } finally {
    s.touched = Date.now();
    s.endedAt = Date.now();
    // The stored copy is what matters now; drop the scratch files.
    await rm(s.dir, { recursive: true, force: true }).catch(() => {});
  }
}
