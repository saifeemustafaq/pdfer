/**
 * Client-side PDF form fill and signature overlay (pdf-lib).
 */
import { PDFDocument, PDFCheckBox, PDFDropdown, PDFRadioGroup, PDFTextField } from "pdf-lib";

export type FormFieldKind = "text" | "checkbox" | "dropdown" | "radio";

export type FormFieldMeta = {
  name: string;
  kind: FormFieldKind;
  options?: string[];
};

export type SignaturePosition = {
  /** Normalized 0–1 from left edge. */
  x: number;
  /** Normalized 0–1 from bottom edge. */
  y: number;
  /** Width as fraction of page width. */
  width: number;
};

export type SignaturePageScope = "all" | "range" | "selected";

export type SignatureSpec = {
  pageScope: SignaturePageScope;
  /** 1-based inclusive when pageScope is range. */
  rangeStart?: number;
  rangeEnd?: number;
  /** Zero-based page indices when pageScope is selected. */
  selectedPages: number[];
  /** When true, each signed page can have its own placement. */
  perPagePlacement: boolean;
  /** Shared placement (all/range) or default when per-page entry is missing. */
  placement: SignaturePosition;
  /** Per-page overrides when perPagePlacement is true (0-based keys). */
  pagePlacements: Record<number, SignaturePosition>;
  /** Page shown in preview and edited in the sidebar. */
  activePageIndex: number;
};

export const SIGNATURE_WIDTH_MIN = 0.1;
export const SIGNATURE_WIDTH_MAX = 0.8;

export const DEFAULT_SIGNATURE_POSITION: SignaturePosition = {
  x: 0.55,
  y: 0.08,
  width: 0.35,
};

export const DEFAULT_SIGNATURE_SPEC: SignatureSpec = {
  pageScope: "all",
  selectedPages: [0],
  perPagePlacement: false,
  placement: DEFAULT_SIGNATURE_POSITION,
  pagePlacements: {},
  activePageIndex: 0,
};

/** @deprecated Use DEFAULT_SIGNATURE_SPEC */
export const DEFAULT_SIGNATURE_PLACEMENT = DEFAULT_SIGNATURE_SPEC;

export type SignaturePlacementPreset =
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export const SIGNATURE_PLACEMENT_PRESETS: Record<
  SignaturePlacementPreset,
  SignaturePosition
> = {
  "bottom-left": { x: 0.05, y: 0.08, width: 0.35 },
  "bottom-center": { x: 0.325, y: 0.08, width: 0.35 },
  "bottom-right": { x: 0.55, y: 0.08, width: 0.35 },
};

export function applySignaturePreset(
  current: SignaturePosition,
  preset: SignaturePlacementPreset
): SignaturePosition {
  return { ...current, ...SIGNATURE_PLACEMENT_PRESETS[preset] };
}

/** Normalized signature height as a fraction of page height. */
export function signatureHeightNorm(
  width: number,
  imageAspect: number,
  pageAspect: number
): number {
  return (width * imageAspect) / pageAspect;
}

/** Keep signature within page bounds for a given image and page aspect ratio. */
export function clampSignaturePosition(
  position: SignaturePosition,
  imageAspect: number,
  pageAspect: number
): SignaturePosition {
  const width = Math.max(
    SIGNATURE_WIDTH_MIN,
    Math.min(SIGNATURE_WIDTH_MAX, position.width)
  );
  const heightNorm = signatureHeightNorm(width, imageAspect, pageAspect);
  const maxX = Math.max(0, 1 - width);
  const maxY = Math.max(0, 1 - heightNorm);

  return {
    x: Math.max(0, Math.min(maxX, position.x)),
    y: Math.max(0, Math.min(maxY, position.y)),
    width,
  };
}

/** Read PNG width/height from the IHDR chunk (no DOM). */
export function readPngDimensions(
  png: Uint8Array
): { width: number; height: number } {
  if (png.length < 24 || png[0] !== 0x89) {
    throw new Error("Invalid PNG signature bytes.");
  }
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return {
    width: view.getUint32(16, false),
    height: view.getUint32(20, false),
  };
}

export function pngAspectRatio(png: Uint8Array): number {
  const { width, height } = readPngDimensions(png);
  if (width <= 0 || height <= 0) return 1;
  return height / width;
}

/** Zero-based page indices that receive a signature on export. */
export function getSignedPageIndices(
  spec: SignatureSpec,
  pageCount: number
): number[] {
  if (pageCount <= 0) return [];

  switch (spec.pageScope) {
    case "all":
      return Array.from({ length: pageCount }, (_, index) => index);
    case "range": {
      const start = Math.max(1, spec.rangeStart ?? 1);
      const end = Math.min(pageCount, spec.rangeEnd ?? pageCount);
      if (start > end) return [];
      return Array.from({ length: end - start + 1 }, (_, index) => start - 1 + index);
    }
    case "selected":
      return [...new Set(spec.selectedPages)]
        .filter((index) => index >= 0 && index < pageCount)
        .sort((a, b) => a - b);
    default:
      return [];
  }
}

export function isPageSigned(
  spec: SignatureSpec,
  pageIndex: number,
  pageCount: number
): boolean {
  return getSignedPageIndices(spec, pageCount).includes(pageIndex);
}

export function getPlacementForPage(
  spec: SignatureSpec,
  pageIndex: number
): SignaturePosition {
  if (spec.perPagePlacement && spec.pagePlacements[pageIndex]) {
    return spec.pagePlacements[pageIndex];
  }
  return spec.placement;
}

export function getActivePlacement(spec: SignatureSpec): SignaturePosition {
  return getPlacementForPage(spec, spec.activePageIndex);
}

