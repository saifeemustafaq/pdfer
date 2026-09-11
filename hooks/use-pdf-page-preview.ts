"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import { isPdfRenderCancelled, renderPdfPageToBitmap } from "@/lib/pdf-render";

/** Layout width for edit-tool page previews when the container is unmeasured. */
export const PDF_PAGE_PREVIEW_MAX_WIDTH = 900;

/**
 * Preview widths are snapped to this step so a resize drag does not queue a
 * re-render for every intermediate pixel.
 */
const WIDTH_STEP = 8;

export type PdfPagePreviewSize = {
  width: number;
  height: number;
};

export type PdfPagePreviewOptions = {
  /** Layout width budget in CSS pixels. */
  maxWidth?: number;
  /** Layout height budget in CSS pixels. Zero or omitted means unconstrained. */
  maxHeight?: number;
};

export type PdfPagePreviewState = {
  /** Shared document proxy, so other views need not re-parse the same file. */
  pdf: PDFDocumentProxy | null;
  pageImageUrl: string | null;
  /** Layout size in CSS pixels; overlays position against this. */
  renderSize: PdfPagePreviewSize;
  /** Bitmap size in device pixels. */
  pixelSize: PdfPagePreviewSize;
  pagePtSize: PdfPagePreviewSize;
  loading: boolean;
  error: string | null;
};

type RenderedBitmap = {
  objectUrl: string;
  renderSize: PdfPagePreviewSize;
  pixelSize: PdfPagePreviewSize;
  pagePtSize: PdfPagePreviewSize;
};

type PreviewResult = {
  /** The document this result belongs to, so a stale one is easy to spot. */
  pdf: PDFDocumentProxy;
  bitmap: RenderedBitmap | null;
  error: string | null;
};

const EMPTY_SIZE: PdfPagePreviewSize = { width: 0, height: 0 };

function snapWidth(width: number): number {
  return Math.max(WIDTH_STEP, Math.floor(width / WIDTH_STEP) * WIDTH_STEP);
}

/** Rasterise one PDF page for in-app previews (watermark, signature, etc.). */
export function usePdfPagePreview(
  pdfBlob: Blob,
  pageNumber: number,
  options: PdfPagePreviewOptions = {}
): PdfPagePreviewState {
  const { maxWidth = PDF_PAGE_PREVIEW_MAX_WIDTH, maxHeight } = options;
  const targetWidth = snapWidth(maxWidth);
  const targetHeight = maxHeight ? Math.floor(maxHeight) : undefined;

  const { pdf, loading: docLoading, error: docError } = usePdfDocument(pdfBlob);

  const [result, setResult] = useState<PreviewResult | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // A new document invalidates the current bitmap. Page and size changes do
  // not, so the previous page stays on screen while the next one renders
  // instead of collapsing the layout to a skeleton.
  const current = result?.pdf === pdf ? result : null;

  useEffect(() => {
    if (!pdf) return;

    let cancelled = false;
    const controller = new AbortController();

    async function renderPreviewPage(document: PDFDocumentProxy) {
      try {
        const pageNum = Math.min(Math.max(1, pageNumber), document.numPages);
        const page = await document.getPage(pageNum);
        controller.signal.throwIfAborted();

        const bitmap = await renderPdfPageToBitmap(page, {
          maxWidth: targetWidth,
          maxHeight: targetHeight,
          signal: controller.signal,
        });

        if (cancelled) {
          URL.revokeObjectURL(bitmap.objectUrl);
          return;
        }

        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = bitmap.objectUrl;

        setResult({
          pdf: document,
          bitmap: {
            objectUrl: bitmap.objectUrl,
            renderSize: bitmap.cssSize,
            pixelSize: bitmap.pixelSize,
            pagePtSize: bitmap.pagePtSize,
          },
          error: null,
        });
      } catch (err) {
        if (cancelled || isPdfRenderCancelled(err)) return;
        console.error("usePdfPagePreview failed:", err);
        // Keep whatever page is already on screen; only the newest attempt failed.
        setResult((prev) => ({
          pdf: document,
          bitmap: prev?.pdf === document ? prev.bitmap : null,
          error: "Could not render preview.",
        }));
      }
    }

    renderPreviewPage(pdf);

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pdf, pageNumber, targetWidth, targetHeight]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    },
    []
  );

  return {
    pdf,
    pageImageUrl: current?.bitmap?.objectUrl ?? null,
    renderSize: current?.bitmap?.renderSize ?? EMPTY_SIZE,
    pixelSize: current?.bitmap?.pixelSize ?? EMPTY_SIZE,
    pagePtSize: current?.bitmap?.pagePtSize ?? EMPTY_SIZE,
    loading: docLoading || (!current?.bitmap && !current?.error),
    error: docError ?? current?.error ?? null,
  };
}
