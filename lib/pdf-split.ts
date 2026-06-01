/**
 * Client-side PDF split and extract (pdf-lib). Safe to import from client components.
 */
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

export type PageRange = {
  /** Zero-based inclusive start page index. */
  start: number;
  /** Zero-based inclusive end page index. */
  end: number;
};

/** Convert 1-based inclusive page numbers to a zero-based range. */
export function pageNumbersToRange(
  startPage: number,
  endPage: number,
  pageCount: number
): PageRange {
  if (!Number.isInteger(startPage) || !Number.isInteger(endPage)) {
    throw new Error("Page numbers must be whole numbers.");
  }
  if (startPage < 1 || endPage < 1) {
    throw new Error("Page numbers start at 1.");
  }
  if (startPage > endPage) {
    throw new Error("Start page must be less than or equal to end page.");
  }
  if (endPage > pageCount) {
    throw new Error(`End page exceeds document length (${pageCount} pages).`);
  }

  return { start: startPage - 1, end: endPage - 1 };
}

function indicesFromRange(range: PageRange): number[] {
  const indices: number[] = [];
  for (let i = range.start; i <= range.end; i++) {
    indices.push(i);
  }
  return indices;
}

async function loadPdf(bytes: ArrayBuffer): Promise<PDFDocument> {
  return PDFDocument.load(bytes);
}

async function copyIndicesToBlob(
  src: PDFDocument,
  indices: number[]
): Promise<Blob> {
  if (indices.length === 0) {
    throw new Error("At least one page is required.");
  }

  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices);
  copied.forEach((page) => out.addPage(page));
  const saved = await out.save();
  return new Blob([saved.buffer as ArrayBuffer], { type: "application/pdf" });
}

/** Build a PDF containing only the given zero-based page indices. */
export async function extractPages(
  pdfBlob: Blob,
  pageIndices: number[]
): Promise<Blob> {
  const buffer = await pdfBlob.arrayBuffer();
  const src = await loadPdf(buffer);
  const total = src.getPageCount();

  for (const index of pageIndices) {
    if (!Number.isInteger(index) || index < 0 || index >= total) {
      throw new Error(`Invalid page index: ${index + 1}.`);
    }
  }

  return copyIndicesToBlob(src, pageIndices);
}

/** Extract a contiguous page range (zero-based inclusive indices). */
export async function extractPageRange(
  pdfBlob: Blob,
  range: PageRange
): Promise<Blob> {
  return extractPages(pdfBlob, indicesFromRange(range));
}

/** Split a PDF into one file per contiguous range. */
export async function splitByRanges(
  pdfBlob: Blob,
  ranges: PageRange[]
): Promise<Blob[]> {
  if (ranges.length === 0) {
    throw new Error("At least one range is required.");
  }

  const buffer = await pdfBlob.arrayBuffer();
  const src = await loadPdf(buffer);
  const results: Blob[] = [];

  for (const range of ranges) {
    results.push(await copyIndicesToBlob(src, indicesFromRange(range)));
  }

  return results;
}

/** Split every N pages into separate PDFs. */
export async function splitEveryN(
  pdfBlob: Blob,
  pagesPerFile: number
): Promise<Blob[]> {
  if (!Number.isInteger(pagesPerFile) || pagesPerFile < 1) {
    throw new Error("Pages per file must be at least 1.");
  }

  const buffer = await pdfBlob.arrayBuffer();
  const src = await loadPdf(buffer);
  const total = src.getPageCount();
  const results: Blob[] = [];

  for (let start = 0; start < total; start += pagesPerFile) {
    const end = Math.min(start + pagesPerFile - 1, total - 1);
    results.push(await copyIndicesToBlob(src, indicesFromRange({ start, end })));
  }

  return results;
}

export type NamedBlob = { name: string; blob: Blob };

/** Pack PDF blobs into a ZIP archive. */
export async function packPdfBlobsToZip(files: NamedBlob[]): Promise<Blob> {
  const zip = new JSZip();
  for (const { name, blob } of files) {
    zip.file(name, blob);
  }
  return zip.generateAsync({ type: "blob" });
}

/** Name split parts as part-1.pdf, part-2.pdf, … */
export function nameSplitParts(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `part-${i + 1}.pdf`);
}

/** Preview how many files splitEveryN will produce. */
export function previewSplitEveryN(
  pageCount: number,
  pagesPerFile: number
): { fileCount: number; lastFilePages: number } {
  if (pageCount < 1 || pagesPerFile < 1) {
    return { fileCount: 0, lastFilePages: 0 };
  }
  const fileCount = Math.ceil(pageCount / pagesPerFile);
  const lastFilePages = pageCount % pagesPerFile || pagesPerFile;
  return { fileCount, lastFilePages };
}
