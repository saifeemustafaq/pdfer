/**
 * Composable Edit PDF export: page edits, watermark, form fill, signature.
 */
import { exportEditedPdf, type PageEditSpec } from "@/lib/pdf-client";
import { applyTextWatermark, type WatermarkSpec } from "@/lib/pdf-watermark";
import {
  exportFormSignPdf,
  type FormFieldMeta,
  type SignaturePlacement,
} from "@/lib/pdf-form-sign";

export type EditExportOptions = {
  pageEdit?: PageEditSpec | null;
  watermark?: WatermarkSpec | null;
  formFillEnabled?: boolean;
  fieldMeta?: FormFieldMeta[];
  fieldValues?: Record<string, string | boolean>;
  signatureEnabled?: boolean;
  signaturePng?: Uint8Array | null;
  signaturePlacement?: SignaturePlacement;
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

  if (hasForm || hasSignature) {
    working = await exportFormSignPdf(working, {
      fieldMeta: options.fieldMeta,
      fieldValues: options.fieldValues,
      signaturePng: options.signaturePng,
      signaturePlacement: options.signaturePlacement,
    });
  }

  return working;
}
