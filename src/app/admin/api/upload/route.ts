import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { getStorage, storageKey } from "@/lib/storage";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB per image
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB per video

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
    const storage = await getStorage();
    const uploaded: { key: string; url: string; alt: string }[] = [];

    for (const file of files) {
      const buf = await file.arrayBuffer();
      const key = storageKey(prefix, file.name);
      const res = await storage.put(key, buf, file.type || (isVideoUpload ? "video/mp4" : "image/jpeg"));
      uploaded.push({ ...res, alt: file.name.replace(/\.[^.]+$/, "") });
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
