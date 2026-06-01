import { NextRequest, NextResponse } from "next/server";
import { buildPdfFromImages } from "@/lib/services/image-to-pdf";
import { OUTPUT_FILENAMES } from "@/lib/constants";
import { parseImagePdfLayoutFromForm } from "@/lib/image-pdf-layout";
import {
  getUploadSizeError,
  isAcceptedImageToPdfMime,
  readFormFile,
} from "@/lib/file-utils";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageEntries = formData.getAll("images");

    if (imageEntries.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required." },
        { status: 400 }
      );
    }

    const buffers: Buffer[] = [];
    let totalSize = 0;

    for (const entry of imageEntries) {
      const parsed = await readFormFile(entry);
      if ("error" in parsed) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }

      const { file, buffer } = parsed;
      if (!isAcceptedImageToPdfMime(file.type, buffer)) {
        return NextResponse.json(
          { error: "Only JPEG, PNG, WebP, and HEIC images are accepted" },
          { status: 400 }
        );
      }
      totalSize += buffer.byteLength;
      buffers.push(buffer);
    }

    const sizeError = getUploadSizeError(totalSize);
    if (sizeError) {
      return NextResponse.json({ error: sizeError }, { status: 413 });
    }

    const layoutResult = parseImagePdfLayoutFromForm(formData);
    if ("error" in layoutResult) {
      return NextResponse.json({ error: layoutResult.error }, { status: 400 });
    }

    const pdf = await buildPdfFromImages(buffers, layoutResult);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${OUTPUT_FILENAMES.imageToPdf}"`,
        "Content-Length": String(pdf.byteLength),
      },
    });
  } catch (err) {
    console.error("POST /api/image-to-pdf failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
