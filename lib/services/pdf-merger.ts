import "server-only";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { embedImageOnPdfPage } from "@/lib/image-pdf-embed";
import {
  DEFAULT_IMAGE_PDF_LAYOUT,
  type ImagePdfLayoutOptions,
} from "@/lib/image-pdf-layout";
import type { FileEntry } from "@/types";
import { isPdfBuffer } from "@/lib/file-utils";

/**
 * Merge an ordered list of files (PDFs or images) into a single PDF.
 */
export async function mergeFiles(
  files: FileEntry[],
  imageLayout: ImagePdfLayoutOptions = DEFAULT_IMAGE_PDF_LAYOUT
): Promise<Buffer> {
  const output = await PDFDocument.create();

  for (const file of files) {
    if (isPdfBuffer(file.buffer)) {
      const src = await PDFDocument.load(file.buffer);
      const pageIndices = src.getPageIndices();
      const copied = await output.copyPages(src, pageIndices);
      copied.forEach((p) => output.addPage(p));
    } else {
      const { data, info } = await sharp(file.buffer)
        .rotate()
        .toFormat("jpeg", { quality: 90 })
        .toBuffer({ resolveWithObject: true });

      await embedImageOnPdfPage(
        output,
        {
          data: new Uint8Array(data),
          width: info.width,
          height: info.height,
        },
        imageLayout
      );
    }
  }

  const bytes = await output.save();
  return Buffer.from(bytes);
}
