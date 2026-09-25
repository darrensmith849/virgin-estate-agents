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

export type UploadedVideo = {
  key: string;
  url: string;
  alt: string | null;
  posterUrl?: string;
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

export async function uploadVideo(
  file: File,
  prefix: string,
  onProgress: (p: VideoProgress) => void,
): Promise<UploadedVideo> {
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
  for (let index = 0; index < total; index++) {
    const piece = file.slice(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES);
    await withRetry(() =>
      send(`${ENDPOINT}?id=${encodeURIComponent(id)}&index=${index}`, {
        method: "PUT",
        headers: { "content-type": "application/octet-stream" },
        body: piece,
      }),
    );
    onProgress({ phase: "uploading", percent: Math.round(((index + 1) / total) * 100) });
  }

  await withRetry(() =>
    send(`${ENDPOINT}?op=finish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    }),
  );

  onProgress({ phase: "processing" });
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
