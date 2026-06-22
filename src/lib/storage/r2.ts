import "server-only";
import type { R2BucketLike, Storage } from "./index";

/**
 * Production storage backed by a Cloudflare R2 bucket binding.
 * Set R2_PUBLIC_URL to the bucket's public domain (r2.dev or a custom domain).
 */
export function createR2Storage(bucket: R2BucketLike): Storage {
  return {
    async put(key, data, contentType) {
      await bucket.put(key, data, { httpMetadata: { contentType } });
      const base = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
      return { key, url: base ? `${base}/${key}` : `/${key}` };
    },
    async delete(key) {
      await bucket.delete(key);
    },
  };
}
