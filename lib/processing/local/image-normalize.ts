/** Browser / Worker only */

/** Matches server image JPEG quality in lib/services/pdf-merger.ts and image-to-pdf.ts. */
export const LOCAL_IMAGE_JPEG_QUALITY = 90;

export type NormalizedImage = {
  data: Uint8Array;
  width: number;
  height: number;
};

/** Decode and re-encode an image to JPEG via canvas (no sharp). */
export async function normalizeImageToJpeg(
  bytes: Uint8Array
): Promise<NormalizedImage> {
  const copy = new Uint8Array(bytes);
  const blob = new Blob([copy]);
  const bitmap = await createImageBitmap(blob);

  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas not available");
    }

    ctx.drawImage(bitmap, 0, 0);
    const jpegBlob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: LOCAL_IMAGE_JPEG_QUALITY / 100,
    });
    const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());

    return { data: jpegBytes, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}
