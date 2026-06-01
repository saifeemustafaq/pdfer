"use client";

import { useEffect, useState, useCallback } from "react";
import * as PDFJS from "pdfjs-dist";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RotateCcw, RotateCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PrimaryActionButton, IconTouchButton } from "@/components/app-button";
import type { PageEditSpec } from "@/lib/pdf-client";
import {
  resolvePageDimensions,
  type PageOrientation,
  type PageSizeKey,
} from "@/lib/image-pdf-layout";

PDFJS.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const THUMB_WIDTH = 140;

function getThumbFrameDimensions(
  pageSize: PageSizeKey,
  orientation: PageOrientation
): { width: number; height: number } {
  const page = resolvePageDimensions(pageSize, orientation);
  return {
    width: THUMB_WIDTH,
    height: Math.round(THUMB_WIDTH * (page.height / page.width)),
  };
}

function computeThumbRenderScale(
  viewportWidth: number,
  viewportHeight: number,
  frameWidth: number,
  frameHeight: number
): number {
  return Math.min(
    frameWidth / viewportWidth,
    frameHeight / viewportHeight
  );
}

/** Solid, bordered controls on top of page thumbnails. */
const PAGE_ACTION_BUTTON_CLASS =
  "min-w-12 min-h-12 rounded-md border border-border bg-background text-foreground shadow-sm";

const PAGE_ROTATE_BUTTON_CLASS = cn(
  PAGE_ACTION_BUTTON_CLASS,
  "hover:bg-primary hover:border-primary hover:text-primary-foreground"
);

const PAGE_REMOVE_BUTTON_CLASS = cn(
  PAGE_ACTION_BUTTON_CLASS,
  "hover:bg-destructive hover:border-destructive hover:text-white"
);

type PageThumb = {
  id: string;
  sourceIndex: number;
  dataUrl: string;
};

export type PageGridSummary = {
  total: number;
  kept: number;
  removed: number;
};

type PageGridProps = {
  pdfBlob: Blob;
  /** When true, parent owns download actions. */
  externalActions?: boolean;
  /** Extract mode: no reorder or rotate, selection only. */
  selectionOnly?: boolean;
  onConfirm?: (spec: PageEditSpec) => void;
  onSummaryChange?: (summary: PageGridSummary) => void;
  onEditSpecChange?: (spec: PageEditSpec) => void;
  loading?: boolean;
  /** Preview slot page size. Defaults to US Letter. */
  previewPageSize?: PageSizeKey;
  previewOrientation?: PageOrientation;
};

