/**
 * Free-placement annotation model and export engine for the Edit PDF
 * "Sign" tab. Users drop multiple signatures, text boxes, and shapes onto any
 * page; each is an independent object with its own position, size, and style.
 *
 * Coordinates are normalized 0-1 in PDF (bottom-left) space:
 * - x: distance from the left edge as a fraction of page width
 * - y: distance from the bottom edge as a fraction of page height
 * - width: fraction of page width
 * - height: fraction of page height
 *
 * This keeps the preview overlay and the pdf-lib export in the same space so
 * placement matches. Font size and stroke width are stored in absolute PDF
 * points and converted for the preview via the page's point size.
 */
import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
  type RGB,
} from "pdf-lib";

export type AnnotationType =
  | "signature"
  | "text"
  | "rect"
  | "ellipse"
  | "line";

export type AnnotationFontFamily = "helvetica" | "times" | "courier";

export type AnnotationTextAlign = "left" | "center" | "right";

type AnnotationBox = {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Clockwise rotation in degrees around the box center (0 = upright). */
  rotation: number;
};

export type SignatureAnnotation = AnnotationBox & {
  type: "signature";
};

export type TextAnnotation = AnnotationBox & {
  type: "text";
  text: string;
  /** Font size in PDF points. */
  fontSize: number;
  /** Hex color, e.g. #1a1a1a. */
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontFamily: AnnotationFontFamily;
  /** Horizontal alignment of text within the box. */
  align: AnnotationTextAlign;
};

export type ShapeAnnotation = AnnotationBox & {
  type: "rect" | "ellipse" | "line";
  strokeColor: string;
  /** Hex fill or null for transparent (not used for lines). */
  fillColor: string | null;
  /** Stroke width in PDF points. */
  strokeWidth: number;
};

export type Annotation =
  | SignatureAnnotation
  | TextAnnotation
  | ShapeAnnotation;

export const ANNOTATION_WIDTH_MIN = 0.03;
export const ANNOTATION_HEIGHT_MIN = 0.01;
/**
 * Vertical thickness of a line's bounding box (fraction of page height). Kept
 * small: the visible stroke runs along the box center, and this is mostly the
 * grab area for moving the line.
 */
export const LINE_BOX_HEIGHT = 0.045;
export const TEXT_FONT_SIZE_MIN = 6;
export const TEXT_FONT_SIZE_MAX = 96;
export const DEFAULT_TEXT_COLOR = "#111111";
export const DEFAULT_SHAPE_STROKE = "#e11d48";

/** Fresh id for a new annotation instance. */
function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Small diagonal offset so repeated "Add" clicks don't stack perfectly on top
 * of each other. Wraps after a few steps to stay on-page.
 */
function staggerOffset(existingCount: number): { dx: number; dy: number } {
  const step = existingCount % 6;
  return { dx: step * 0.03, dy: -step * 0.03 };
}

type CreateAnnotationInput = {
  type: AnnotationType;
  pageIndex: number;
  /** Count of annotations already on the page, for stagger offset. */
  existingOnPage?: number;
  /** Height/width for a signature, derived from the image aspect. */
  signatureAspect?: number;
  /** Page aspect (width/height) for signature height derivation. */
  pageAspect?: number;
};

