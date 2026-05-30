"use client";

import { useEffect, useState } from "react";
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
import { RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PrimaryActionButton, IconTouchButton } from "@/components/app-button";

PDFJS.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const THUMB_WIDTH = 140;

type PageThumb = {
  id: string;
  sourceIndex: number;
  dataUrl: string;
};

type PageGridProps = {
  pdfBlob: Blob;
  /** Ordered zero-based indices of pages to keep (after reorder and removal). */
  onConfirm: (orderedKeptIndices: number[]) => void;
  loading?: boolean;
};

function SortablePageThumb({
  thumb,
  isRemoved,
  onToggleRemove,
}: {
  thumb: PageThumb;
  isRemoved: boolean;
  onToggleRemove: (sourceIndex: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: thumb.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "relative rounded-md overflow-hidden border-2 bg-card touch-none cursor-grab active:cursor-grabbing",
        isDragging && "z-10 shadow-sm opacity-90 cursor-grabbing",
        isRemoved
          ? "border-destructive opacity-40"
          : "border-border hover:border-primary"
      )}
      aria-label={`Page ${thumb.sourceIndex + 1}. Drag to reorder.`}
    >
      <IconTouchButton
        type="button"
        className="absolute top-0 right-0 z-10 w-10 h-10 min-w-10 min-h-10 bg-background/90 hover:bg-destructive/10 pointer-events-auto"
        aria-label={`Remove page ${thumb.sourceIndex + 1}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleRemove(thumb.sourceIndex);
        }}
      >
        <X className="w-4 h-4" />
      </IconTouchButton>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumb.dataUrl}
        alt={`Page ${thumb.sourceIndex + 1}`}
        className="w-full h-auto block pointer-events-none"
        draggable={false}
      />
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded tabular-nums">
        {thumb.sourceIndex + 1}
      </span>
      {isRemoved && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/20 pointer-events-none">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive text-white">
            <X className="w-4 h-4" />
          </div>
        </div>
      )}
    </div>
  );
}

export function PageGrid({ pdfBlob, onConfirm, loading }: PageGridProps) {
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [renderError, setRenderError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    let cancelled = false;

    async function renderThumbs() {
      setThumbs([]);
      setRemoved(new Set());
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
          const scale = THUMB_WIDTH / viewport.width;
          const scaled = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = scaled.width;
          canvas.height = scaled.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          await page.render({ canvasContext: ctx, viewport: scaled, canvas }).promise;

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
          console.error(err);
        }
      }
    }

    renderThumbs();
    return () => {
      cancelled = true;
    };
  }, [pdfBlob]);

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

  function handleConfirm() {
    const orderedKept = thumbs
      .filter((t) => !removed.has(t.sourceIndex))
      .map((t) => t.sourceIndex);
    onConfirm(orderedKept);
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
              {removed.size} marked for removal
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
        Drag any page to reorder. Tap X to remove a page.
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
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${THUMB_WIDTH}px, 1fr))`,
            }}
          >
            {thumbs.map((thumb) => (
              <SortablePageThumb
                key={thumb.id}
                thumb={thumb}
                isRemoved={removed.has(thumb.sourceIndex)}
                onToggleRemove={toggleRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {totalPages > 0 && (
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
