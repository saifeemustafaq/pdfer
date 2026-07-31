/**
 * Composable Edit PDF export: page edits, watermark, image overlay, annotations.
 */
import { exportEditedPdf, type PageEditSpec } from "@/lib/pdf-client";
import { applyTextWatermark, type WatermarkSpec } from "@/lib/pdf-watermark";
import {
  applySignatures,
  getSignedPageIndices,
  type SignatureSpec,
} from "@/lib/pdf-form-sign";
import { applyAnnotations, type Annotation } from "@/lib/pdf-annotations";
import { DEFAULT_IMAGE_SPEC } from "@/lib/image-overlay";

export type EditExportOptions = {
  pageEdit?: PageEditSpec | null;
  /** Page count of the original (pre-edit) document, for index remapping. */
  originalPageCount?: number;
  watermark?: WatermarkSpec | null;
  imageEnabled?: boolean;
  imagePng?: Uint8Array | null;
  imageSpec?: SignatureSpec;
  /** Free-placement signatures, text, and shapes for the Sign tab. */
  annotations?: Annotation[];
  /** Shared signature PNG referenced by signature annotations. */
  signaturePng?: Uint8Array | null;
};

/**
 * Map every source page index to its position in the edited output, or null
 * when the page edit keeps all pages in their original order (no remap needed).
 * Source pages that were removed are absent from the map.
 */
export function pageEditOrderMap(
  pageEdit: PageEditSpec | null | undefined
): Map<number, number> | null {
  const order = pageEdit?.pageIndicesInOrder;
  if (!order || order.length === 0) return null;
  const map = new Map<number, number>();
  order.forEach((sourceIndex, outputIndex) => map.set(sourceIndex, outputIndex));
  return map;
}

/**
 * Re-point annotations at their output page after a page edit. Annotations on
 * removed pages are dropped; the rest follow their page to its new position.
 */
export function remapAnnotationsForPageEdit(
  annotations: Annotation[],
  pageEdit: PageEditSpec | null | undefined
): Annotation[] {
  const map = pageEditOrderMap(pageEdit);
  if (!map) return annotations;
  const remapped: Annotation[] = [];
  for (const annotation of annotations) {
    const outputIndex = map.get(annotation.pageIndex);
    if (outputIndex === undefined) continue;
    remapped.push({ ...annotation, pageIndex: outputIndex });
  }
  return remapped;
}

/**
 * Re-point an image/signature spec at the edited output pages. Removed pages
 * are dropped and the scope is normalized to an explicit selection so range and
 * "all" targets stay correct after removal/reorder.
 */
export function remapSignatureSpecForPageEdit(
  spec: SignatureSpec,
  originalPageCount: number,
  pageEdit: PageEditSpec | null | undefined
): SignatureSpec {
  const map = pageEditOrderMap(pageEdit);
  if (!map) return spec;

  const targeted = getSignedPageIndices(spec, originalPageCount);
  const selectedPages = targeted
    .map((sourceIndex) => map.get(sourceIndex))
    .filter((index): index is number => index !== undefined)
    .sort((a, b) => a - b);

  const pagePlacements: Record<number, SignatureSpec["placement"]> = {};
  for (const [sourceKey, placement] of Object.entries(spec.pagePlacements)) {
    const outputIndex = map.get(Number(sourceKey));
    if (outputIndex !== undefined) pagePlacements[outputIndex] = placement;
  }

  return {
    ...spec,
    pageScope: "selected",
    selectedPages,
    pagePlacements,
    activePageIndex: map.get(spec.activePageIndex) ?? 0,
  };
}

/** Apply page edits, watermark, image overlay, and annotations in order. */
export async function exportEditedPdfFull(
  pdfBlob: Blob,
  options: EditExportOptions
): Promise<Blob> {
  let working = pdfBlob;

  // A page edit reorders/removes pages, so every downstream per-page operation
  // must reference the *output* page indices, not the original ones.
  const applyPageEdit = !!options.pageEdit?.pageIndicesInOrder.length;
  const pageEdit = applyPageEdit ? options.pageEdit! : null;

  if (applyPageEdit) {
    working = await exportEditedPdf(working, pageEdit!);
  }

  if (options.watermark?.text.trim()) {
    working = await applyTextWatermark(working, options.watermark);
  }

  // Image overlay embeds the uploaded PNG as-is (applySignatures is a generic
  // PNG stamp: embed + place per SignatureSpec). Applied before annotations so
  // a signature or text lands on top of the image.
  if (options.imageEnabled && options.imagePng?.length) {
    const imageSpec = pageEdit
      ? remapSignatureSpecForPageEdit(
          options.imageSpec ?? DEFAULT_IMAGE_SPEC,
          options.originalPageCount ?? 0,
          pageEdit
        )
      : options.imageSpec ?? DEFAULT_IMAGE_SPEC;
    // Skip when every targeted page was removed.
    if (imageSpec.selectedPages.length > 0 || imageSpec.pageScope !== "selected") {
      working = await applySignatures(working, options.imagePng, imageSpec);
    }
  }

  if (options.annotations?.length) {
    const annotations = remapAnnotationsForPageEdit(
      options.annotations,
      pageEdit
    );
    if (annotations.length > 0) {
      working = await applyAnnotations(
        working,
        annotations,
        options.signaturePng ?? null
      );
    }
  }

  return working;
}
