import "server-only";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import sharp from "sharp";
import { QUALITY_PRESETS, type QualityPreset } from "@/lib/constants";

/**
 * Compress a PDF by re-encoding embedded JPEG image XObjects with sharp,
 * then saving with object stream packing.
 */
export async function compressPdf(
  buffer: Buffer,
  quality: QualityPreset
): Promise<Buffer> {
  const jpegQuality = QUALITY_PRESETS[quality].jpegQuality;
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  for (const [, pdfObject] of doc.context.enumerateIndirectObjects()) {
    if (!(pdfObject instanceof PDFRawStream)) continue;

    const subtype = pdfObject.dict.get(PDFName.of("Subtype"));
    if (subtype !== PDFName.of("Image")) continue;

    const filter = pdfObject.dict.get(PDFName.of("Filter"));
    const isDct = filter === PDFName.of("DCTDecode");
    const isJpx = filter === PDFName.of("JPXDecode");

    if (!isDct && !isJpx) continue;

    try {
      const originalBytes = pdfObject.contents;
      const recompressed = await sharp(Buffer.from(originalBytes))
        .jpeg({ quality: jpegQuality, mozjpeg: true })
        .toBuffer();

      if (recompressed.length < originalBytes.length) {
        (pdfObject as unknown as { contents: Uint8Array }).contents =
          recompressed;
        pdfObject.dict.set(
          PDFName.of("Length"),
          doc.context.obj(recompressed.length)
        );
        pdfObject.dict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
      }
    } catch (err) {
      // Skip images sharp cannot process (unsupported or corrupt XObjects)
      void err;
    }
  }

  const bytes = await doc.save({ useObjectStreams: true });
  return Buffer.from(bytes);
}
