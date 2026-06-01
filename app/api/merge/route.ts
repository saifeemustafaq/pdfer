import { NextRequest, NextResponse } from "next/server";
import { mergeFiles } from "@/lib/services/pdf-merger";
import { OUTPUT_FILENAMES } from "@/lib/constants";
import {
  getUploadSizeError,
  isAcceptedMergeMime,
  readFormFile,
} from "@/lib/file-utils";
import type { FileEntry } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const entries = formData.getAll("files");

    if (entries.length < 2) {
      return NextResponse.json(
        { error: "At least 2 files are required to merge." },
        { status: 400 }
      );
    }

    const files: FileEntry[] = [];
    let totalSize = 0;

    for (const entry of entries) {
      const parsed = await readFormFile(entry);
      if ("error" in parsed) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }

      const { file, buffer } = parsed;
      totalSize += buffer.byteLength;

      if (!isAcceptedMergeMime(file.type, buffer)) {
        return NextResponse.json(
          { error: "Only PDF, JPEG, and PNG files are accepted" },
          { status: 400 }
        );
      }

      files.push({
        buffer,
        mimetype: file.type,
      });
    }

    const sizeError = getUploadSizeError(totalSize);
    if (sizeError) {
      return NextResponse.json({ error: sizeError }, { status: 413 });
    }

    const merged = await mergeFiles(files);

    return new NextResponse(new Uint8Array(merged), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${OUTPUT_FILENAMES.merge}"`,
        "Content-Length": String(merged.byteLength),
      },
    });
  } catch (err) {
    console.error("POST /api/merge failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
