/**
 * Composable Edit PDF export: page edits, watermark, form fill, signature.
 */
import { exportEditedPdf, type PageEditSpec } from "@/lib/pdf-client";
import { applyTextWatermark, type WatermarkSpec } from "@/lib/pdf-watermark";
import {
  applySignatures,
  exportFormSignPdf,
  type FormFieldMeta,
  type SignatureSpec,
} from "@/lib/pdf-form-sign";
import { DEFAULT_IMAGE_SPEC } from "@/lib/image-overlay";

export type EditExportOptions = {
  pageEdit?: PageEditSpec | null;
  watermark?: WatermarkSpec | null;
  formFillEnabled?: boolean;
  fieldMeta?: FormFieldMeta[];
  fieldValues?: Record<string, string | boolean>;
  signatureEnabled?: boolean;
  signaturePng?: Uint8Array | null;
  signatureSpec?: SignatureSpec;
  imageEnabled?: boolean;
  imagePng?: Uint8Array | null;
  imageSpec?: SignatureSpec;
};

/** Apply page edits, watermark, form fill, and signature in order. */
export async function exportEditedPdfFull(
  pdfBlob: Blob,
  options: EditExportOptions
): Promise<Blob> {
  let working = pdfBlob;

  if (options.pageEdit?.pageIndicesInOrder.length) {
    working = await exportEditedPdf(working, options.pageEdit);
  }

  if (options.watermark?.text.trim()) {
    working = await applyTextWatermark(working, options.watermark);
  }

  const hasForm =
    !!options.formFillEnabled &&
    !!options.fieldMeta?.length &&
    !!options.fieldValues &&
    Object.keys(options.fieldValues).length > 0;
  const hasSignature =
    !!options.signatureEnabled && !!options.signaturePng?.length;

  // Image overlay embeds the uploaded PNG as-is (applySignatures is a generic
  // PNG stamp: embed + place per SignatureSpec). Applied before the signature
  // so a signature (e.g. a cross-sign) lands on top of the image.
  if (options.imageEnabled && options.imagePng?.length) {
    working = await applySignatures(
      working,
      options.imagePng,
      options.imageSpec ?? DEFAULT_IMAGE_SPEC
    );
  }

  if (hasForm || hasSignature) {
    working = await exportFormSignPdf(working, {
      fieldMeta: options.fieldMeta,
      fieldValues: options.fieldValues,
      signaturePng: options.signaturePng,
      signatureSpec: options.signatureSpec,
    });
  }

  return working;
}
