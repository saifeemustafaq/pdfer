"use client";

import { useEffect, useState } from "react";
import * as PDFJS from "pdfjs-dist";

PDFJS.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

/** Max rendered width for edit-tool PDF page previews. */
export const PDF_PAGE_PREVIEW_MAX_WIDTH = 420;

export type PdfPagePreviewSize = {
  width: number;
  height: number;
};

export type PdfPagePreviewState = {
  pageImageUrl: string | null;
  renderSize: PdfPagePreviewSize;
  pagePtSize: PdfPagePreviewSize;
  loading: boolean;
  error: string | null;
};

const EMPTY_SIZE: PdfPagePreviewSize = { width: 0, height: 0 };

/** Rasterise one PDF page for in-app previews (watermark, signature, etc.). */
export function usePdfPagePreview(
  pdfBlob: Blob,
  pageNumber: number
): PdfPagePreviewState {
  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);
  const [renderSize, setRenderSize] = useState<PdfPagePreviewSize>(EMPTY_SIZE);
  const [pagePtSize, setPagePtSize] = useState<PdfPagePreviewSize>(EMPTY_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderPreviewPage() {
      setLoading(true);
      setError(null);
      setPageImageUrl(null);

      try {
        const buffer = await pdfBlob.arrayBuffer();
        const pdf = await PDFJS.getDocument({ data: buffer }).promise;
        const pageNum = Math.min(Math.max(1, pageNumber), pdf.numPages);
        const page = await pdf.getPage(pageNum);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1 });
        const scale = PDF_PAGE_PREVIEW_MAX_WIDTH / viewport.width;
        const scaled = page.getViewport({ scale });

        setPagePtSize({ width: viewport.width, height: viewport.height });
        setRenderSize({ width: scaled.width, height: scaled.height });

        const canvas = document.createElement("canvas");
        canvas.width = scaled.width;
        canvas.height = scaled.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not create canvas context");

        await page.render({
          canvasContext: ctx,
          viewport: scaled,
          canvas,
        }).promise;

        if (!cancelled) setPageImageUrl(canvas.toDataURL("image/jpeg", 0.85));
      } catch (err) {
        console.error("usePdfPagePreview failed:", err);
        if (!cancelled) setError("Could not render preview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    renderPreviewPage();

    return () => {
      cancelled = true;
    };
  }, [pdfBlob, pageNumber]);

  return { pageImageUrl, renderSize, pagePtSize, loading, error };
}