export function setActivePlacement(
  spec: SignatureSpec,
  position: SignaturePosition
): SignatureSpec {
  if (spec.perPagePlacement) {
    return {
      ...spec,
      pagePlacements: {
        ...spec.pagePlacements,
        [spec.activePageIndex]: position,
      },
    };
  }
  return { ...spec, placement: position };
}

/** Copy the active placement to every signed page (enables per-page mode). */
export function applyActivePlacementToAllSignedPages(
  spec: SignatureSpec,
  pageCount: number
): SignatureSpec {
  const placement = getActivePlacement(spec);
  const pagePlacements = { ...spec.pagePlacements };
  for (const pageIndex of getSignedPageIndices(spec, pageCount)) {
    pagePlacements[pageIndex] = { ...placement };
  }
  return {
    ...spec,
    perPagePlacement: true,
    pagePlacements,
  };
}

/** Map PDF bottom-left placement to CSS overlay percentages. */
export function signatureOverlayStyle(
  position: SignaturePosition
): { left: string; bottom: string; width: string } {
  return {
    left: `${position.x * 100}%`,
    bottom: `${position.y * 100}%`,
    width: `${position.width * 100}%`,
  };
}

/** List fillable AcroForm fields in a PDF. */
export async function detectFormFields(pdfBlob: Blob): Promise<FormFieldMeta[]> {
  const buffer = await pdfBlob.arrayBuffer();
  const doc = await PDFDocument.load(buffer);
  const form = doc.getForm();
  const fields = form.getFields();
  const result: FormFieldMeta[] = [];

  for (const field of fields) {
    const name = field.getName();

    if (field instanceof PDFTextField) {
      result.push({ name, kind: "text" });
    } else if (field instanceof PDFCheckBox) {
      result.push({ name, kind: "checkbox" });
    } else if (field instanceof PDFDropdown) {
      result.push({ name, kind: "dropdown", options: field.getOptions() });
    } else if (field instanceof PDFRadioGroup) {
      result.push({ name, kind: "radio", options: field.getOptions() });
    }
  }

  return result;
}

function applyFieldValue(
  doc: PDFDocument,
  meta: FormFieldMeta,
  value: string | boolean
): void {
  const form = doc.getForm();
  const field = form.getField(meta.name);

  switch (meta.kind) {
    case "text": {
      (field as PDFTextField).setText(String(value));
      break;
    }
    case "checkbox": {
      const box = field as PDFCheckBox;
      if (value === true || value === "true" || value === "yes") {
        box.check();
      } else {
        box.uncheck();
      }
      break;
    }
    case "dropdown": {
      (field as PDFDropdown).select(String(value));
      break;
    }
    case "radio": {
      (field as PDFRadioGroup).select(String(value));
      break;
    }
    default:
      break;
  }
}

/** Fill AcroForm fields and return a new PDF blob. */
export async function fillFormFields(
  pdfBlob: Blob,
  values: Record<string, string | boolean>,
  fieldMeta: FormFieldMeta[]
): Promise<Blob> {
  const buffer = await pdfBlob.arrayBuffer();
  const doc = await PDFDocument.load(buffer);

  for (const meta of fieldMeta) {
    if (!(meta.name in values)) continue;
    applyFieldValue(doc, meta, values[meta.name]);
  }

  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

function drawSignatureOnPage(
  page: ReturnType<PDFDocument["getPage"]>,
  image: Awaited<ReturnType<PDFDocument["embedPng"]>>,
  position: SignaturePosition
): void {
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const pageAspect = pageWidth / pageHeight;
  const imageAspect = image.height / image.width;
  const clamped = clampSignaturePosition(position, imageAspect, pageAspect);
  const drawWidth = pageWidth * clamped.width;
  const drawHeight = drawWidth * imageAspect;

  page.drawImage(image, {
    x: pageWidth * clamped.x,
    y: pageHeight * clamped.y,
    width: drawWidth,
    height: drawHeight,
  });
}

/** Draw a PNG signature onto one or more pages according to spec. */
export async function applySignatures(
  pdfBlob: Blob,
  pngBytes: Uint8Array,
  spec: SignatureSpec
): Promise<Blob> {
  const buffer = await pdfBlob.arrayBuffer();
  const doc = await PDFDocument.load(buffer);
  const pageCount = doc.getPageCount();

  if (spec.pageScope === "range") {
    const start = spec.rangeStart ?? 1;
    const end = spec.rangeEnd ?? pageCount;
    if (start < 1 || end > pageCount || start > end) {
      throw new Error("Invalid signature page range.");
    }
  }

  const pageIndices = getSignedPageIndices(spec, pageCount);
  if (pageIndices.length === 0) {
    throw new Error("Select at least one page for the signature.");
  }

  const image = await doc.embedPng(pngBytes);

  for (const pageIndex of pageIndices) {
    const placement = getPlacementForPage(spec, pageIndex);
    drawSignatureOnPage(doc.getPage(pageIndex), image, placement);
  }

  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

/** Export pipeline: optional form fill then signature overlay. */
export async function exportFormSignPdf(
  pdfBlob: Blob,
  options: {
    fieldMeta?: FormFieldMeta[];
    fieldValues?: Record<string, string | boolean>;
    signaturePng?: Uint8Array | null;
    signatureSpec?: SignatureSpec;
  }
): Promise<Blob> {
  let working = pdfBlob;

  if (options.fieldMeta?.length && options.fieldValues) {
    working = await fillFormFields(working, options.fieldValues, options.fieldMeta);
  }

  if (options.signaturePng?.length) {
    working = await applySignatures(
      working,
      options.signaturePng,
      options.signatureSpec ?? DEFAULT_SIGNATURE_SPEC
    );
  }

  return working;
}
