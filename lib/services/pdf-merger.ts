import "server-only";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import type { FileEntry } from "@/types";
import { isPdfBuffer } from "@/lib/file-utils";

/**
 * Merge an ordered list of files (PDFs or images) into a single PDF.
 * Each image becomes one page sized to its natural dimensions.
 */
export async function mergeFiles(files: FileEntry[]): Promise<Buffer> {
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

      const { width, height } = info;
      const embedded = await output.embedJpg(data);
      const page = output.addPage([width, height]);
      page.drawImage(embedded, { x: 0, y: 0, width, height });
    }
  }

  const bytes = await output.save();
  return Buffer.from(bytes);
}
