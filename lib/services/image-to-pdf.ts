import "server-only";
import sharp from "sharp";
import {
  DEFAULT_IMAGE_PDF_LAYOUT,
  type ImagePdfLayoutOptions,
} from "@/lib/image-pdf-layout";
import { buildPdfFromNormalizedImages } from "@/lib/image-pdf-embed";

/**
 * Convert an ordered list of images to a multi-page PDF.
 */
export async function buildPdfFromImages(
  images: Buffer[],
  layout: ImagePdfLayoutOptions = DEFAULT_IMAGE_PDF_LAYOUT
): Promise<Buffer> {
  const normalized = [];

  for (const imgBuffer of images) {
    const { data, info } = await sharp(imgBuffer)
      .rotate()
      .toFormat("jpeg", { quality: 90 })
      .toBuffer({ resolveWithObject: true });

    normalized.push({
      data: new Uint8Array(data),
      width: info.width,
      height: info.height,
    });
  }

  const bytes = await buildPdfFromNormalizedImages(normalized, layout);
  return Buffer.from(bytes);
}
