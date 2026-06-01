"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Input } from "@/components/ui/input";
import { PdfPagePreviewFrame } from "@/components/pdf-page-preview-frame";
import { cn } from "@/lib/utils";
import { usePdfPagePreview } from "@/hooks/use-pdf-page-preview";
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
};

export function PdfWatermarkPreview({
  pdfBlob,
  spec,
  enabled,
  pageCount,
}: PdfWatermarkPreviewProps) {
  const [previewPage, setPreviewPage] = useState(1);

  useEffect(() => {
    if (previewPage > pageCount) {
      setPreviewPage(Math.max(1, pageCount));
    }
  }, [pageCount, previewPage]);

  const { pageImageUrl, renderSize, pagePtSize, loading, error } =
    usePdfPagePreview(pdfBlob, previewPage);

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
          value={previewPage}
          onChange={(e) =>
            setPreviewPage(
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
      pageAlt={`Page ${previewPage} preview`}
      pageNumber={previewPage}
      pageCount={pageCount}
      onPageChange={setPreviewPage}
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
