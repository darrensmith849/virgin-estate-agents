import "server-only";

export interface StoragePutResult {
  key: string;
  url: string;
}

export interface Storage {
  put(
    key: string,
    data: ArrayBuffer | Uint8Array,
    contentType: string,
  ): Promise<StoragePutResult>;
  delete(key: string): Promise<void>;
}

/** Minimal shape of a Cloudflare R2 bucket binding. */
export interface R2BucketLike {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
}

/**
 * Resolves the active storage backend:
 *  - Cloudflare R2 binding (`MEDIA`) when running on Workers / wrangler dev.
 *  - Local filesystem (public/uploads) otherwise, for `next dev`.
 * Implementations are lazy-imported so Node's fs never enters the Worker bundle.
 */
export async function getStorage(): Promise<Storage> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    const bucket = (ctx?.env as Record<string, unknown> | undefined)?.MEDIA as
      | R2BucketLike
      | undefined;
    if (bucket) {
      const { createR2Storage } = await import("./r2");
      return createR2Storage(bucket);
    }
  } catch {
    // Not inside a Cloudflare context — fall through to local storage.
  }
  const { createLocalStorage } = await import("./local");
  return createLocalStorage();
}

/** Build a stable storage key under a prefix, e.g. storageKey("listings/<id>", file). */
export function storageKey(prefix: string, filename: string): string {
  const ext = (filename.split(".").pop() || "jpg")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 5);
  const safePrefix = prefix.replace(/[^a-z0-9/_-]/gi, "").replace(/^\/+|\/+$/g, "");
  return `${safePrefix}/${crypto.randomUUID()}.${ext || "jpg"}`;
}
