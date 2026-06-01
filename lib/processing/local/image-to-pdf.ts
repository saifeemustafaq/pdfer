/** Browser / Worker only */

import {
  DEFAULT_IMAGE_PDF_LAYOUT,
  type ImagePdfLayoutOptions,
} from "@/lib/image-pdf-layout";
import { buildPdfFromNormalizedImages } from "@/lib/image-pdf-embed";
import { normalizeImageForEmbed } from "./image-normalize";
import type { LocalMergeInput, LocalMergeProgress } from "./merge";

/**
 * Convert an ordered list of images to a multi-page PDF.
 * Port of lib/services/image-to-pdf.ts without sharp (browser-safe).
 */
export async function buildPdfFromImagesLocal(
  files: LocalMergeInput[],
  layout: ImagePdfLayoutOptions = DEFAULT_IMAGE_PDF_LAYOUT,
  onProgress?: LocalMergeProgress
): Promise<Uint8Array> {
  const total = files.length;
  const normalized = [];

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    onProgress?.(index, total);

    const { data, width, height } = await normalizeImageForEmbed(
      file.bytes,
      file.mimeType
    );
    normalized.push({ data, width, height });
  }

  onProgress?.(total, total);
  return buildPdfFromNormalizedImages(normalized, layout);
}
