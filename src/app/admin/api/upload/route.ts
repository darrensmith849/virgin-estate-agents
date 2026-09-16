import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { listings } from "@/db/schema";
import { getStorage, storageKey } from "@/lib/storage";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB per image
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB per video


/**
 * Alt text for an uploaded image.
 *
 * Filenames off a phone are noise — "WhatsApp Image 2026-09-15 at 10.23.45",
 * "IMG_4821", "PXL_20260915_081500" — and using them verbatim put that text on
 * the public page and into search results. Prefer the property's own title and
 * number the photos; only fall back to the filename when it actually reads like
 * a description.
 */
const JUNK_FILENAME =
  /^(whatsapp[ _-]?image|whatsapp[ _-]?video|img|image|photo|pxl|dsc|dcim|screenshot|signal-|scaled_|received_|fb_img|inshot)[ _-]?[\d._-]*$/i;

function altFor(listingTitle: string | null, filename: string, index: number, total: number) {
  const base = filename.replace(/\.[^.]+$/, "").trim();
  if (listingTitle) {
    return total > 1 ? `${listingTitle} — photo ${index + 1}` : listingTitle;
  }
  if (!base || JUNK_FILENAME.test(base) || /^\d[\d._\s-]*$/.test(base)) return "";
  return base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const prefix = (form.get("prefix") as string) || "misc";
  const mediaType = form.get("mediaType");
  const isVideoUpload = mediaType === "video";

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  // Validate media and sizes up-front so we fail before touching storage.
  for (const file of files) {
    const isExpectedType = isVideoUpload
      ? file.type.startsWith("video/")
      : file.type.startsWith("image/");
    if (!isExpectedType) {
      return NextResponse.json(
        { error: isVideoUpload ? "Please upload video files only." : "Please upload image files only." },
        { status: 400 },
      );
    }

    const maxBytes = isVideoUpload ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `"${file.name}" is larger than ${isVideoUpload ? "100 MB" : "8 MB"}.` },
        { status: 413 },
      );
    }
  }

  try {
    // The prefix is "listings/<uuid>"; use the property's title for alt text.
    const listingId = /^listings\/([0-9a-f-]{36})$/i.exec(prefix)?.[1];
    let listingTitle: string | null = null;
    if (listingId) {
      const row = await db.query.listings.findFirst({
        where: eq(listings.id, listingId),
        columns: { title: true },
      });
      listingTitle = row?.title?.trim() || null;
    }

    const storage = await getStorage();
    const uploaded: { key: string; url: string; alt: string }[] = [];

    for (const [i, file] of files.entries()) {
      const buf = await file.arrayBuffer();
      const key = storageKey(prefix, file.name);
      const res = await storage.put(key, buf, file.type || (isVideoUpload ? "video/mp4" : "image/jpeg"));
      uploaded.push({ ...res, alt: altFor(listingTitle, file.name, i, files.length) });
    }

    if (uploaded.length === 0) {
      return NextResponse.json(
        { error: `No valid ${isVideoUpload ? "video" : "image"} files were provided.` },
        { status: 400 },
      );
    }

    return NextResponse.json({ files: uploaded });
  } catch (err) {
    // Always return JSON — an unhandled throw here produces an empty body,
    // which the client sees as "Unexpected end of JSON input".
    console.error("[upload] storage put failed:", err);
    return NextResponse.json(
      {
        error:
          "Media storage is not available. Files can't be saved until the media bucket (R2) is configured.",
      },
      { status: 500 },
    );
  }
}
