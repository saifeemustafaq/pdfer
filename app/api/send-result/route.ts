import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/email-utils";
import { getUploadSizeError, sanitizeFilename } from "@/lib/file-utils";
import { sendResultEmail } from "@/lib/services/email-delivery";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const emailRaw = formData.get("email");
    const fileEntry = formData.get("file");
    const filenameRaw = formData.get("filename");
    const toolRaw = formData.get("tool");

    if (typeof emailRaw !== "string" || !isValidEmail(emailRaw)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const buffer = Buffer.from(await fileEntry.arrayBuffer());

    const sizeError = getUploadSizeError(buffer.byteLength);
    if (sizeError) {
      return NextResponse.json(
        {
          error: `${sizeError} Email delivery supports files up to 6 MB.`,
        },
        { status: 413 }
      );
    }

    const filename =
      typeof filenameRaw === "string" && filenameRaw.trim().length > 0
        ? sanitizeFilename(filenameRaw.trim())
        : sanitizeFilename(fileEntry.name || "result.pdf");

    const toolLabel =
      typeof toolRaw === "string" && toolRaw.trim().length > 0
        ? toolRaw.trim()
        : "file";

    await sendResultEmail({
      to: normalizeEmail(emailRaw),
      filename,
      buffer,
      mimeType: fileEntry.type || "application/octet-stream",
      toolLabel,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/send-result failed:", err);
    const msg =
      err instanceof Error ? err.message : "Could not send email. Please try again.";
    const status = msg.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
