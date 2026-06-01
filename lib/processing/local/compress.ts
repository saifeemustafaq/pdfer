/** Browser / Worker only */

import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { QUALITY_PRESETS, type QualityPreset } from "../../constants";

export type CompressProgress = (done: number, total: number) => void;

async function recompressImageBytes(
  originalBytes: Uint8Array,
  jpegQuality: number
): Promise<Uint8Array | null> {
  try {
    const copy = new Uint8Array(originalBytes);
    const blob = new Blob([copy]);
    const bitmap = await createImageBitmap(blob);

    try {
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(bitmap, 0, 0);
      const jpegBlob = await canvas.convertToBlob({
        type: "image/jpeg",
        quality: jpegQuality / 100,
      });

      return new Uint8Array(await jpegBlob.arrayBuffer());
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}

/**
 * Compress a PDF by re-encoding embedded JPEG/JPX image streams via canvas.
 * Port of lib/services/pdf-compressor.ts without sharp (browser-safe).
 */
export async function compressPdfLocal(
  bytes: Uint8Array,
  quality: QualityPreset,
  onProgress?: CompressProgress
): Promise<Uint8Array> {
  const jpegQuality = QUALITY_PRESETS[quality].jpegQuality;
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const imageStreams: PDFRawStream[] = [];

  for (const [, pdfObject] of doc.context.enumerateIndirectObjects()) {
    if (!(pdfObject instanceof PDFRawStream)) continue;

    const subtype = pdfObject.dict.get(PDFName.of("Subtype"));
    if (subtype !== PDFName.of("Image")) continue;

    const filter = pdfObject.dict.get(PDFName.of("Filter"));
    const isDct = filter === PDFName.of("DCTDecode");
    const isJpx = filter === PDFName.of("JPXDecode");

    if (!isDct && !isJpx) continue;

    imageStreams.push(pdfObject);
  }

  const total = imageStreams.length;

  for (let index = 0; index < imageStreams.length; index++) {
    onProgress?.(index, total);

    const pdfObject = imageStreams[index];
    const originalBytes = pdfObject.contents;

    const recompressed = await recompressImageBytes(originalBytes, jpegQuality);

    if (recompressed && recompressed.length < originalBytes.length) {
      (pdfObject as unknown as { contents: Uint8Array }).contents = recompressed;
      pdfObject.dict.set(
        PDFName.of("Length"),
        doc.context.obj(recompressed.length)
      );
      pdfObject.dict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
    }
  }

  onProgress?.(total, total);
  return doc.save({ useObjectStreams: true });
}
