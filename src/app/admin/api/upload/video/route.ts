import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { listingVideos, listings } from "@/db/schema";
import { ensureVideoTable } from "@/db/bootstrap";
import { getCurrentUser } from "@/lib/auth/dal";
import { altFor } from "@/lib/upload-alt";
import {
  MAX_CHUNK_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
  abortVideoUpload,
  canStartVideoUpload,
  finishVideoUpload,
  getVideoUpload,
  hasRoomFor,
  videoActivityFor,
  sealStreamedUpload,
  startVideoUpload,
  writeVideoChunk,
} from "@/lib/video-upload";

/*
 * Chunked video uploads — see lib/video-upload.ts for why this exists.
 *
 *   POST  ?op=start   { prefix, filename, size, type, chunkBytes } -> { id }
 *   PUT   ?id=&index= raw chunk bytes                              -> { ok }
 *   POST  ?op=finish  { id }                                        -> { state }
 *   GET   ?id=                                                      -> { state, file?, error? }
 *
 * Each request stays a few MB, well under Caddy's 110MB body limit.
 */

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  if (!(await getCurrentUser())) return fail("Unauthorized", 401);
  const op = new URL(req.url).searchParams.get("op");
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail("Bad request", 400);

  if (op === "start") {
    const filename = String(body.filename ?? "").slice(0, 200) || "video.mp4";
    const size = Number(body.size);
    const chunkBytes = Number(body.chunkBytes);
    const type = String(body.type ?? "");
    const prefix = String(body.prefix ?? "misc");

    if (!type.startsWith("video/")) return fail(`"${filename}" is not a video.`, 400);
    if (!Number.isFinite(size) || size <= 0) return fail("Bad file size.", 400);
    if (size > MAX_VIDEO_UPLOAD_BYTES) {
      return fail(
        `"${filename}" is larger than ${Math.round(MAX_VIDEO_UPLOAD_BYTES / 1073741824)} GB.`,
        413,
      );
    }
    if (!Number.isInteger(chunkBytes) || chunkBytes < 1024 * 1024 || chunkBytes > MAX_CHUNK_BYTES) {
      return fail("Bad chunk size.", 400);
    }

    if (!(await hasRoomFor(size))) {
      return fail(
        `There isn't enough space on the server for "${filename}" right now. Please try again later, or upload a shorter version.`,
        507,
      );
    }
    if (!canStartVideoUpload()) {
      return fail("Several videos are already uploading. Please wait for those to finish.", 429);
    }

    // Same alt rule as the regular route: nothing for a known listing.
    const listingId = /^listings\/([0-9a-f-]{36})$/i.exec(prefix)?.[1];
    let knownListing = false;
    if (listingId) {
      const row = await db.query.listings.findFirst({
        where: eq(listings.id, listingId),
        columns: { title: true },
      });
      knownListing = Boolean(row?.title?.trim());
    }

    const session = await startVideoUpload({
      prefix,
      filename,
      alt: altFor(knownListing, filename),
      size,
      chunkBytes,
      // Compressed in the browser as it uploads: `size` is an estimate and
      // the real one arrives with "finish".
      streaming: body.streaming === true,
    });
    return NextResponse.json({ id: session.id });
  }

  if (op === "finish") {
    const session = getVideoUpload(String(body.id ?? ""));
    if (!session) return fail("Upload expired. Please try again.", 404);
    if (session.state === "receiving") {
      if (session.streaming) {
        const problem = await sealStreamedUpload(
          session,
          Number(body.size),
          Number(body.totalChunks),
        );
        if (problem) return fail(problem, 409);
      } else if (session.received.size !== session.totalChunks) {
        return fail("Some of the video is missing. Please try again.", 409);
      }
      finishVideoUpload(session);
    }
    return NextResponse.json({ state: session.state });
  }

  if (op === "abort") {
    const session = getVideoUpload(String(body.id ?? ""));
    if (session) await abortVideoUpload(session);
    return NextResponse.json({ ok: true });
  }

  return fail("Unknown operation", 400);
}

export async function PUT(req: Request) {
  if (!(await getCurrentUser())) return fail("Unauthorized", 401);
  const params = new URL(req.url).searchParams;
  const session = getVideoUpload(params.get("id") ?? "");
  if (!session) return fail("Upload expired. Please try again.", 404);
  if (session.state !== "receiving") return fail("Upload already finished.", 409);

  const index = Number(params.get("index"));
  if (!Number.isInteger(index) || index < 0 || index >= session.totalChunks) {
    return fail("Bad chunk index.", 400);
  }

  // Refuse an oversized piece before reading it into memory.
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_CHUNK_BYTES) {
    return fail("Chunk too large.", 413);
  }
  const data = new Uint8Array(await req.arrayBuffer());
  if (data.byteLength > MAX_CHUNK_BYTES) return fail("Chunk too large.", 413);

  try {
    await writeVideoChunk(session, index, data);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Chunk failed.", 400);
  }
  return NextResponse.json({ ok: true, received: session.received.size });
}

export async function GET(req: Request) {
  if (!(await getCurrentUser())) return fail("Unauthorized", 401);
  const params = new URL(req.url).searchParams;

  // ?listing=<id>: how many of this listing's videos are still processing,
  // and the ones attached so far — lets the edit page pick up a video that
  // finished after the admin left and came back.
  const listingId = params.get("listing");
  if (listingId) {
    if (!/^[0-9a-f-]{36}$/i.test(listingId)) return fail("Bad listing id.", 400);
    await ensureVideoTable();
    const videos = await db.query.listingVideos.findMany({
      where: eq(listingVideos.listingId, listingId),
      orderBy: [asc(listingVideos.sortOrder)],
      columns: { id: true, url: true, title: true },
    });
    const activity = await videoActivityFor(listingId);
    return NextResponse.json({
      pending: activity.filter((a) => a.stage !== "error").length,
      activity,
      videos,
    });
  }

  const session = getVideoUpload(params.get("id") ?? "");
  if (!session) return fail("Upload expired. Please try again.", 404);
  return NextResponse.json({
    state: session.state,
    file: session.result,
    error: session.error,
    progress: session.progress,
  });
}
