"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  PdfPagePreviewFrame,
  usePdfPreviewBudget,
} from "@/components/pdf-page-preview-frame";
import { AnnotationOverlay } from "@/components/annotation-overlay";
import { AnnotationToolbar } from "@/components/annotation-toolbar";
import { usePdfPagePreview } from "@/hooks/use-pdf-page-preview";
import { bytesToDataUrl } from "@/lib/image-data-url";
import { annotationsForPage, type Annotation } from "@/lib/pdf-annotations";
import { resolveKeptPage } from "@/lib/page-nav";

type PdfAnnotationPreviewProps = {
  pdfBlob: Blob;
  annotations: Annotation[];
  signaturePng: Uint8Array | null;
  signatureEnabled: boolean;
  activePageIndex: number;
  onActivePageChange: (pageIndex: number) => void;
  pageCount: number;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  onChangeAnnotation: (annotation: Annotation) => void;
  onDeleteAnnotation: (id: string) => void;
  /** Pages marked for removal in the Pages tab (skipped during navigation). */
  removedPages?: Set<number>;
};

export function PdfAnnotationPreview({
  pdfBlob,
  annotations,
  signaturePng,
  signatureEnabled,
  activePageIndex,
  onActivePageChange,
  pageCount,
  selectedId,
  onSelectId,
  onChangeAnnotation,
  onDeleteAnnotation,
  removedPages,
}: PdfAnnotationPreviewProps) {
  const previewPage = activePageIndex + 1;
  const [editingId, setEditingId] = useState<string | null>(null);

  // Floating toolbar position (pixels relative to the preview box). `null` keeps
  // it in its default top-center spot until the user drags it.
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const toolbarRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    boxW: number;
    boxH: number;
    elW: number;
    elH: number;
  } | null>(null);

  const startToolbarDrag = useCallback((e: ReactPointerEvent) => {
    const el = toolbarRef.current;
    const box = el?.closest("[data-preview-box]") as HTMLElement | null;
    if (!el || !box) return;
    e.preventDefault();
    e.stopPropagation();
    const boxRect = box.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: elRect.left - boxRect.left,
      originY: elRect.top - boxRect.top,
      boxW: boxRect.width,
      boxH: boxRect.height,
      elW: elRect.width,
      elH: elRect.height,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const moveToolbarDrag = useCallback((e: ReactPointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const x = Math.max(
      0,
      Math.min(d.originX + (e.clientX - d.startX), d.boxW - d.elW)
    );
    const y = Math.max(
      0,
      Math.min(d.originY + (e.clientY - d.startY), d.boxH - d.elH)
    );
    setToolbarPos({ x, y });
  }, []);

  const endToolbarDrag = useCallback((e: ReactPointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const { budget, onBudgetChange } = usePdfPreviewBudget();
  const { pdf, pageImageUrl, renderSize, pagePtSize, loading, error } =
    usePdfPagePreview(pdfBlob, previewPage, budget);

  const signatureUrl = useMemo(() => {
    if (!signatureEnabled || !signaturePng?.length) return null;
    return bytesToDataUrl(signaturePng, "image/png");
  }, [signatureEnabled, signaturePng]);

  const pageAnnotations = useMemo(
    () => annotationsForPage(annotations, activePageIndex),
    [annotations, activePageIndex]
  );

  const selected = pageAnnotations.find((a) => a.id === selectedId) ?? null;

  const scale =
    pagePtSize.height > 0 ? renderSize.height / pagePtSize.height : 1;

  // Editing only applies while the same annotation is also selected; this keeps
  // stale ids harmless without a selection-syncing effect.
  const isEditing = editingId !== null && editingId === selectedId;

  // Keyboard delete for the selected annotation (not while editing text).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!selectedId || isEditing) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onDeleteAnnotation(selectedId);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, isEditing, onDeleteAnnotation]);

  function handlePreviewPageChange(pageNumber: number) {
    onSelectId(null);
    const target = pageNumber - 1;
    const resolved = removedPages
      ? resolveKeptPage(target, activePageIndex, removedPages, pageCount)
      : Math.max(0, Math.min(target, Math.max(0, pageCount - 1)));
    onActivePageChange(resolved);
  }

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
            handlePreviewPageChange(
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
        title="Preview"
        renderSize={renderSize}
        pageImageUrl={pageImageUrl}
        loading={loading}
        error={error}
        pageAlt={`Page ${previewPage} preview`}
        pageNumber={previewPage}
        pageCount={pageCount}
        onPageChange={handlePreviewPageChange}
        onBudgetChange={onBudgetChange}
        pdf={pdf}
        pageLabel={pageLabel}
        toolbar={
          selected ? (
            <div
              ref={toolbarRef}
              className={cn(
                "pointer-events-auto absolute z-20 w-max max-w-none",
                toolbarPos ? "" : "left-1/2 top-2 -translate-x-1/2"
              )}
              style={
                toolbarPos ? { left: toolbarPos.x, top: toolbarPos.y } : undefined
              }
              onPointerDown={(e) => e.stopPropagation()}
            >
              <AnnotationToolbar
                annotation={selected}
                onChange={onChangeAnnotation}
                onDelete={(id) => {
                  onDeleteAnnotation(id);
                  setEditingId(null);
                }}
                onEditText={(id) => {
                  onSelectId(id);
                  setEditingId(id);
                }}
                dragHandle={
                  <button
                    type="button"
                    aria-label="Drag toolbar"
                    title="Drag to move toolbar"
                    className="flex h-7 w-5 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
                    onPointerDown={startToolbarDrag}
                    onPointerMove={moveToolbarDrag}
                    onPointerUp={endToolbarDrag}
                    onPointerCancel={endToolbarDrag}
                  >
                    <GripVertical className="h-4 w-4" aria-hidden />
                  </button>
                }
              />
            </div>
          ) : undefined
        }
        hint={
        pageAnnotations.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Use the buttons on the right to add a signature, text, or a shape to
            this page. Then drag to move, and use the corner handle to resize.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Click an item to select it, then use the trash button to delete it
            or the corner handle to resize. Double-click text to edit; styling
            options appear in the floating toolbar over the preview (grab its
            handle to move it out of the way).
          </p>
        )
      }
      overlay={
        renderSize.width > 0 ? (
          <>
            {/* Background catcher: click empty page to deselect. */}
            <div
              className="absolute inset-0"
              onPointerDown={() => onSelectId(null)}
              aria-hidden
            />

            {pageAnnotations.map((annotation) => (
              <AnnotationOverlay
                key={annotation.id}
                annotation={annotation}
                selected={annotation.id === selectedId}
                editing={isEditing && annotation.id === selectedId}
                signatureUrl={signatureUrl}
                frameWidth={renderSize.width}
                frameHeight={renderSize.height}
                scale={scale}
                onSelect={onSelectId}
                onChange={onChangeAnnotation}
                onStartEdit={setEditingId}
                onEndEdit={() => setEditingId(null)}
                onRequestDelete={onDeleteAnnotation}
              />
            ))}
          </>
        ) : null
      }
      />
  );
}
