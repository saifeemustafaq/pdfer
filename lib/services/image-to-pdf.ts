import "server-only";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

/**
 * Convert an ordered list of images to a multi-page PDF.
 * Each image becomes one page sized to its natural dimensions.
 */
export async function buildPdfFromImages(images: Buffer[]): Promise<Buffer> {
  const output = await PDFDocument.create();

  for (const imgBuffer of images) {
    const { data, info } = await sharp(imgBuffer)
      .rotate()
      .toFormat("jpeg", { quality: 90 })
      .toBuffer({ resolveWithObject: true });

    const { width, height } = info;
    const embedded = await output.embedJpg(data);
    const page = output.addPage([width, height]);
    page.drawImage(embedded, { x: 0, y: 0, width, height });
  }

  const bytes = await output.save();
  return Buffer.from(bytes);
}
