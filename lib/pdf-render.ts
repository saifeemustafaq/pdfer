/** Shared pdf.js page rasterisation for on-screen previews. */
import * as PDFJS from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import {
  fitPageToBox,
  resolvePixelRatio,
  type PdfRenderSize,
} from "@/lib/pdf-render-size";

PDFJS.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

/**
 * Runtime assets pdf.js fetches on demand, copied into `public/pdfjs` by
 * `scripts/copy-pdfjs-assets.mjs`.
 *
 * These are not optional. Without `standardFontDataUrl` a PDF that references
 * but does not embed the standard 14 fonts renders those runs as blank space,
 * and without `wasmUrl` the JBIG2 and JPEG 2000 decoders that scanned documents
 * rely on are unavailable.
 */
const PDFJS_ASSET_OPTIONS = {
  standardFontDataUrl: "/pdfjs/standard_fonts/",
  cMapUrl: "/pdfjs/cmaps/",
  cMapPacked: true,
  wasmUrl: "/pdfjs/wasm/",
  iccUrl: "/pdfjs/iccs/",
} as const;

export {
  fitPageToBox,
  maxCssWidthForAspect,
  resolvePixelRatio,
  type PdfRenderSize,
} from "@/lib/pdf-render-size";

export type RenderedPdfPageCanvas = {
  canvas: HTMLCanvasElement;
  /** Layout size in CSS pixels. */
  cssSize: PdfRenderSize;
  /** Bitmap size in device pixels. */
  pixelSize: PdfRenderSize;
  /** Intrinsic page size in PDF points. */
  pagePtSize: PdfRenderSize;
};

export type RenderedPdfPageBitmap = Omit<RenderedPdfPageCanvas, "canvas"> & {
  /** Object URL for a lossless PNG. Callers must revoke it. */
  objectUrl: string;
};

export type RenderPdfPageOptions = {
  /** Layout width budget in CSS pixels. */
  maxWidth: number;
  /** Layout height budget in CSS pixels. Omit to fit width only. */
  maxHeight?: number;
  signal?: AbortSignal;
};

/**
 * Load a PDF for rendering. Every render path goes through here so no surface
 * can silently miss the asset options above.
 *
 * The caller owns the returned proxy and must destroy it.
 */
export async function loadPdfDocument(
  source: Blob | ArrayBuffer
): Promise<PDFDocumentProxy> {
  const data =
    source instanceof Blob ? await source.arrayBuffer() : source;
  return PDFJS.getDocument({ data, ...PDFJS_ASSET_OPTIONS }).promise;
}

/** True when an error reports a superseded render, not a real failure. */
export function isPdfRenderCancelled(error: unknown): boolean {
  if (error instanceof PDFJS.RenderingCancelledException) return true;
  return (
    error instanceof Error &&
    (error.name === "RenderingCancelledException" ||
      error.name === "AbortError")
  );
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not encode the page preview."));
    }, "image/png");
  });
}

/**
 * Rasterise one page onto a detached canvas sized for the given CSS box.
 * Rendering is lossless up to this point; no re-encoding has happened yet.
 */
export async function renderPdfPageToCanvas(
  page: PDFPageProxy,
  { maxWidth, maxHeight, signal }: RenderPdfPageOptions
): Promise<RenderedPdfPageCanvas> {
  const baseViewport = page.getViewport({ scale: 1 });
  const cssScale = fitPageToBox(
    baseViewport.width,
    baseViewport.height,
    maxWidth,
    maxHeight
  );
  const cssViewport = page.getViewport({ scale: cssScale });
  const pixelRatio = resolvePixelRatio(cssViewport.width, cssViewport.height);
  const pixelViewport = page.getViewport({ scale: cssScale * pixelRatio });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(pixelViewport.width));
  canvas.height = Math.max(1, Math.floor(pixelViewport.height));

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const task = page.render({
    canvas,
    canvasContext: ctx,
    viewport: pixelViewport,
    intent: "display",
    // Opaque white so a page with no background does not show the app theme
    // through it once the bitmap is encoded with an alpha channel.
    background: "#ffffff",
  });

  const abort = () => task.cancel();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    await task.promise;
  } finally {
    signal?.removeEventListener("abort", abort);
  }

  return {
    canvas,
    cssSize: { width: cssViewport.width, height: cssViewport.height },
    pixelSize: { width: canvas.width, height: canvas.height },
    pagePtSize: { width: baseViewport.width, height: baseViewport.height },
  };
}

/**
 * Rasterise one page to a lossless PNG object URL. PNG rather than JPEG so a
 * low-quality source is not degraded further by compression artefacts.
 */
export async function renderPdfPageToBitmap(
  page: PDFPageProxy,
  options: RenderPdfPageOptions
): Promise<RenderedPdfPageBitmap> {
  const { canvas, ...sizes } = await renderPdfPageToCanvas(page, options);
  const blob = await canvasToPngBlob(canvas);

  // Free the backing store now; the PNG is the only thing we keep.
  canvas.width = 0;
  canvas.height = 0;

  // Encoding is not cancellable, so drop the result if the caller moved on
  // rather than handing back an object URL nobody will revoke.
  options.signal?.throwIfAborted();

  return { ...sizes, objectUrl: URL.createObjectURL(blob) };
}
