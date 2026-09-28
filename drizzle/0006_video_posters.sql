-- A preview picture for each listing video.
--
-- The admin grid and the public gallery showed a video's very first frame,
-- which for most clips is black (a fade-in or a title card). The server now
-- keeps a still from a moment into each clip and records its URL here; null
-- means none yet (older videos get one from a background job at start-up).
ALTER TABLE "listing_videos" ADD COLUMN IF NOT EXISTS "poster_url" text;
