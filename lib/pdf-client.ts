/**
 * Client-side PDF utilities (pdf-lib only). Safe to import from client components.
 */
import { PDFDocument } from "pdf-lib";

/**
 * Remove pages at the given zero-based indices from a PDF blob.
 */
export async function removePages(
  pdfBlob: Blob,
  indicesToRemove: Set<number>
): Promise<Blob> {
  const buffer = await pdfBlob.arrayBuffer();
  const doc = await PDFDocument.load(buffer);
  const totalPages = doc.getPageCount();

  const valid = [...indicesToRemove]
    .filter((i) => i >= 0 && i < totalPages)
    .sort((a, b) => b - a);

  for (const i of valid) {
    doc.removePage(i);
  }

  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

/**
 * Build a PDF containing only the given source pages, in the provided order.
 * Each entry is a zero-based index into the source document.
 */
export async function reorderPdfPages(
  pdfBlob: Blob,
  pageIndicesInOrder: number[]
): Promise<Blob> {
  if (pageIndicesInOrder.length === 0) {
    throw new Error("At least one page is required.");
  }

  const buffer = await pdfBlob.arrayBuffer();
  const src = await PDFDocument.load(buffer);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, pageIndicesInOrder);
  copied.forEach((p) => out.addPage(p));
  const bytes = await out.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}
