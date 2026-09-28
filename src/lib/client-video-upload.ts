/*
 * Browser half of the chunked video upload (see lib/video-upload.ts).
 *
 * The file is sent in 8MB pieces, each retried on its own, so a dropped
 * connection costs seconds rather than the whole upload. Once every piece has
 * landed the server compresses the clip, and this polls until it is stored.
 */

const ENDPOINT = "/admin/api/upload/video";
const CHUNK_BYTES = 8 * 1024 * 1024;
const RETRIES = 5;
const POLL_MS = 3000;
/** Pieces uploaded at the same time. */
const PARALLEL_CHUNKS = 4;

export type UploadedVideo = {
  key: string;
  url: string;
  alt: string | null;
  posterUrl?: string;
  /** Set when the server has already attached it to the listing. */
  video?: { id: string; url: string; title: string | null };
};

export type VideoProgress =
  | { phase: "uploading"; percent: number }
  | { phase: "processing" };

async function readError(res: Response): Promise<string> {
  const body: unknown = await res.json().catch(() => null);
  if (body && typeof body === "object" && "error" in body) {
    return String((body as { error: unknown }).error);
  }
  return `Upload failed (${res.status}).`;
}

/** Errors worth retrying: the network, the proxy, or the server hiccuping. */
class Permanent extends Error {}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof Permanent) throw e;
      lastError = e;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("The connection dropped. Please try again.");
}

async function send(input: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    throw new Error("The connection dropped. Please try again.");
  }
  if (res.ok) return res;
  const message = await readError(res);
  // 4xx other than a timeout is our fault or the file's — retrying won't help.
  if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
    throw new Permanent(message);
  }
  throw new Error(message);
}

/** Upload a video and wait until the server has finished with it. */
export async function uploadVideo(
  file: File,
  prefix: string,
  onProgress: (p: VideoProgress) => void,
): Promise<UploadedVideo> {
  const id = await sendVideo(file, prefix, onProgress);
  onProgress({ phase: "processing" });
  return waitForVideo(id);
}

/**
 * Upload a video's bytes and hand it to the server; returns the upload id as
 * soon as the last piece has landed. The server then finishes on its own —
 * the page doesn't need to stay open for that part.
 */
export async function sendVideo(
  file: File,
  prefix: string,
  onProgress: (p: VideoProgress) => void,
): Promise<string> {
  const start = await send(`${ENDPOINT}?op=start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prefix,
      filename: file.name,
      size: file.size,
      type: file.type,
      chunkBytes: CHUNK_BYTES,
    }),
  });
  const { id } = (await start.json()) as { id: string };

  const total = Math.max(1, Math.ceil(file.size / CHUNK_BYTES));
  onProgress({ phase: "uploading", percent: 0 });

  /*
   * Several pieces in flight at once. One request at a time wastes most of a
   * long-distance link waiting for each reply (Harare to the server is a long
   * round trip); a few in parallel keep it full. The server writes each piece
   * at its own offset, so the order they land in doesn't matter.
   */
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < total) {
      const index = next++;
      const piece = file.slice(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES);
      await withRetry(() =>
        send(`${ENDPOINT}?id=${encodeURIComponent(id)}&index=${index}`, {
          method: "PUT",
          headers: { "content-type": "application/octet-stream" },
          body: piece,
        }),
      );
      done++;
      onProgress({ phase: "uploading", percent: Math.round((done / total) * 100) });
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL_CHUNKS, total) }, worker));

  await withRetry(() =>
    send(`${ENDPOINT}?op=finish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    }),
  );

  return id;
}

/** Wait for the server to finish processing an uploaded video. */
export async function waitForVideo(id: string): Promise<UploadedVideo> {
  for (;;) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const res = await withRetry(() =>
      send(`${ENDPOINT}?id=${encodeURIComponent(id)}`, { cache: "no-store" }),
    );
    const status = (await res.json()) as {
      state: "receiving" | "processing" | "done" | "error";
      file?: UploadedVideo;
      error?: string;
    };
    if (status.state === "done" && status.file) return status.file;
    if (status.state === "error") throw new Error(status.error ?? "Video upload failed.");
  }
}
