import { NextRequest, NextResponse } from "next/server";
import { buildPdfFromImages } from "@/lib/services/image-to-pdf";
import { OUTPUT_FILENAMES } from "@/lib/constants";
import { isAcceptedImageMime } from "@/lib/file-utils";

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
    for (const entry of imageEntries) {
      if (!(entry instanceof File)) {
        return NextResponse.json(
          { error: "Invalid file upload." },
          { status: 400 }
        );
      }
      if (!isAcceptedImageMime(entry.type)) {
        return NextResponse.json(
          { error: "Only JPEG and PNG images are accepted" },
          { status: 400 }
        );
      }
      buffers.push(Buffer.from(await entry.arrayBuffer()));
    }

    const pdf = await buildPdfFromImages(buffers);

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
