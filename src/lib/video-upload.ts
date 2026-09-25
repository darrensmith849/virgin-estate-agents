import "server-only";
import { mkdir, mkdtemp, open, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { getStorage, storageKey } from "@/lib/storage";
import { prepareVideoFile, probe } from "@/lib/video";

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

/** Largest video accepted. Several minutes of 4K from a phone. */
export const MAX_VIDEO_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
/** Largest single chunk the server takes; the browser sends 8MB. */
export const MAX_CHUNK_BYTES = 16 * 1024 * 1024;
/** Ceiling on the background compression of one clip. */
const PROCESS_TIMEOUT_MS = 60 * 60 * 1000;
/** Abandoned uploads are swept after this long without activity. */
const IDLE_EXPIRY_MS = 6 * 60 * 60 * 1000;

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
};

type Session = {
  id: string;
  prefix: string;
  filename: string;
  alt: string | null;
  size: number;
  chunkBytes: number;
  totalChunks: number;
  received: Set<number>;
  dir: string;
  src: string;
  state: "receiving" | "processing" | "done" | "error";
  result?: VideoUploadResult;
  error?: string;
  touched: number;
};

// Kept on globalThis so dev-mode reloads don't orphan in-flight uploads.
const g = globalThis as unknown as {
  __veaVideoSessions?: Map<string, Session>;
  __veaVideoQueue?: Promise<void>;
};
const sessions = (g.__veaVideoSessions ??= new Map<string, Session>());

async function sweep() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (s.state === "processing") continue;
    if (now - s.touched > IDLE_EXPIRY_MS) {
      sessions.delete(id);
      await rm(s.dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

export async function startVideoUpload(input: {
  prefix: string;
  filename: string;
  alt: string | null;
  size: number;
  chunkBytes: number;
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
    totalChunks: Math.max(1, Math.ceil(input.size / input.chunkBytes)),
    received: new Set(),
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
  const expected =
    index === s.totalChunks - 1 ? s.size - index * s.chunkBytes : s.chunkBytes;
  if (data.byteLength !== expected) {
    throw new Error(`Chunk ${index + 1} arrived incomplete. Please try again.`);
  }
  const fh = await open(s.src, "r+");
  try {
    await fh.write(data, 0, data.byteLength, index * s.chunkBytes);
  } finally {
    await fh.close();
  }
  s.received.add(index);
  s.touched = Date.now();
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
  try {
    const { codec } = await probe(s.src);
    if (!codec) {
      throw new Error(`"${s.filename}" doesn't look like a video we can read.`);
    }

    const prepared = await prepareVideoFile(s.src, s.filename, s.dir, {
      timeoutMs: PROCESS_TIMEOUT_MS,
    });
    const storage = await getStorage();
    const key = storageKey(s.prefix, prepared.filename);
    const res = storage.putFile
      ? await storage.putFile(key, prepared.file, prepared.contentType)
      : await storage.put(key, await readFile(prepared.file), prepared.contentType);

    let posterUrl: string | undefined;
    if (prepared.poster) {
      const posterRes = await storage.put(
        key.replace(/\.[^.]+$/, "") + "-poster.webp",
        prepared.poster.data,
        prepared.poster.contentType,
      );
      posterUrl = posterRes.url;
    }

    console.log(
      `[upload] video ${prepared.action} (chunked): ${(s.size / 1048576).toFixed(1)}MB -> ` +
        `${(prepared.bytes / 1048576).toFixed(1)}MB in ${Math.round((Date.now() - started) / 1000)}s`,
    );
    s.result = { ...res, alt: s.alt, posterUrl };
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
    // The stored copy is what matters now; drop the scratch files.
    await rm(s.dir, { recursive: true, force: true }).catch(() => {});
  }
}
