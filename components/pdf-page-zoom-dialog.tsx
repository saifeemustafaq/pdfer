"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useMeasuredSize } from "@/hooks/use-measured-size";
import {
  isPdfRenderCancelled,
  maxCssWidthForAspect,
  renderPdfPageToCanvas,
  type PdfRenderSize,
} from "@/lib/pdf-render";

const MIN_ZOOM = 0.25;
const HARD_MAX_ZOOM = 8;
const ZOOM_STEP = 1.25;
/** Coalesce rapid zoom changes; the stale bitmap is CSS-scaled meanwhile. */
const RENDER_DEBOUNCE_MS = 150;
/** Padding around the page inside the scroll area, both sides. */
const VIEWPORT_INSET = 32;

type PdfPageZoomDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Owned by the caller; the reader only reads from it. */
  pdf: PDFDocumentProxy;
  /** 1-based. */
  pageNumber: number;
  pageCount: number;
  onPageChange?: (pageNumber: number) => void;
};

/**
 * Full-screen page reader. Every zoom step re-rasterises from the PDF instead
 * of magnifying an existing bitmap, so zooming in reveals real detail.
 */
export function PdfPageZoomDialog({
  open,
  onOpenChange,
  ...reader
}: PdfPageZoomDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-[100dvh] w-screen max-w-none gap-0 rounded-none border-0 p-0 sm:max-w-none"
      >
        {/* The portal unmounts on close, so the reader below resets each time. */}
        <ZoomReader {...reader} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

type ZoomReaderProps = Omit<PdfPageZoomDialogProps, "open" | "onOpenChange"> & {
  onClose: () => void;
};

function ZoomReader({
  pdf,
  pageNumber,
  pageCount,
  onPageChange,
  onClose,
}: ZoomReaderProps) {
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [pagePtSize, setPagePtSize] = useState<PdfRenderSize | null>(null);
  /** Null until the reader zooms; the fit-width default is derived instead. */
  const [zoom, setZoom] = useState<number | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [hasBitmap, setHasBitmap] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  /** Scroll offsets to apply once the new zoom has changed the layout size. */
  const pendingScrollRef = useRef<{ left: number; top: number } | null>(null);
  const zoomRef = useRef<number | null>(null);

  const { ref: viewportRef, size: viewportSize } =
    useMeasuredSize<HTMLDivElement>();

  const availableWidth = Math.max(1, viewportSize.width - VIEWPORT_INSET);
  const availableHeight = Math.max(1, viewportSize.height - VIEWPORT_INSET);

  const aspect = pagePtSize ? pagePtSize.height / pagePtSize.width : 0;
  const maxZoom = pagePtSize
    ? Math.min(HARD_MAX_ZOOM, maxCssWidthForAspect(aspect) / pagePtSize.width)
    : HARD_MAX_ZOOM;

  const fitWidthZoom = pagePtSize ? availableWidth / pagePtSize.width : 1;
  const fitPageZoom = pagePtSize
    ? Math.min(fitWidthZoom, availableHeight / pagePtSize.height)
    : 1;

  const clampZoom = useCallback(
    (value: number) => Math.min(maxZoom, Math.max(MIN_ZOOM, value)),
    [maxZoom]
  );

  // Until the reader zooms, track fit-width so a window resize re-fits.
  const effectiveZoom = zoom ?? clampZoom(fitWidthZoom);

  const targetSize: PdfRenderSize | null = pagePtSize
    ? {
        width: pagePtSize.width * effectiveZoom,
        height: pagePtSize.height * effectiveZoom,
      }
    : null;

  useEffect(() => {
    zoomRef.current = effectiveZoom;
  }, [effectiveZoom]);

  /**
   * Change zoom while keeping the given viewport point anchored. Without this
   * the page jumps away from whatever the reader was looking at.
   */
  const applyZoom = useCallback(
    (next: number, focal?: { clientX: number; clientY: number }) => {
      const clamped = clampZoom(next);
      const scroller = scrollRef.current;
      const current = zoomRef.current;

      if (scroller && current) {
        const rect = scroller.getBoundingClientRect();
        const anchorX = focal ? focal.clientX - rect.left : rect.width / 2;
        const anchorY = focal ? focal.clientY - rect.top : rect.height / 2;
        const ratio = clamped / current;
        pendingScrollRef.current = {
          left: (scroller.scrollLeft + anchorX) * ratio - anchorX,
          top: (scroller.scrollTop + anchorY) * ratio - anchorY,
        };
      }

      zoomRef.current = clamped;
      setZoom(clamped);
    },
    [clampZoom]
  );

  useEffect(() => {
    let cancelled = false;

    const target = Math.min(Math.max(1, pageNumber), pdf.numPages);
    pdf
      .getPage(target)
      .then((loaded) => {
        if (cancelled) return;
        const viewport = loaded.getViewport({ scale: 1 });
        setPage(loaded);
        setPagePtSize({ width: viewport.width, height: viewport.height });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("PdfPageZoomDialog getPage failed:", err);
        setRenderError("Could not open this page.");
      });

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber]);

  // Debounced re-rasterisation. Until it lands the previous bitmap is stretched
  // to the new layout size, which keeps zooming responsive.
  const targetWidth = targetSize?.width ?? 0;

  useEffect(() => {
    if (!page || targetWidth <= 0) return;

    const controller = new AbortController();
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      setRendering(true);
      try {
        const rendered = await renderPdfPageToCanvas(page, {
          maxWidth: targetWidth,
          signal: controller.signal,
        });
        if (cancelled) return;

        const { canvas } = rendered;
        canvas.style.display = "block";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        hostRef.current?.replaceChildren(canvas);
        setHasBitmap(true);
        setRenderError(null);
      } catch (err) {
        if (cancelled || isPdfRenderCancelled(err)) return;
        console.error("PdfPageZoomDialog render failed:", err);
        setRenderError("Could not render this page.");
      } finally {
        if (!cancelled) setRendering(false);
      }
    }, RENDER_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [page, targetWidth]);

  // Restore the anchored scroll position in the same frame the size changes.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const pending = pendingScrollRef.current;
    if (!scroller || !pending) return;
    pendingScrollRef.current = null;

    scroller.scrollLeft = Math.max(0, pending.left);
    scroller.scrollTop = Math.max(0, pending.top);
  }, [targetWidth]);

  // Read inside listeners that must not re-subscribe mid-gesture.
  const fitWidthRef = useRef(fitWidthZoom);
  useEffect(() => {
    fitWidthRef.current = fitWidthZoom;
  }, [fitWidthZoom]);

  // Keyboard zoom. Escape is handled by the dialog itself.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        applyZoom((zoomRef.current ?? 1) * ZOOM_STEP);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        applyZoom((zoomRef.current ?? 1) / ZOOM_STEP);
      } else if (event.key === "0") {
        event.preventDefault();
        applyZoom(fitWidthRef.current);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applyZoom]);

  // Ctrl/cmd+wheel zoom and two-finger pinch. Both need non-passive listeners
  // so the browser's own page zoom can be suppressed.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    let pinchStartDistance = 0;
    let pinchStartZoom = 1;

    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const factor = Math.exp(-event.deltaY / 250);
      applyZoom((zoomRef.current ?? 1) * factor, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
    }

    function touchDistance(touches: TouchList) {
      const a = touches[0];
      const b = touches[1];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length !== 2) return;
      pinchStartDistance = touchDistance(event.touches);
      pinchStartZoom = zoomRef.current ?? 1;
    }

    function onTouchMove(event: TouchEvent) {
      if (event.touches.length !== 2 || pinchStartDistance === 0) return;
      event.preventDefault();
      const distance = touchDistance(event.touches);
      applyZoom((pinchStartZoom * distance) / pinchStartDistance, {
        clientX: (event.touches[0].clientX + event.touches[1].clientX) / 2,
        clientY: (event.touches[0].clientY + event.touches[1].clientY) / 2,
      });
    }

    function onTouchEnd(event: TouchEvent) {
      if (event.touches.length < 2) pinchStartDistance = 0;
    }

    scroller.addEventListener("wheel", onWheel, { passive: false });
    scroller.addEventListener("touchstart", onTouchStart, { passive: false });
    scroller.addEventListener("touchmove", onTouchMove, { passive: false });
    scroller.addEventListener("touchend", onTouchEnd);
    scroller.addEventListener("touchcancel", onTouchEnd);

    return () => {
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchmove", onTouchMove);
      scroller.removeEventListener("touchend", onTouchEnd);
      scroller.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [applyZoom]);

  // Mouse drag to pan. Touch panning stays with the browser's native scrolling.
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  function startPan(event: ReactPointerEvent<HTMLDivElement>) {
    const scroller = scrollRef.current;
    if (!scroller || event.pointerType !== "mouse" || event.button !== 0) return;
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: scroller.scrollLeft,
      scrollTop: scroller.scrollTop,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePan(event: ReactPointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    const scroller = scrollRef.current;
    if (!pan || !scroller || pan.pointerId !== event.pointerId) return;
    scroller.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
    scroller.scrollTop = pan.scrollTop - (event.clientY - pan.startY);
  }

  function endPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (!panRef.current || panRef.current.pointerId !== event.pointerId) return;
    panRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function goToPage(next: number) {
    if (!onPageChange) return;
    const clamped = Math.min(pageCount, Math.max(1, next));
    if (clamped === pageNumber) return;
    setHasBitmap(false);
    onPageChange(clamped);
  }

  const error = renderError;
  const zoomPercent = Math.round(effectiveZoom * 100);
  const showPageNav = !!onPageChange && pageCount > 1;

  return (
    <div className="flex h-full flex-col">
      <DialogTitle className="sr-only">
        Page {pageNumber} of {pageCount}
      </DialogTitle>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Zoom out"
            disabled={effectiveZoom <= MIN_ZOOM}
            onClick={() => applyZoom(effectiveZoom / ZOOM_STEP)}
          >
            <Minus className="size-4" />
          </Button>
          <span className="min-w-14 text-center text-sm tabular-nums">
            {zoomPercent}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Zoom in"
            disabled={effectiveZoom >= maxZoom}
            onClick={() => applyZoom(effectiveZoom * ZOOM_STEP)}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applyZoom(fitWidthZoom)}
          >
            Fit width
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applyZoom(fitPageZoom)}
          >
            Fit page
          </Button>
          {rendering && (
            <Loader2
              className="size-4 animate-spin text-muted-foreground"
              aria-hidden
            />
          )}
        </div>

        <div className="flex items-center gap-1">
          {showPageNav && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Previous page"
                disabled={pageNumber <= 1}
                onClick={() => goToPage(pageNumber - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm tabular-nums text-muted-foreground">
                {pageNumber} / {pageCount}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Next page"
                disabled={pageNumber >= pageCount}
                onClick={() => goToPage(pageNumber + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div ref={viewportRef} className="relative min-h-0 flex-1 bg-muted/40">
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-auto overscroll-contain"
          onPointerDown={startPan}
          onPointerMove={movePan}
          onPointerUp={endPan}
          onPointerCancel={endPan}
        >
          <div className="flex min-h-full min-w-full items-center justify-center p-4">
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <>
                <div
                  ref={hostRef}
                  className="shrink-0 bg-white shadow-md"
                  style={
                    targetSize
                      ? { width: targetSize.width, height: targetSize.height }
                      : undefined
                  }
                />
                {!hasBitmap && (
                  <Loader2
                    className="absolute size-6 animate-spin text-muted-foreground"
                    aria-label="Loading page"
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <p className="border-t border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
        Drag to pan. Ctrl or Cmd and scroll to zoom, or use + and - to zoom and
        0 to fit width.
      </p>
    </div>
  );
}
