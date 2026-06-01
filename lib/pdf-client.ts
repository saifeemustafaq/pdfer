/**
 * Client-side PDF utilities (pdf-lib only). Safe to import from client components.
 */
import { PDFDocument, degrees, toDegrees, reduceRotation } from "pdf-lib";

export type PageEditSpec = {
  /** Source page indices in output order (subset allowed). */
  pageIndicesInOrder: number[];
  /** Clockwise degrees per source index: 0 | 90 | 180 | 270. */
  rotations?: Record<number, number>;
};

function rotationsRecordToMap(
  rotations?: Record<number, number>
): Map<number, number> {
  const map = new Map<number, number>();
  if (!rotations) return map;
  for (const [key, value] of Object.entries(rotations)) {
    const index = Number(key);
    if (Number.isInteger(index) && value % 360 !== 0) {
      map.set(index, reduceRotation(value));
    }
  }
  return map;
}

/**
 * Build a PDF with reordered, optionally removed, and rotated pages.
 */
export async function exportEditedPdf(
  pdfBlob: Blob,
  spec: PageEditSpec
): Promise<Blob> {
  const { pageIndicesInOrder, rotations } = spec;

  if (pageIndicesInOrder.length === 0) {
    throw new Error("At least one page is required.");
  }

  const rotationMap = rotationsRecordToMap(rotations);
  const buffer = await pdfBlob.arrayBuffer();
  const src = await PDFDocument.load(buffer);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, pageIndicesInOrder);

  copied.forEach((page, outputIndex) => {
    out.addPage(page);
    const sourceIndex = pageIndicesInOrder[outputIndex];
    const extraRotation = rotationMap.get(sourceIndex) ?? 0;
    if (extraRotation === 0) return;

    const srcPage = src.getPage(sourceIndex);
    const existing = reduceRotation(toDegrees(srcPage.getRotation()));
    const total = reduceRotation(existing + extraRotation);
    page.setRotation(degrees(total));
  });

  const bytes = await out.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

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
  return exportEditedPdf(pdfBlob, { pageIndicesInOrder });
}
