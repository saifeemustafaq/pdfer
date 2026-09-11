"use client";

import { useEffect, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdfDocument } from "@/lib/pdf-render";

export type PdfDocumentState = {
  pdf: PDFDocumentProxy | null;
  pageCount: number;
  loading: boolean;
  error: string | null;
};

type LoadResult = {
  /** The blob this result belongs to, so a stale result is easy to spot. */
  blob: Blob;
  pdf: PDFDocumentProxy | null;
  error: string | null;
};

/**
 * Parse a PDF once per blob. Page renders and zoom steps reuse the same
 * document proxy instead of re-parsing the file on every change.
 */
export function usePdfDocument(pdfBlob: Blob | null): PdfDocumentState {
  const [result, setResult] = useState<LoadResult | null>(null);

  useEffect(() => {
    if (!pdfBlob) return;

    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;

    loadPdfDocument(pdfBlob)
      .then((pdf) => {
        loaded = pdf;
        if (cancelled) {
          pdf.destroy();
          return;
        }
        setResult({ blob: pdfBlob, pdf, error: null });
      })
      .catch((err) => {
        console.error("usePdfDocument failed:", err);
        if (!cancelled) {
          setResult({
            blob: pdfBlob,
            pdf: null,
            error: "Could not open this PDF.",
          });
        }
      });

    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, [pdfBlob]);

  // Derived rather than reset in an effect, so a blob swap reports "loading"
  // on the very next render instead of one render later.
  const current = pdfBlob && result?.blob === pdfBlob ? result : null;

  return {
    pdf: current?.pdf ?? null,
    pageCount: current?.pdf?.numPages ?? 0,
    loading: !!pdfBlob && !current,
    error: current?.error ?? null,
  };
}
