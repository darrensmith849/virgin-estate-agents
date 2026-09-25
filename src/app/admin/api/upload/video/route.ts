import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { listings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { altFor } from "@/lib/upload-alt";
import {
  MAX_CHUNK_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
  finishVideoUpload,
  getVideoUpload,
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
    });
    return NextResponse.json({ id: session.id });
  }

  if (op === "finish") {
    const session = getVideoUpload(String(body.id ?? ""));
    if (!session) return fail("Upload expired. Please try again.", 404);
    if (session.state === "receiving") {
      if (session.received.size !== session.totalChunks) {
        return fail("Some of the video is missing. Please try again.", 409);
      }
      finishVideoUpload(session);
    }
    return NextResponse.json({ state: session.state });
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
  const session = getVideoUpload(new URL(req.url).searchParams.get("id") ?? "");
  if (!session) return fail("Upload expired. Please try again.", 404);
  return NextResponse.json({
    state: session.state,
    file: session.result,
    error: session.error,
  });
}
