/**
 * Server-side PDF unlock: true decryption via MuPDF (WASM).
 *
 * MuPDF authenticates the user/owner password and rewrites the file with all
 * encryption removed — unlike pdf-lib, which cannot decrypt content streams and
 * only ever skipped the encryption flag (producing corrupt output).
 *
 * MuPDF is pure WASM: no native binary, no external API, no credentials. It runs
 * in the same Node serverless function locally and on Netlify. When
 * UNLOCK_SERVICE_URL is set, requests are delegated to that service instead
 * (an optional escape hatch; not required for the tool to work).
 */

import type { UnlockErrorCode } from "@/types";

/** Save options that strip encryption and re-compress the rewritten PDF. */
const DECRYPT_SAVE_OPTIONS = "decrypt,compress";

/** Typed failure so the API route can map to the right status / client hint. */
export class UnlockError extends Error {
  readonly code: UnlockErrorCode;

  constructor(code: UnlockErrorCode, message: string) {
    super(message);
    this.name = "UnlockError";
    this.code = code;
  }
}

async function unlockViaService(
  serviceUrl: string,
  buffer: Buffer,
  password: string
): Promise<Uint8Array> {
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: "application/pdf" }),
    "document.pdf"
  );
  form.append("password", password);

  let res: Response;
  try {
    res = await fetch(serviceUrl, { method: "POST", body: form });
  } catch {
    throw new UnlockError(
      "SERVICE_ERROR",
      "The unlock service is unavailable. Please try again."
    );
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    const message = body.error ?? "Could not unlock this PDF.";
    const code: UnlockErrorCode = /password/i.test(message)
      ? "INCORRECT_PASSWORD"
      : "SERVICE_ERROR";
    throw new UnlockError(code, message);
  }

  return new Uint8Array(await res.arrayBuffer());
}

async function unlockWithMuPdf(
  buffer: Buffer,
  password: string
): Promise<Uint8Array> {
  const mupdf = await import("mupdf");

  let doc: import("mupdf").Document | undefined;
  try {
    doc = mupdf.Document.openDocument(new Uint8Array(buffer), "application/pdf");
  } catch {
    throw new UnlockError(
      "INVALID_PDF",
      "This file could not be read as a PDF. It may be corrupt or use an unsupported format."
    );
  }

  try {
    if (!doc.isPDF()) {
      throw new UnlockError(
        "INVALID_PDF",
        "This file is not a PDF, so it cannot be unlocked here."
      );
    }

    if (doc.needsPassword()) {
      // The file is encrypted with a user (open) password.
      if (!password) {
        throw new UnlockError(
          "PASSWORD_REQUIRED",
          "This PDF is password-protected. Enter the password used to open it."
        );
      }
      // Returns 0 on failure; any non-zero value means a user or owner
      // password matched.
      if (doc.authenticatePassword(password) === 0) {
        throw new UnlockError(
          "INCORRECT_PASSWORD",
          "Incorrect password. Enter the password you use to open this PDF."
        );
      }
    } else if (password) {
      // No open password, but the file may carry owner-only restrictions.
      // Supplying the owner password lets MuPDF lift them; a mismatch is
      // harmless because the document already opens, and the rewrite strips
      // encryption regardless.
      doc.authenticatePassword(password);
    }

    const pdf = doc.asPDF();
    if (!pdf) {
      throw new UnlockError(
        "INVALID_PDF",
        "This file could not be processed as a PDF."
      );
    }

    const saved = pdf.saveToBuffer(DECRYPT_SAVE_OPTIONS);
    try {
      // asUint8Array() is a view into WASM memory; copy it out before the
      // backing buffer is destroyed so callers get stable, owned bytes.
      const unlocked = new Uint8Array(saved.asUint8Array());
      if (unlocked.byteLength === 0) {
        throw new UnlockError(
          "INVALID_PDF",
          "Unlocking produced an empty file. The PDF may use unsupported encryption."
        );
      }
      return unlocked;
    } finally {
      saved.destroy();
    }
  } finally {
    doc.destroy();
  }
}

export async function unlockPdf(
  buffer: Buffer,
  password: string
): Promise<Uint8Array> {
  const serviceUrl = process.env.UNLOCK_SERVICE_URL?.trim();
  if (serviceUrl) {
    return unlockViaService(serviceUrl, buffer, password);
  }

  try {
    return await unlockWithMuPdf(buffer, password);
  } catch (err) {
    if (err instanceof UnlockError) throw err;
    console.error("unlockWithMuPdf failed:", err);
    throw new UnlockError(
      "INVALID_PDF",
      "Could not unlock this PDF. It may be corrupt or use unsupported encryption."
    );
  }
}
