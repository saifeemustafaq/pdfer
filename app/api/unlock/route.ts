import { NextRequest, NextResponse } from "next/server";
import { unlockPdf } from "@/lib/services/pdf-unlocker";
import { OUTPUT_FILENAMES } from "@/lib/constants";
import { getUploadSizeError, isPdfBuffer } from "@/lib/file-utils";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const fileEntry = formData.get("file");
    const passwordRaw = formData.get("password");
    const attestation = formData.get("attestation");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (attestation !== "true") {
      return NextResponse.json(
        { error: "Ownership confirmation is required." },
        { status: 400 }
      );
    }

    const password = typeof passwordRaw === "string" ? passwordRaw : "";

    const buffer = Buffer.from(await fileEntry.arrayBuffer());

    const sizeError = getUploadSizeError(buffer.byteLength);
    if (sizeError) {
      return NextResponse.json({ error: sizeError }, { status: 413 });
    }

    if (!isPdfBuffer(buffer)) {
      return NextResponse.json(
        { error: "Only PDF files are accepted here" },
        { status: 400 }
      );
    }

    const unlocked = await unlockPdf(buffer, password);

    return new NextResponse(new Uint8Array(unlocked), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${OUTPUT_FILENAMES.unlock}"`,
        "Content-Length": String(unlocked.byteLength),
      },
    });
  } catch (err) {
    console.error("POST /api/unlock failed:", err);
    const msg =
      err instanceof Error ? err.message : "Could not unlock this PDF.";
    const status = /password|encrypt|ownership/i.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
