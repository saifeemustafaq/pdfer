"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { IconTouchButton } from "@/components/app-button";
import { Button } from "@/components/ui/button";
import { PdfPageZoomDialog } from "@/components/pdf-page-zoom-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMeasuredSize, useViewportHeight } from "@/hooks/use-measured-size";
import {
  PDF_PAGE_PREVIEW_MAX_WIDTH,
  type PdfPagePreviewSize,
} from "@/hooks/use-pdf-page-preview";

/** Width taken by the two page-nav chevrons and their gaps. */
const PAGE_NAV_WIDTH = 112;
/** Share of the viewport a preview may occupy vertically. */
const VIEWPORT_HEIGHT_SHARE = 0.7;
const MIN_PREVIEW_WIDTH = 240;

export type PdfPreviewBudget = {
  maxWidth: number;
  /** Zero means the height is unconstrained. */
  maxHeight: number;
};

/**
 * Holds the layout space a preview may use. Pair with `onBudgetChange` on
 * `PdfPagePreviewFrame` and feed `budget` straight into `usePdfPagePreview`.
 */
export function usePdfPreviewBudget() {
  const [budget, setBudget] = useState<PdfPreviewBudget>({
    maxWidth: PDF_PAGE_PREVIEW_MAX_WIDTH,
    maxHeight: 0,
  });

  const onBudgetChange = useCallback((next: PdfPreviewBudget) => {
    setBudget((prev) =>
      prev.maxWidth === next.maxWidth && prev.maxHeight === next.maxHeight
        ? prev
        : next
    );
  }, []);

  return { budget, onBudgetChange };
}

type PdfPagePreviewFrameProps = {
  title?: string;
  pageLabel?: ReactNode;
  renderSize: PdfPagePreviewSize;
  pageImageUrl: string | null;
  loading: boolean;
  error: string | null;
  pageAlt: string;
  overlay?: ReactNode;
  /** Floating overlay (e.g. a contextual toolbar) drawn over the preview box. */
  toolbar?: ReactNode;
  hint?: ReactNode;
  className?: string;
  /** 1-based page number for prev/next controls. */
  pageNumber?: number;
  pageCount?: number;
  onPageChange?: (pageNumber: number) => void;
  /** Layout space available for the page, measured from the preview box. */
  onBudgetChange?: (budget: PdfPreviewBudget) => void;
  /** Shared document proxy from `usePdfPagePreview`; enables the zoom reader. */
  pdf?: PDFDocumentProxy | null;
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
  toolbar,
  hint,
  className,
  pageNumber,
  pageCount = 1,
  onPageChange,
  onBudgetChange,
  pdf,
}: PdfPagePreviewFrameProps) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const { ref: boxRef, size: boxSize } = useMeasuredSize<HTMLDivElement>();
  const viewportHeight = useViewportHeight();

  const frameStyle = {
    "--pdf-preview-w": renderSize.width,
    "--pdf-preview-h": renderSize.height,
  } as CSSProperties;

  const showPageNav =
    !!onPageChange &&
    pageCount > 1 &&
    typeof pageNumber === "number";

  // Report the space the page may occupy so the rasteriser can render to fit
  // instead of to a fixed width.
  const budgetWidth =
    boxSize.width > 0
      ? Math.max(
          MIN_PREVIEW_WIDTH,
          Math.floor(boxSize.width - (showPageNav ? PAGE_NAV_WIDTH : 0))
        )
      : 0;
  const budgetHeight = Math.round(viewportHeight * VIEWPORT_HEIGHT_SHARE);

  useEffect(() => {
    if (!onBudgetChange || budgetWidth <= 0 || budgetHeight <= 0) return;
    onBudgetChange({ maxWidth: budgetWidth, maxHeight: budgetHeight });
  }, [onBudgetChange, budgetWidth, budgetHeight]);

  function goToPage(nextPage: number) {
    if (!onPageChange) return;
    onPageChange(Math.min(pageCount, Math.max(1, nextPage)));
  }

  const previewContent =
    !loading && !error && pageImageUrl && renderSize.width > 0 ? (
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
    ) : null;

  const canZoom = !!pdf && typeof pageNumber === "number";

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <div className="flex flex-wrap items-center gap-2">
          {pageLabel}
          {canZoom && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoomOpen(true)}
            >
              <Maximize2 className="size-4" />
              Zoom
            </Button>
          )}
        </div>
      </div>

      <div
        ref={boxRef}
        data-preview-box
        className="relative flex justify-center rounded-lg border border-border bg-muted/20 p-3"
      >
        {toolbar}
        {loading && (
          <Skeleton
            style={
              renderSize.width > 0
                ? { width: renderSize.width, height: renderSize.height }
                : undefined
            }
            className={cn(!renderSize.width && "h-[420px] w-full max-w-[640px]")}
          />
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {previewContent &&
          (showPageNav ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <IconTouchButton
                type="button"
                aria-label="Previous page"
                disabled={pageNumber <= 1}
                onClick={() => goToPage(pageNumber - 1)}
                className="hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="size-6" />
              </IconTouchButton>
              {previewContent}
              <IconTouchButton
                type="button"
                aria-label="Next page"
                disabled={pageNumber >= pageCount}
                onClick={() => goToPage(pageNumber + 1)}
                className="hover:text-foreground disabled:opacity-30"
              >
                <ChevronRight className="size-6" />
              </IconTouchButton>
            </div>
          ) : (
            previewContent
          ))}
      </div>

      {hint}

      {canZoom && pdf && (
        <PdfPageZoomDialog
          open={zoomOpen}
          onOpenChange={setZoomOpen}
          pdf={pdf}
          pageNumber={pageNumber}
          pageCount={pageCount}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
