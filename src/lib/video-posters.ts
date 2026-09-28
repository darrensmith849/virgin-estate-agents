import "server-only";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { ensureVideoTable } from "@/db/bootstrap";
import { listingVideos } from "@/db/schema";
import { getStorage } from "@/lib/storage";
import { extractPoster, posterKeyFor } from "@/lib/video";

/*
 * Give older videos a preview picture.
 *
 * Videos uploaded before posters were recorded show as a black tile (the
 * clip's first frame). The first time the server needs a listing's videos
 * after starting, this works through any without a poster in the background:
 * one at a time, at low priority, touching nothing but the new poster_url.
 * If it can't start (the database briefly unavailable, say) it tries again a
 * few minutes later; a single clip it can't read waits for the next restart.
 */

const RETRY_AFTER_MS = 5 * 60 * 1000;
/** Running, finished, or (after a failure) when to try again. */
let state: "running" | "done" | number = 0;

export function backfillVideoPosters(): void {
  if (state === "running" || state === "done" || Date.now() < state) return;
  state = "running";
  run().then(
    () => {
      state = "done";
    },
    (err) => {
      console.error("[posters] backfill stopped; will retry:", err);
      state = Date.now() + RETRY_AFTER_MS;
    },
  );
}

async function run() {
  await ensureVideoTable();
  const missing = await db
    .select({ id: listingVideos.id, key: listingVideos.key })
    .from(listingVideos)
    .where(isNull(listingVideos.posterUrl));
  if (missing.length === 0) return;

  const storage = await getStorage();
  let done = 0;
  for (const video of missing) {
    const src = path.join(process.cwd(), "public", "uploads", video.key);
    if (!(await access(src).then(() => true, () => false))) continue;

    const dir = await mkdtemp(path.join(tmpdir(), "vea-poster-"));
    try {
      const poster = await extractPoster(src, dir);
      if (!poster) continue;
      const res = await storage.put(posterKeyFor(video.key, poster.ext), poster.data, poster.contentType);
      await db
        .update(listingVideos)
        .set({ posterUrl: res.url })
        .where(and(eq(listingVideos.id, video.id), isNull(listingVideos.posterUrl)));
      done++;
    } catch (err) {
      console.error(`[posters] ${video.key}:`, err);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
  console.log(`[posters] added a preview picture to ${done} of ${missing.length} older video(s)`);
}
