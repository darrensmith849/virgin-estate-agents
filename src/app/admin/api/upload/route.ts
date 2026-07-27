import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { getStorage, storageKey } from "@/lib/storage";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per file

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const prefix = (form.get("prefix") as string) || "misc";

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  // Validate sizes up-front so we fail before touching storage.
  for (const file of files) {
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `"${file.name}" is larger than 8 MB.` },
        { status: 413 },
      );
    }
  }

  try {
    const storage = await getStorage();
    const uploaded: { key: string; url: string; alt: string }[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const buf = await file.arrayBuffer();
      const key = storageKey(prefix, file.name);
      const res = await storage.put(key, buf, file.type || "image/jpeg");
      uploaded.push({ ...res, alt: file.name.replace(/\.[^.]+$/, "") });
    }

    if (uploaded.length === 0) {
      return NextResponse.json(
        { error: "No valid image files were provided." },
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
          "Image storage is not available. Photos can't be saved until the media bucket (R2) is configured.",
      },
      { status: 500 },
    );
  }
}