function SortablePageThumb({
  thumb,
  frameWidth,
  frameHeight,
  isRemoved,
  rotationDegrees,
  selectionOnly,
  onToggleRemove,
  onRotate,
}: {
  thumb: PageThumb;
  frameWidth: number;
  frameHeight: number;
  isRemoved: boolean;
  rotationDegrees: number;
  selectionOnly?: boolean;
  onToggleRemove: (sourceIndex: number) => void;
  onRotate: (sourceIndex: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: thumb.id, disabled: selectionOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, width: frameWidth }}
      {...attributes}
      {...(selectionOnly ? {} : listeners)}
      className={cn(
        "relative shrink-0 rounded-md overflow-hidden border-2 bg-card touch-none",
        selectionOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing touch-none",
        isDragging && "z-10 ring-2 ring-primary/20 opacity-90 cursor-grabbing",
        isRemoved
          ? "border-destructive opacity-40"
          : "border-border hover:border-primary"
      )}
      aria-label={
        selectionOnly
          ? `Page ${thumb.sourceIndex + 1}. Tap to ${isRemoved ? "include" : "exclude"}.`
          : `Page ${thumb.sourceIndex + 1}. Drag to reorder.`
      }
    >
      <div className="absolute top-0 right-0 z-10 flex gap-1 p-1 pointer-events-auto">
        {!selectionOnly && (
          <IconTouchButton
            type="button"
            className={PAGE_ROTATE_BUTTON_CLASS}
            aria-label={`Rotate page ${thumb.sourceIndex + 1} clockwise`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRotate(thumb.sourceIndex);
            }}
          >
            <RotateCw className="w-4 h-4" />
          </IconTouchButton>
        )}
        <IconTouchButton
          type="button"
          className={PAGE_REMOVE_BUTTON_CLASS}
          aria-label={`Remove page ${thumb.sourceIndex + 1}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleRemove(thumb.sourceIndex);
          }}
        >
          <X className="w-4 h-4" />
        </IconTouchButton>
      </div>

      <div
        className="relative flex items-center justify-center bg-muted/30"
        style={{ width: frameWidth, height: frameHeight }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb.dataUrl}
          alt={`Page ${thumb.sourceIndex + 1}`}
          className="max-h-full max-w-full object-contain pointer-events-none origin-center"
          style={{
            transform: rotationDegrees ? `rotate(${rotationDegrees}deg)` : undefined,
          }}
          draggable={false}
        />
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white">
          {thumb.sourceIndex + 1}
        </span>
      </div>
      {isRemoved && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/20 pointer-events-none">
          <div className="flex size-8 items-center justify-center rounded-full bg-destructive text-white">
            <X className="w-4 h-4" />
          </div>
        </div>
      )}
    </div>
  );
}

function getOrderedKeptIndices(
  thumbs: PageThumb[],
  removed: Set<number>
): number[] {
  return thumbs
    .filter((t) => !removed.has(t.sourceIndex))
    .map((t) => t.sourceIndex);
}

function buildPageEditSpec(
  thumbs: PageThumb[],
  removed: Set<number>,
  rotations: Map<number, number>
): PageEditSpec {
  const pageIndicesInOrder = getOrderedKeptIndices(thumbs, removed);
  const rotationsRecord: Record<number, number> = {};
  for (const [index, degrees] of rotations) {
    if (degrees % 360 !== 0) {
      rotationsRecord[index] = degrees % 360;
    }
  }
  return {
    pageIndicesInOrder,
    rotations:
      Object.keys(rotationsRecord).length > 0 ? rotationsRecord : undefined,
  };
}

export function PageGrid({
  pdfBlob,
  externalActions = false,
  selectionOnly = false,
  onConfirm,
  onSummaryChange,
  onEditSpecChange,
  loading,
  previewPageSize = "letter",
  previewOrientation = "portrait",
}: PageGridProps) {
  const frame = getThumbFrameDimensions(previewPageSize, previewOrientation);
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [rotations, setRotations] = useState<Map<number, number>>(new Map());
  const [renderError, setRenderError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const emitEditSpec = useCallback(
    (nextThumbs: PageThumb[], nextRemoved: Set<number>, nextRotations: Map<number, number>) => {
      onEditSpecChange?.(buildPageEditSpec(nextThumbs, nextRemoved, nextRotations));
    },
    [onEditSpecChange]
  );

  useEffect(() => {
    const total = thumbs.length;
    const removedCount = removed.size;
    onSummaryChange?.({
      total,
      kept: total - removedCount,
      removed: removedCount,
    });
    emitEditSpec(thumbs, removed, rotations);
  }, [thumbs, removed, rotations, onSummaryChange, emitEditSpec]);

  useEffect(() => {
    let cancelled = false;

    async function renderThumbs() {
      setThumbs([]);
      setRemoved(new Set());
      setRotations(new Map());
      setRenderError(null);

      try {
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const pdf = await PDFJS.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;

        const results: PageThumb[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) break;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          const scale = computeThumbRenderScale(
            viewport.width,
            viewport.height,
            frame.width,
            frame.height
          );
          const scaled = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = scaled.width;
          canvas.height = scaled.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          await page.render({
            canvasContext: ctx,
            viewport: scaled,
            canvas,
          }).promise;

          const sourceIndex = i - 1;
          results.push({
            id: `page-${sourceIndex}`,
            sourceIndex,
            dataUrl: canvas.toDataURL("image/jpeg", 0.8),
          });
          if (!cancelled) setThumbs([...results]);
        }
      } catch (err) {
        if (!cancelled) {
          setRenderError("Could not render page previews.");
          console.error("PageGrid renderThumbs failed:", err);
        }
      }
    }

    renderThumbs();
    return () => {
      cancelled = true;
    };
  }, [pdfBlob, frame.width, frame.height]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setThumbs((items) => {
      const oldIndex = items.findIndex((t) => t.id === active.id);
      const newIndex = items.findIndex((t) => t.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  function toggleRemove(sourceIndex: number) {
    setRemoved((prev) => {
      const next = new Set(prev);
      if (next.has(sourceIndex)) next.delete(sourceIndex);
      else next.add(sourceIndex);
      return next;
    });
  }

  function rotatePage(sourceIndex: number) {
    setRotations((prev) => {
      const next = new Map(prev);
      const current = next.get(sourceIndex) ?? 0;
      next.set(sourceIndex, (current + 90) % 360);
      return next;
    });
  }

  function handleConfirm() {
    onConfirm?.(buildPageEditSpec(thumbs, removed, rotations));
  }

  const totalPages = thumbs.length;
  const keptPages = totalPages - removed.size;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">
            {totalPages > 0 ? (
              <>
                {totalPages} page{totalPages !== 1 ? "s" : ""} total
              </>
            ) : (
              "Loading pages…"
            )}
          </p>
          {removed.size > 0 && (
            <Badge variant="destructive" className="text-xs">
              {selectionOnly
                ? `${removed.size} excluded`
                : `${removed.size} marked for removal`}
            </Badge>
          )}
        </div>
        {removed.size > 0 && (
          <button
            type="button"
            onClick={() => setRemoved(new Set())}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3 h-3" />
            Reset selection
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {selectionOnly
          ? "Tap X to exclude a page from the extract. Untouched pages are included."
          : "Drag any page to reorder. Tap X to remove a page. Tap rotate to turn a page."}
      </p>

      {renderError && (
        <p className="text-sm text-destructive">{renderError}</p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={thumbs.map((t) => t.id)}
          strategy={rectSortingStrategy}
        >
          <div
            className="grid items-start justify-start gap-2"
            style={{
              gridTemplateColumns: `repeat(auto-fill, ${frame.width}px)`,
            }}
          >
            {thumbs.map((thumb) => (
              <SortablePageThumb
                key={thumb.id}
                thumb={thumb}
                frameWidth={frame.width}
                frameHeight={frame.height}
                isRemoved={removed.has(thumb.sourceIndex)}
                rotationDegrees={rotations.get(thumb.sourceIndex) ?? 0}
                selectionOnly={selectionOnly}
                onToggleRemove={toggleRemove}
                onRotate={rotatePage}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {!externalActions && totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <p className="text-sm text-muted-foreground">
            {removed.size === 0
              ? `${keptPages} page${keptPages !== 1 ? "s" : ""} in this order.`
              : `${keptPages} page${keptPages !== 1 ? "s" : ""} will be kept.`}
          </p>
          <PrimaryActionButton
            onClick={handleConfirm}
            disabled={loading || keptPages === 0}
            className="w-full sm:w-auto shrink-0"
          >
            {loading
              ? "Processing…"
              : removed.size === 0
                ? "Download"
                : `Remove ${removed.size} & download`}
          </PrimaryActionButton>
        </div>
      )}
    </div>
  );
}
