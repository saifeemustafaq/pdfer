/**
 * Server-side PDF unlock: rewrite without encryption via pdf-lib.
 * Password is accepted for future qpdf / external service support; pdf-lib 1.17
 * cannot verify user passwords directly. When UNLOCK_SERVICE_URL is set, delegates
 * to that service with the password instead.
 */
import { PDFDocument } from "pdf-lib";

async function unlockWithPdfLib(buffer: Buffer): Promise<Uint8Array> {
  try {
    const doc = await PDFDocument.load(buffer);
    return doc.save();
  } catch {
    // Fall through — likely encrypted.
  }

  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return doc.save();
}

export async function unlockPdf(
  buffer: Buffer,
  password: string
): Promise<Uint8Array> {
  const serviceUrl = process.env.UNLOCK_SERVICE_URL?.trim();

  if (serviceUrl) {
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(buffer)], { type: "application/pdf" }),
      "document.pdf"
    );
    form.append("password", password);

    const res = await fetch(serviceUrl, { method: "POST", body: form });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Could not unlock this PDF.");
    }
    return new Uint8Array(await res.arrayBuffer());
  }

  try {
    return await unlockWithPdfLib(buffer);
  } catch (err) {
    console.error("unlockWithPdfLib failed:", err);
    throw new Error(
      "Could not unlock this PDF. Try the password you use to open the file, or the file may use unsupported encryption."
    );
  }
}