/** Build a new annotation of the requested type with sensible defaults. */
export function createAnnotation(input: CreateAnnotationInput): Annotation {
  const { type, pageIndex } = input;
  const { dx, dy } = staggerOffset(input.existingOnPage ?? 0);
  const base = {
    id: newId(),
    pageIndex,
    rotation: 0,
  };

  switch (type) {
    case "signature": {
      const width = 0.3;
      const aspect = input.signatureAspect ?? 0.4;
      const pageAspect = input.pageAspect ?? 0.7727;
      const height = width * aspect * pageAspect;
      return {
        ...base,
        type: "signature",
        x: clamp01(0.35 + dx),
        y: clamp01(0.45 + dy),
        width,
        height,
      };
    }
    case "text":
      return {
        ...base,
        type: "text",
        x: clamp01(0.3 + dx),
        y: clamp01(0.6 + dy),
        width: 0.34,
        height: 0.07,
        text: "Text",
        fontSize: 16,
        color: DEFAULT_TEXT_COLOR,
        bold: false,
        italic: false,
        underline: false,
        fontFamily: "helvetica",
        align: "left",
      };
    case "line":
      // A line is modeled as a thin box with the stroke running horizontally
      // through the vertical center. `width` is the line length and `rotation`
      // is the line angle, so the endpoints are the box's left/right midpoints.
      return {
        ...base,
        type: "line",
        x: clamp01(0.3 + dx),
        y: clamp01(0.5 + dy),
        width: 0.3,
        height: LINE_BOX_HEIGHT,
        strokeColor: DEFAULT_SHAPE_STROKE,
        fillColor: null,
        strokeWidth: 2,
      };
    case "rect":
    case "ellipse":
      return {
        ...base,
        type,
        x: clamp01(0.3 + dx),
        y: clamp01(0.45 + dy),
        width: 0.28,
        height: 0.18,
        strokeColor: DEFAULT_SHAPE_STROKE,
        fillColor: null,
        strokeWidth: 2,
      };
    default:
      throw new Error(`Unknown annotation type: ${type}`);
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Keep an annotation box within the page bounds. */
export function clampAnnotationBox<T extends Annotation>(annotation: T): T {
  const width = Math.max(
    ANNOTATION_WIDTH_MIN,
    Math.min(1, annotation.width)
  );
  const height = Math.max(
    ANNOTATION_HEIGHT_MIN,
    Math.min(1, annotation.height)
  );
  const x = Math.max(0, Math.min(1 - width, annotation.x));
  const y = Math.max(0, Math.min(1 - height, annotation.y));
  return { ...annotation, x, y, width, height };
}

/** Annotations that live on a given page, in insertion order. */
export function annotationsForPage(
  annotations: Annotation[],
  pageIndex: number
): Annotation[] {
  return annotations.filter((a) => a.pageIndex === pageIndex);
}

/** Count annotations on a page (used for stagger offset). */
export function countOnPage(
  annotations: Annotation[],
  pageIndex: number
): number {
  return annotations.reduce(
    (total, a) => (a.pageIndex === pageIndex ? total + 1 : total),
    0
  );
}

/** Remove every signature instance on a page. */
export function removeSignaturesOnPage(
  annotations: Annotation[],
  pageIndex: number
): Annotation[] {
  return annotations.filter(
    (a) => !(a.type === "signature" && a.pageIndex === pageIndex)
  );
}

/** True when a page has at least one signature instance. */
export function pageHasSignature(
  annotations: Annotation[],
  pageIndex: number
): boolean {
  return annotations.some(
    (a) => a.type === "signature" && a.pageIndex === pageIndex
  );
}

/** Replace one annotation by id with a patch (type-safe within its variant). */
export function updateAnnotation(
  annotations: Annotation[],
  id: string,
  patch: Partial<Annotation>
): Annotation[] {
  return annotations.map((a) =>
    a.id === id ? ({ ...a, ...patch } as Annotation) : a
  );
}

/** Remove one annotation by id. */
export function deleteAnnotation(
  annotations: Annotation[],
  id: string
): Annotation[] {
  return annotations.filter((a) => a.id !== id);
}

/** Parse a #rgb or #rrggbb hex string into a pdf-lib RGB (0-1 channels). */
export function hexToRgb(hex: string): RGB {
  let value = hex.trim().replace(/^#/, "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (value.length !== 6 || /[^0-9a-fA-F]/.test(value)) {
    return rgb(0, 0, 0);
  }
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

/** Map a family plus bold/italic flags to a pdf-lib StandardFont key. */
export function fontVariant(
  family: AnnotationFontFamily,
  bold: boolean,
  italic: boolean
): StandardFonts {
  switch (family) {
    case "times":
      if (bold && italic) return StandardFonts.TimesRomanBoldItalic;
      if (bold) return StandardFonts.TimesRomanBold;
      if (italic) return StandardFonts.TimesRomanItalic;
      return StandardFonts.TimesRoman;
    case "courier":
      if (bold && italic) return StandardFonts.CourierBoldOblique;
      if (bold) return StandardFonts.CourierBold;
      if (italic) return StandardFonts.CourierOblique;
      return StandardFonts.Courier;
    case "helvetica":
    default:
      if (bold && italic) return StandardFonts.HelveticaBoldOblique;
      if (bold) return StandardFonts.HelveticaBold;
      if (italic) return StandardFonts.HelveticaOblique;
      return StandardFonts.Helvetica;
  }
}

/**
 * Wrap text to a maximum width in points, honoring explicit newlines. Words
 * longer than the box are hard-split so they never overflow silently.
 */
export function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/(\s+)/).filter((w) => w.length > 0);
    let current = "";

    const pushWord = (word: string) => {
      const candidate = current + word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth || !current) {
        current = candidate;
        return;
      }
      lines.push(current.trimEnd());
      current = word.trimStart();
    };

    for (const word of words) {
      // Hard-split words wider than the box.
      if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
        for (const char of word) {
          if (
            current &&
            font.widthOfTextAtSize(current + char, fontSize) > maxWidth
          ) {
            lines.push(current);
            current = "";
          }
          current += char;
        }
        continue;
      }
      pushWord(word);
    }
    lines.push(current.trimEnd());
  }

  return lines;
}

