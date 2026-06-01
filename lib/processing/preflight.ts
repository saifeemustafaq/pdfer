import { PDFDocument } from "pdf-lib";
import type { FileSummary, PdfPreflight } from "./types";

/** Summarise staged files for routing and preflight. */
export function summarizeFiles(files: File[]): FileSummary {
  return {
    totalBytes: files.reduce((sum, file) => sum + file.size, 0),
    mimeTypes: [
      ...new Set(files.map((file) => file.type || "application/octet-stream")),
    ],
    fileCount: files.length,
  };
}

/**
 * Lazy PDF inspection: page count and encryption flag.
 * Loads the file with pdf-lib on demand.
 */
export async function preflightPdf(file: File): Promise<PdfPreflight> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const doc = await PDFDocument.load(bytes);
    return { pageCount: doc.getPageCount(), encrypted: false };
  } catch (err) {
    console.error("preflightPdf failed:", err);
    const message = err instanceof Error ? err.message : "";
    if (/encrypt/i.test(message)) {
      return { encrypted: true };
    }
    return {};
  }
}
