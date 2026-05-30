import { NextRequest, NextResponse } from "next/server";
import { compressPdf } from "@/lib/services/pdf-compressor";
import { OUTPUT_FILENAMES } from "@/lib/constants";
import { isPdfBuffer, isQualityPreset } from "@/lib/file-utils";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const fileEntry = formData.get("file");
    const qualityRaw = formData.get("quality");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!isQualityPreset(qualityRaw)) {
      return NextResponse.json(
        { error: "Invalid quality preset. Use low, medium, or high." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await fileEntry.arrayBuffer());

    if (!isPdfBuffer(buffer)) {
      return NextResponse.json(
        { error: "Only PDF files are accepted here" },
        { status: 400 }
      );
    }

    const compressed = await compressPdf(buffer, qualityRaw);

    return new NextResponse(new Uint8Array(compressed), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${OUTPUT_FILENAMES.compress}"`,
        "Content-Length": String(compressed.byteLength),
        "X-Original-Size": String(buffer.byteLength),
        "X-Compressed-Size": String(compressed.byteLength),
      },
    });
  } catch (err) {
    console.error("POST /api/compress failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
