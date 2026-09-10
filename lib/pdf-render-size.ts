/**
 * Sizing maths for PDF page previews. Kept free of pdf.js so it can be tested
 * and imported outside the browser.
 *
 * Previews are sized in two independent units: `cssSize` is the layout box the
 * page occupies on screen, while `pixelSize` is the bitmap actually rendered.
 * Keeping them separate lets us draw well above the layout size so the page
 * stays sharp on high-DPI screens instead of being upscaled by the browser.
 */

/** Longest side a preview canvas may have; iOS Safari refuses larger. */
export const MAX_CANVAS_SIDE = 8192;
/** Total pixels we are willing to allocate for one page. */
export const MAX_CANVAS_AREA = 16_777_216;
/**
 * Sampling above `devicePixelRatio`. The browser's downscale to the layout box
 * then acts as a resampling filter, which is what noisy low-DPI scans need.
 */
const SUPERSAMPLE = 2;
const MIN_PIXEL_RATIO = 2;
const MAX_PIXEL_RATIO = 3;

export type PdfRenderSize = {
  width: number;
  height: number;
};

/** Scale that fits a page into the given CSS box while preserving aspect ratio. */
export function fitPageToBox(
  pageWidth: number,
  pageHeight: number,
  maxWidth: number,
  maxHeight?: number
): number {
  if (pageWidth <= 0 || pageHeight <= 0) return 1;
  const widthScale = maxWidth / pageWidth;
  if (!maxHeight || maxHeight <= 0) return widthScale;
  return Math.min(widthScale, maxHeight / pageHeight);
}

/**
 * Device pixels per CSS pixel to render at, clamped so the canvas stays within
 * what browsers will allocate.
 *
 * A layout box large enough to blow the budget on its own drives this below 1.
 * That is a softer page, but a canvas the browser refuses to allocate renders
 * as nothing at all.
 */
export function resolvePixelRatio(
  cssWidth: number,
  cssHeight: number
): number {
  if (cssWidth <= 0 || cssHeight <= 0) return 1;

  const dpr =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  const ratio = Math.min(
    Math.max(dpr * SUPERSAMPLE, MIN_PIXEL_RATIO),
    MAX_PIXEL_RATIO
  );

  return Math.min(
    ratio,
    MAX_CANVAS_SIDE / Math.max(cssWidth, cssHeight),
    Math.sqrt(MAX_CANVAS_AREA / (cssWidth * cssHeight))
  );
}

/** Largest CSS width whose canvas still fits the budget, for a given page aspect. */
export function maxCssWidthForAspect(pageAspect: number): number {
  if (pageAspect <= 0) return MAX_CANVAS_SIDE;
  const bySide = Math.min(MAX_CANVAS_SIDE, MAX_CANVAS_SIDE / pageAspect);
  const byArea = Math.sqrt(MAX_CANVAS_AREA / pageAspect);
  return Math.floor(Math.min(bySide, byArea));
}
