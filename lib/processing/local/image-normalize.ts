/** Browser / Worker only */

import { ACCEPTED_JPEG_PNG_TYPES } from "../../constants";

/** Matches server image JPEG quality in lib/services/pdf-merger.ts and image-to-pdf.ts. */
export const LOCAL_IMAGE_JPEG_QUALITY = 90;

export type NormalizedImage = {
  data: Uint8Array;
  width: number;
  height: number;
};

function isJpegPngMime(mime: string): boolean {
  return (ACCEPTED_JPEG_PNG_TYPES as readonly string[]).includes(mime);
}

function isHeicMime(mime: string): boolean {
  return mime === "image/heic" || mime === "image/heif";
}

async function decodeHeicToJpegBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const heic2any = (await import("heic2any")).default;
  const input = new Blob([bytes as BlobPart]);
  const result = await heic2any({ blob: input, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(result) ? result[0] : result;
  if (!(blob instanceof Blob)) {
    throw new Error("HEIC conversion failed.");
  }
  return new Uint8Array(await blob.arrayBuffer());
}

/** Decode and re-encode an image to JPEG via canvas (no sharp). */
export async function normalizeImageToJpeg(
  bytes: Uint8Array
): Promise<NormalizedImage> {
  return normalizeImageForEmbed(bytes, "image/jpeg");
}

/**
 * Normalize any supported image type to JPEG bytes plus dimensions.
 */
export async function normalizeImageForEmbed(
  bytes: Uint8Array,
  mimeType: string
): Promise<NormalizedImage> {
  let jpegBytes = bytes;

  if (isHeicMime(mimeType)) {
    jpegBytes = await decodeHeicToJpegBytes(bytes);
  } else if (!isJpegPngMime(mimeType) && mimeType !== "image/webp") {
    throw new Error(`Unsupported image type: ${mimeType}`);
  }

  const copy = new Uint8Array(jpegBytes);
  const blob = new Blob([copy], {
    type: isJpegPngMime(mimeType) ? mimeType : "image/jpeg",
  });
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
    const data = new Uint8Array(await jpegBlob.arrayBuffer());

    return { data, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}
