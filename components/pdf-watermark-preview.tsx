"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Input } from "@/components/ui/input";
import { PdfPagePreviewFrame } from "@/components/pdf-page-preview-frame";
import { cn } from "@/lib/utils";
import { usePdfPagePreview } from "@/hooks/use-pdf-page-preview";
import { resolveKeptPage } from "@/lib/page-nav";
import {
  resolveWatermarkFontSize,
  resolveWatermarkRotation,
  type WatermarkSpec,
} from "@/lib/pdf-watermark";

type PdfWatermarkPreviewProps = {
  pdfBlob: Blob;
  spec: WatermarkSpec;
  enabled: boolean;
  pageCount: number;
  /** Pages marked for removal in the Pages tab (skipped during navigation). */
  removedPages?: Set<number>;
};

export function PdfWatermarkPreview({
  pdfBlob,
  spec,
  enabled,
  pageCount,
  removedPages,
}: PdfWatermarkPreviewProps) {
  const [previewPage, setPreviewPage] = useState(1);

  // Derived (not stored): clamp to the page count and, if the stored page has
  // been removed in the Pages tab, preview the nearest kept page instead so the
  // preview always matches what export will produce.
  const clampedPage = Math.min(Math.max(1, previewPage), Math.max(1, pageCount));
  const effectivePage =
    removedPages && pageCount > 0 && removedPages.has(clampedPage - 1)
      ? resolveKeptPage(
          clampedPage - 1,
          clampedPage - 1,
          removedPages,
          pageCount
        ) + 1
      : clampedPage;

  function changePreviewPage(pageNumber: number) {
    const target = pageNumber - 1;
    const resolved = removedPages
      ? resolveKeptPage(target, effectivePage - 1, removedPages, pageCount)
      : Math.max(0, Math.min(target, Math.max(0, pageCount - 1)));
    setPreviewPage(resolved + 1);
  }

  const { pageImageUrl, renderSize, pagePtSize, loading, error } =
    usePdfPagePreview(pdfBlob, effectivePage);

  const overlay = useMemo(() => {
    if (!enabled || !spec.text.trim() || !pagePtSize.width || !renderSize.width) {
      return null;
    }

    const fontSizePt = resolveWatermarkFontSize(
      pagePtSize.width,
      pagePtSize.height,
      spec
    );
    const fontSizePx = (fontSizePt / pagePtSize.width) * renderSize.width;
    const rotation = resolveWatermarkRotation(spec);
    const opacity = Math.min(1, Math.max(0.05, spec.opacity));

    return { fontSizePx, rotation, opacity, text: spec.text.trim() };
  }, [enabled, spec, pagePtSize, renderSize]);

  const overlayStyle = overlay
    ? ({
        "--wm-font-size": overlay.fontSizePx,
        "--wm-opacity": overlay.opacity,
        "--wm-rotate": `${overlay.rotation}deg`,
      } as CSSProperties)
    : undefined;

  const pageLabel =
    pageCount > 1 ? (
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Page
        <Input
          type="number"
          min={1}
          max={pageCount}
          value={effectivePage}
          onChange={(e) =>
            changePreviewPage(
              Math.min(
                pageCount,
                Math.max(1, Number.parseInt(e.target.value, 10) || 1)
              )
            )
          }
          className="h-8 w-16"
        />
        <span>of {pageCount}</span>
      </label>
    ) : null;

  return (
    <PdfPagePreviewFrame
      renderSize={renderSize}
      pageImageUrl={pageImageUrl}
      loading={loading}
      error={error}
      pageAlt={`Page ${effectivePage} preview`}
      pageNumber={effectivePage}
      pageCount={pageCount}
      onPageChange={changePreviewPage}
      pageLabel={pageLabel}
      hint={
        !enabled ? (
          <p className="text-xs text-muted-foreground">
            Enable the watermark to see it on the preview.
          </p>
        ) : null
      }
      overlay={
        overlay ? (
          spec.position === "footer" ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-[6%] flex justify-center">
              <span
                className="pdf-preview-overlay-watermark font-sans font-medium text-muted-foreground"
                style={overlayStyle}
              >
                {overlay.text}
              </span>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span
                className={cn(
                  "pdf-preview-overlay-watermark font-sans font-medium text-muted-foreground",
                  spec.position === "diagonal" &&
                    "pdf-preview-overlay-watermark--rotated origin-center"
                )}
                style={overlayStyle}
              >
                {overlay.text}
              </span>
            </div>
          )
        ) : null
      }
    />
  );
}
