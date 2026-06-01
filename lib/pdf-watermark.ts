/**
 * Client-side PDF text watermark (pdf-lib). Safe to import from client components.
 */
import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

export type WatermarkPosition = "center" | "diagonal" | "footer";

export type WatermarkPageScope = "all" | "range";

export type WatermarkSpec = {
  text: string;
  opacity: number;
  rotationDegrees: number;
  position: WatermarkPosition;
  pageScope: WatermarkPageScope;
  /** Multiplier on auto font size. Default 1. */
  fontSizeScale: number;
  /** 1-based inclusive when pageScope is range. */
  rangeStart?: number;
  rangeEnd?: number;
};

export const DEFAULT_WATERMARK_SPEC: WatermarkSpec = {
  text: "CONFIDENTIAL",
  opacity: 0.3,
  rotationDegrees: 45,
  position: "diagonal",
  pageScope: "all",
  fontSizeScale: 1,
};

export type WatermarkLayout = {
  fontSize: number;
  rotationDegrees: number;
  opacity: number;
  /** PDF coordinates: origin bottom-left. */
  x: number;
  y: number;
};

export function resolveWatermarkRotation(spec: WatermarkSpec): number {
  if (spec.position === "footer" || spec.position === "center") {
    return spec.position === "center" ? 0 : 0;
  }
  return spec.rotationDegrees;
}

export function resolveWatermarkFontSize(
  pageWidth: number,
  pageHeight: number,
  spec: WatermarkSpec
): number {
  const base =
    spec.position === "footer"
      ? Math.min(24, pageWidth * 0.04)
      : Math.min(48, Math.min(pageWidth, pageHeight) * 0.12);
  const scale = Math.min(2, Math.max(0.5, spec.fontSizeScale || 1));
  return base * scale;
}

/** Shared layout for pdf-lib export and CSS preview overlay. */
export function computeWatermarkLayout(
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  spec: WatermarkSpec
): WatermarkLayout {
  const trimmed = spec.text.trim();
  const fontSize = resolveWatermarkFontSize(pageWidth, pageHeight, spec);
  const rotationDegrees = resolveWatermarkRotation(spec);
  const opacity = Math.min(1, Math.max(0.05, spec.opacity));

  if (!trimmed) {
    return { fontSize, rotationDegrees, opacity, x: 0, y: 0 };
  }

  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;

  if (spec.position === "footer") {
    return {
      fontSize,
      rotationDegrees: 0,
      opacity,
      x: (pageWidth - textWidth) / 2,
      y: pageHeight * 0.06,
    };
  }

  const angleRad = (rotationDegrees * Math.PI) / 180;
  const x =
    centerX -
    (textWidth / 2) * Math.cos(angleRad) +
    (fontSize / 2) * Math.sin(angleRad);
  const y =
    centerY -
    (textWidth / 2) * Math.sin(angleRad) -
    (fontSize / 2) * Math.cos(angleRad);

  return { fontSize, rotationDegrees, opacity, x, y };
}

function drawWatermarkOnPage(
  page: PDFPage,
  font: PDFFont,
  spec: WatermarkSpec
): void {
  const trimmed = spec.text.trim();
  if (!trimmed) return;

  const { width, height } = page.getSize();
  const fontSize = resolveWatermarkFontSize(width, height, spec);
  const textWidth = font.widthOfTextAtSize(trimmed, fontSize);
  const layout = computeWatermarkLayout(width, height, textWidth, spec);

  page.drawText(trimmed, {
    x: layout.x,
    y: layout.y,
    size: fontSize,
    font,
    color: rgb(0.4, 0.4, 0.4),
    opacity: layout.opacity,
    rotate: degrees(layout.rotationDegrees),
  });
}

function pageIndexInScope(
  pageIndex: number,
  pageCount: number,
  spec: WatermarkSpec
): boolean {
  if (spec.pageScope === "all") return true;

  const start = spec.rangeStart ?? 1;
  const end = spec.rangeEnd ?? pageCount;
  const pageNumber = pageIndex + 1;
  return pageNumber >= start && pageNumber <= end;
}

/** Apply a text watermark to every page (or a page range) of a PDF blob. */
export async function applyTextWatermark(
  pdfBlob: Blob,
  spec: WatermarkSpec
): Promise<Blob> {
  const trimmed = spec.text.trim();
  if (!trimmed) {
    throw new Error("Watermark text is required.");
  }

  const buffer = await pdfBlob.arrayBuffer();
  const doc = await PDFDocument.load(buffer);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pageCount = doc.getPageCount();

  if (spec.pageScope === "range") {
    const start = spec.rangeStart ?? 1;
    const end = spec.rangeEnd ?? pageCount;
    if (start < 1 || end > pageCount || start > end) {
      throw new Error("Invalid watermark page range.");
    }
  }

  doc.getPages().forEach((page, index) => {
    if (pageIndexInScope(index, pageCount, spec)) {
      drawWatermarkOnPage(page, font, spec);
    }
  });

  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}
