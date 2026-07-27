/**
 * Add-image overlay for Edit PDF: place an uploaded image on pages as-is
 * (no background removal or transparency processing). Reuses the generic
 * placement/scope helpers from pdf-form-sign.
 */
import { decodeImageToCanvas } from "@/lib/signature-image";
import type { SignaturePosition, SignatureSpec } from "@/lib/pdf-form-sign";

/** Centered default placement for a newly added image overlay. */
export const DEFAULT_IMAGE_POSITION: SignaturePosition = {
  x: 0.325,
  y: 0.33,
  width: 0.35,
};

export const DEFAULT_IMAGE_SPEC: SignatureSpec = {
  pageScope: "all",
  selectedPages: [0],
  perPagePlacement: false,
  placement: DEFAULT_IMAGE_POSITION,
  pagePlacements: {},
  activePageIndex: 0,
};

/**
 * Decode an uploaded image and return it as PNG bytes without trimming or
 * altering pixels. Preserves the image exactly as-is (including any
 * background) so it can be embedded on the page unchanged.
 */
export async function fileToImagePng(file: File): Promise<Uint8Array> {
  const canvas = await decodeImageToCanvas(file);

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("Could not read image."));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/png");
  });
}
