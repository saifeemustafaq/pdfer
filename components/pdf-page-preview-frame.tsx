"use client";

import type { CSSProperties, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PdfPagePreviewSize } from "@/hooks/use-pdf-page-preview";

type PdfPagePreviewFrameProps = {
  title?: string;
  pageLabel?: ReactNode;
  renderSize: PdfPagePreviewSize;
  pageImageUrl: string | null;
  loading: boolean;
  error: string | null;
  pageAlt: string;
  overlay?: ReactNode;
  hint?: ReactNode;
  className?: string;
};

/** Shared PDF page preview shell for edit-tool overlays (watermark, signature). */
export function PdfPagePreviewFrame({
  title = "Preview",
  pageLabel,
  renderSize,
  pageImageUrl,
  loading,
  error,
  pageAlt,
  overlay,
  hint,
  className,
}: PdfPagePreviewFrameProps) {
  const frameStyle = {
    "--pdf-preview-w": renderSize.width,
    "--pdf-preview-h": renderSize.height,
  } as CSSProperties;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        {pageLabel}
      </div>

      <div className="flex justify-center rounded-lg border border-border bg-muted/20 p-3">
        {loading && <Skeleton className="h-[320px] w-full max-w-[420px]" />}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && !error && pageImageUrl && renderSize.width > 0 && (
          <div
            className="pdf-preview-frame relative overflow-hidden rounded-md border border-border bg-card shadow-sm"
            style={frameStyle}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pageImageUrl}
              alt={pageAlt}
              className="block h-full w-full"
              draggable={false}
            />
            {overlay}
          </div>
        )}
      </div>

      {hint}
    </div>
  );
}
