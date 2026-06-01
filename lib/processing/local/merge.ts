/** Browser / Worker only */

import { PDFDocument } from "pdf-lib";
import { embedImageOnPdfPage } from "@/lib/image-pdf-embed";
import {
  DEFAULT_IMAGE_PDF_LAYOUT,
  type ImagePdfLayoutOptions,
} from "@/lib/image-pdf-layout";
import { normalizeImageForEmbed } from "./image-normalize";

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

/**
 * Merge an ordered list of PDFs and images into a single PDF.
 * Port of lib/services/pdf-merger.ts without sharp (browser-safe).
 */
export async function mergeFilesLocal(
  files: LocalMergeInput[],
  imageLayout: ImagePdfLayoutOptions = DEFAULT_IMAGE_PDF_LAYOUT,
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
    } else {
      const { data, width, height } = await normalizeImageForEmbed(
        file.bytes,
        file.mimeType
      );
      await embedImageOnPdfPage(
        output,
        { data, width, height },
        imageLayout
      );
    }
  }

  onProgress?.(total, total);
  return output.save();
}
