/** Browser / Worker only */

import { PDFDocument } from "pdf-lib";
import { ACCEPTED_JPEG_PNG_TYPES } from "../../constants";
import { normalizeImageToJpeg } from "./image-normalize";

export type LocalMergeInput = {
  bytes: Uint8Array;
  mimeType: string;
};

export type LocalMergeProgress = (done: number, total: number) => void;

function isPdfBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

function isJpegPngMime(mime: string): boolean {
  return (ACCEPTED_JPEG_PNG_TYPES as readonly string[]).includes(mime);
}

/**
 * Merge an ordered list of PDFs and JPEG/PNG images into a single PDF.
 * Port of lib/services/pdf-merger.ts without sharp (browser-safe).
 */
export async function mergeFilesLocal(
  files: LocalMergeInput[],
  onProgress?: LocalMergeProgress
): Promise<Uint8Array> {
  const output = await PDFDocument.create();
  const total = files.length;

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    onProgress?.(index, total);

    if (isPdfBytes(file.bytes)) {
      const src = await PDFDocument.load(file.bytes);
      const pageIndices = src.getPageIndices();
      const copied = await output.copyPages(src, pageIndices);
      copied.forEach((page) => output.addPage(page));
    } else if (isJpegPngMime(file.mimeType)) {
      const { data, width, height } = await normalizeImageToJpeg(file.bytes);
      const embedded = await output.embedJpg(data);
      const page = output.addPage([width, height]);
      page.drawImage(embedded, { x: 0, y: 0, width, height });
    } else {
      throw new Error(`Unsupported file type: ${file.mimeType}`);
    }
  }

  onProgress?.(total, total);
  return output.save();
}
