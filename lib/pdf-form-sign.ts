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

export type SignaturePlacement = {
  /** Zero-based page index. */
  pageIndex: number;
  /** Normalized 0–1 from left edge. */
  x: number;
  /** Normalized 0–1 from bottom edge. */
  y: number;
  /** Width as fraction of page width. */
  width: number;
};

export const DEFAULT_SIGNATURE_PLACEMENT: SignaturePlacement = {
  pageIndex: 0,
  x: 0.55,
  y: 0.08,
  width: 0.35,
};

export type SignaturePlacementPreset =
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export const SIGNATURE_PLACEMENT_PRESETS: Record<
  SignaturePlacementPreset,
  Pick<SignaturePlacement, "x" | "y" | "width">
> = {
  "bottom-left": { x: 0.05, y: 0.08, width: 0.35 },
  "bottom-center": { x: 0.325, y: 0.08, width: 0.35 },
  "bottom-right": { x: 0.55, y: 0.08, width: 0.35 },
};

export function applySignaturePreset(
  current: SignaturePlacement,
  preset: SignaturePlacementPreset
): SignaturePlacement {
  return { ...current, ...SIGNATURE_PLACEMENT_PRESETS[preset] };
}

/** Map PDF bottom-left placement to CSS overlay percentages. */
export function signatureOverlayStyle(
  placement: SignaturePlacement
): { left: string; bottom: string; width: string } {
  return {
    left: `${placement.x * 100}%`,
    bottom: `${placement.y * 100}%`,
    width: `${placement.width * 100}%`,
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

/** Draw a PNG signature image onto a page. */
export async function applySignature(
  pdfBlob: Blob,
  pngBytes: Uint8Array,
  placement: SignaturePlacement
): Promise<Blob> {
  const buffer = await pdfBlob.arrayBuffer();
  const doc = await PDFDocument.load(buffer);
  const pageCount = doc.getPageCount();

  if (
    placement.pageIndex < 0 ||
    placement.pageIndex >= pageCount ||
    !Number.isFinite(placement.x) ||
    !Number.isFinite(placement.y)
  ) {
    throw new Error("Invalid signature placement.");
  }

  const image = await doc.embedPng(pngBytes);
  const page = doc.getPage(placement.pageIndex);
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const drawWidth = pageWidth * placement.width;
  const aspect = image.height / image.width;
  const drawHeight = drawWidth * aspect;
  const x = pageWidth * placement.x;
  const y = pageHeight * placement.y;

  page.drawImage(image, {
    x,
    y,
    width: drawWidth,
    height: drawHeight,
  });

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
    signaturePlacement?: SignaturePlacement;
  }
): Promise<Blob> {
  let working = pdfBlob;

  if (options.fieldMeta?.length && options.fieldValues) {
    working = await fillFormFields(working, options.fieldValues, options.fieldMeta);
  }

  if (options.signaturePng?.length) {
    working = await applySignature(
      working,
      options.signaturePng,
      options.signaturePlacement ?? DEFAULT_SIGNATURE_PLACEMENT
    );
  }

  return working;
}