type PageLike = ReturnType<PDFDocument["getPage"]>;
type Point = { x: number; y: number };

/**
 * PDF space is y-up with counterclockwise-positive rotation, while the preview
 * (and our stored rotation) is y-down with clockwise-positive rotation. So the
 * pdf-lib rotation angle is the negation of the stored clockwise degrees.
 */
function pdfPhiRad(rotationCw: number): number {
  return (-rotationCw * Math.PI) / 180;
}

/** Rotate a point around a center by phi radians (standard y-up CCW). */
function rotatePoint(p: Point, center: Point, phi: number): Point {
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

function drawSignatureAnnotation(
  page: PageLike,
  image: Awaited<ReturnType<PDFDocument["embedPng"]>>,
  a: SignatureAnnotation
): void {
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const imageAspect = image.height / image.width;
  const boxX = pageWidth * a.x;
  const boxY = pageHeight * a.y;
  const drawWidth = pageWidth * a.width;
  const drawHeight = drawWidth * imageAspect;
  const center = { x: boxX + drawWidth / 2, y: boxY + drawHeight / 2 };
  const phi = pdfPhiRad(a.rotation);
  // pdf-lib rotates the image around its lower-left origin, so pre-rotate the
  // origin around the box center to achieve a center rotation.
  const origin = rotatePoint({ x: boxX, y: boxY }, center, phi);
  page.drawImage(image, {
    x: origin.x,
    y: origin.y,
    width: drawWidth,
    height: drawHeight,
    rotate: degrees(-a.rotation),
  });
}

function drawTextAnnotation(
  page: PageLike,
  font: PDFFont,
  a: TextAnnotation
): void {
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const boxX = pageWidth * a.x;
  const boxY = pageHeight * a.y;
  const boxTop = pageHeight * (a.y + a.height);
  const boxWidth = pageWidth * a.width;
  const boxHeight = pageHeight * a.height;
  const center = { x: boxX + boxWidth / 2, y: boxY + boxHeight / 2 };
  const phi = pdfPhiRad(a.rotation);
  const color = hexToRgb(a.color);
  const lineHeight = a.fontSize * 1.25;
  const lines = wrapText(a.text, font, a.fontSize, boxWidth);
  const align = a.align ?? "left";

  lines.forEach((line, index) => {
    if (line.length === 0) return;
    const baseline = boxTop - a.fontSize - index * lineHeight;
    // Offset the line start within the box for center/right alignment.
    const lineWidth = font.widthOfTextAtSize(line, a.fontSize);
    const alignOffset =
      align === "center"
        ? Math.max(0, (boxWidth - lineWidth) / 2)
        : align === "right"
          ? Math.max(0, boxWidth - lineWidth)
          : 0;
    const lineX = boxX + alignOffset;
    const origin = rotatePoint({ x: lineX, y: baseline }, center, phi);
    page.drawText(line, {
      x: origin.x,
      y: origin.y,
      size: a.fontSize,
      font,
      color,
      rotate: degrees(-a.rotation),
    });
    if (a.underline) {
      const underlineY = baseline - a.fontSize * 0.12;
      const start = rotatePoint({ x: lineX, y: underlineY }, center, phi);
      const end = rotatePoint(
        { x: lineX + lineWidth, y: underlineY },
        center,
        phi
      );
      page.drawLine({
        start,
        end,
        thickness: Math.max(0.5, a.fontSize * 0.06),
        color,
      });
    }
  });
}

function drawShapeAnnotation(page: PageLike, a: ShapeAnnotation): void {
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const boxX = pageWidth * a.x;
  const boxY = pageHeight * a.y;
  const boxWidth = pageWidth * a.width;
  const boxHeight = pageHeight * a.height;
  const center = { x: boxX + boxWidth / 2, y: boxY + boxHeight / 2 };
  const phi = pdfPhiRad(a.rotation);
  const stroke = hexToRgb(a.strokeColor);
  const fill = a.fillColor ? hexToRgb(a.fillColor) : undefined;

  if (a.type === "rect") {
    const origin = rotatePoint({ x: boxX, y: boxY }, center, phi);
    page.drawRectangle({
      x: origin.x,
      y: origin.y,
      width: boxWidth,
      height: boxHeight,
      borderColor: stroke,
      borderWidth: a.strokeWidth,
      color: fill,
      rotate: degrees(-a.rotation),
    });
    return;
  }

  if (a.type === "ellipse") {
    // drawEllipse anchors at the center, so rotation is applied in place.
    page.drawEllipse({
      x: center.x,
      y: center.y,
      xScale: boxWidth / 2,
      yScale: boxHeight / 2,
      borderColor: stroke,
      borderWidth: a.strokeWidth,
      color: fill,
      rotate: degrees(-a.rotation),
    });
    return;
  }

  // Line: horizontal through the box's vertical center, then rotated by the
  // stored angle. This matches the preview (a centered stroke + box rotation)
  // and lets the endpoints be dragged freely.
  const midY = boxY + boxHeight / 2;
  const start = rotatePoint({ x: boxX, y: midY }, center, phi);
  const end = rotatePoint({ x: boxX + boxWidth, y: midY }, center, phi);
  page.drawLine({
    start,
    end,
    thickness: a.strokeWidth,
    color: stroke,
  });
}

/**
 * Draw every annotation onto its page and return a new PDF blob. Signature
 * annotations reference the single shared signature PNG.
 */
export async function applyAnnotations(
  pdfBlob: Blob,
  annotations: Annotation[],
  signaturePng: Uint8Array | null
): Promise<Blob> {
  if (annotations.length === 0) return pdfBlob;

  const buffer = await pdfBlob.arrayBuffer();
  const doc = await PDFDocument.load(buffer);
  const pageCount = doc.getPageCount();

  const needsSignature = annotations.some((a) => a.type === "signature");
  const signatureImage =
    needsSignature && signaturePng?.length
      ? await doc.embedPng(signaturePng)
      : null;

  // Cache embedded fonts by StandardFonts key.
  const fontCache = new Map<StandardFonts, PDFFont>();
  const getFont = async (key: StandardFonts): Promise<PDFFont> => {
    const cached = fontCache.get(key);
    if (cached) return cached;
    const font = await doc.embedFont(key);
    fontCache.set(key, font);
    return font;
  };

  for (const a of annotations) {
    if (a.pageIndex < 0 || a.pageIndex >= pageCount) continue;
    const page = doc.getPage(a.pageIndex);

    if (a.type === "signature") {
      if (signatureImage) drawSignatureAnnotation(page, signatureImage, a);
      continue;
    }
    if (a.type === "text") {
      const font = await getFont(fontVariant(a.fontFamily, a.bold, a.italic));
      drawTextAnnotation(page, font, a);
      continue;
    }
    drawShapeAnnotation(page, a);
  }

  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}
