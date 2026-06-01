/** Browser / Worker only */

import { PDFDocument } from "pdf-lib";
import { ACCEPTED_JPEG_PNG_TYPES } from "../../constants";
import { normalizeImageToJpeg } from "./image-normalize";
import type { LocalMergeInput, LocalMergeProgress } from "./merge";

function isJpegPngMime(mime: string): boolean {
  return (ACCEPTED_JPEG_PNG_TYPES as readonly string[]).includes(mime);
}

/**
 * Convert an ordered list of JPEG/PNG images to a multi-page PDF.
 * Port of lib/services/image-to-pdf.ts without sharp (browser-safe).
 */
export async function buildPdfFromImagesLocal(
  files: LocalMergeInput[],
  onProgress?: LocalMergeProgress
): Promise<Uint8Array> {
  const output = await PDFDocument.create();
  const total = files.length;

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    onProgress?.(index, total);

    if (!isJpegPngMime(file.mimeType)) {
      throw new Error(`Unsupported image type: ${file.mimeType}`);
    }

    const { data, width, height } = await normalizeImageToJpeg(file.bytes);
    const embedded = await output.embedJpg(data);
    const page = output.addPage([width, height]);
    page.drawImage(embedded, { x: 0, y: 0, width, height });
  }

  onProgress?.(total, total);
  return output.save();
}
