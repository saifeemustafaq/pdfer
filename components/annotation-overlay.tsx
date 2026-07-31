"use client";

import {
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Trash2, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ANNOTATION_WIDTH_MIN,
  clampAnnotationBox,
  type Annotation,
  type AnnotationFontFamily,
} from "@/lib/pdf-annotations";

const FONT_FAMILY_CSS: Record<AnnotationFontFamily, string> = {
  helvetica: "Helvetica, Arial, sans-serif",
  times: "'Times New Roman', Times, serif",
  courier: "'Courier New', Courier, monospace",
};

/**
 * Recompute a line annotation while one endpoint is dragged. The opposite
 * endpoint stays anchored; the dragged endpoint follows the pointer, which sets
 * the line's length (box width), angle (rotation), and position. Holding Shift
 * snaps the angle to 15° steps while preserving the dragged length.
 */
function resizeLineByEndpoint(
  start: Annotation,
  endpoint: "start" | "end",
  deltaX: number,
  deltaY: number,
  frameWidth: number,
  frameHeight: number,
  snap: boolean
): Annotation {
  // Work in preview pixels with the frame's top-left as origin (y down).
  const centerXPx = (start.x + start.width / 2) * frameWidth;
  const centerYPx = (1 - (start.y + start.height / 2)) * frameHeight;
  const halfLenPx = (start.width / 2) * frameWidth;
  const theta = ((start.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  const rightStart = {
    x: centerXPx + halfLenPx * cos,
    y: centerYPx + halfLenPx * sin,
  };
  const leftStart = {
    x: centerXPx - halfLenPx * cos,
    y: centerYPx - halfLenPx * sin,
  };

  // "start" is the left endpoint, "end" is the right endpoint.
  const fixed = endpoint === "end" ? leftStart : rightStart;
  const movingStart = endpoint === "end" ? rightStart : leftStart;
  const moving = { x: movingStart.x + deltaX, y: movingStart.y + deltaY };

  // Direction always points left -> right so the stored angle stays intuitive.
  const p1 = endpoint === "end" ? fixed : moving;
  const p2 = endpoint === "end" ? moving : fixed;
  let vecX = p2.x - p1.x;
  let vecY = p2.y - p1.y;
  const lengthPx = Math.max(1, Math.hypot(vecX, vecY));

  let angleDeg = (Math.atan2(vecY, vecX) * 180) / Math.PI;
  if (snap) {
    angleDeg = Math.round(angleDeg / 15) * 15;
    const rad = (angleDeg * Math.PI) / 180;
    vecX = Math.cos(rad) * lengthPx;
    vecY = Math.sin(rad) * lengthPx;
  }

  // Center is the midpoint between the fixed and (snapped) moving endpoint.
  const movedX = endpoint === "end" ? fixed.x + vecX : fixed.x - vecX;
  const movedY = endpoint === "end" ? fixed.y + vecY : fixed.y - vecY;
  const newCenterX = (fixed.x + movedX) / 2;
  const newCenterY = (fixed.y + movedY) / 2;

  const newWidth = lengthPx / frameWidth;
  const height = start.height;
  const centerXNorm = newCenterX / frameWidth;
  const centerYNorm = 1 - newCenterY / frameHeight;
  const normalizedAngle = ((Math.round(angleDeg) % 360) + 360) % 360;

  return {
    ...start,
    width: newWidth,
    height,
    x: centerXNorm - newWidth / 2,
    y: centerYNorm - height / 2,
    rotation: normalizedAngle,
  };
}

type DragState = {
  mode: "move" | "resize" | "rotate" | "endpoint";
  /** Which line endpoint is being dragged (endpoint mode only). */
  endpoint?: "start" | "end";
  pointerId: number;
  startX: number;
  startY: number;
  startAnnotation: Annotation;
};

type AnnotationOverlayProps = {
  annotation: Annotation;
  selected: boolean;
  editing: boolean;
  /** Data URL for the shared signature image (signature annotations only). */
  signatureUrl: string | null;
  frameWidth: number;
  frameHeight: number;
  /** Rendered pixels per PDF point, for font size and stroke width. */
  scale: number;
  onSelect: (id: string) => void;
  onChange: (annotation: Annotation) => void;
  onStartEdit: (id: string) => void;
  onEndEdit: () => void;
  onRequestDelete: (id: string) => void;
};

/** A single selectable, draggable, resizable annotation on the page preview. */
export function AnnotationOverlay({
  annotation,
  selected,
  editing,
  signatureUrl,
  frameWidth,
  frameHeight,
  scale,
  onSelect,
  onChange,
  onStartEdit,
  onEndEdit,
  onRequestDelete,
}: AnnotationOverlayProps) {
  const dragRef = useRef<DragState | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const rotation = annotation.rotation ?? 0;

  const boxStyle: CSSProperties = {
    left: `${annotation.x * 100}%`,
    bottom: `${annotation.y * 100}%`,
    width: `${annotation.width * 100}%`,
    height: `${annotation.height * 100}%`,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
  };

  function commit(next: Annotation) {
    onChange(clampAnnotationBox(next));
  }

  // Lines are stored as a thin, rotated box, so the standard box clamp would
  // over-constrain a long or steeply-angled line near the edges. Instead just
  // keep the center on the page and enforce a minimum length.
  function commitLine(next: Annotation) {
    const width = Math.max(ANNOTATION_WIDTH_MIN, next.width);
    const centerX = Math.max(0, Math.min(1, next.x + width / 2));
    const centerY = Math.max(0, Math.min(1, next.y + next.height / 2));
    onChange({
      ...next,
      width,
      x: centerX - width / 2,
      y: centerY - next.height / 2,
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const start = drag.startAnnotation;

    if (drag.mode === "rotate") {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle =
        (Math.atan2(event.clientY - cy, event.clientX - cx) * 180) / Math.PI +
        90;
      // Snap to 15-degree steps while Shift is held.
      const snapped = event.shiftKey ? Math.round(angle / 15) * 15 : angle;
      commit({ ...annotation, rotation: Math.round(snapped) });
      return;
    }

    if (drag.mode === "move") {
      const moved = {
        ...annotation,
        x: start.x + deltaX / frameWidth,
        y: start.y - deltaY / frameHeight,
      };
      if (annotation.type === "line") commitLine(moved);
      else commit(moved);
      return;
    }

    if (drag.mode === "endpoint" && drag.endpoint && start.type === "line") {
      commitLine(
        resizeLineByEndpoint(
          start,
          drag.endpoint,
          deltaX,
          deltaY,
          frameWidth,
          frameHeight,
          event.shiftKey
        )
      );
      return;
    }

    // Resize: project the screen delta onto the box's local (unrotated) axes so
    // the handle tracks the pointer even when the box is rotated.
    const r = (rotation * Math.PI) / 180;
    const cos = Math.cos(r);
    const sin = Math.sin(r);
    const localDX = deltaX * cos + deltaY * sin;
    const localDY = -deltaX * sin + deltaY * cos;
    const nextWidth = start.width + localDX / frameWidth;

    if (annotation.type === "signature") {
      // Preserve on-screen aspect ratio (already includes page aspect).
      const ratio = start.width > 0 ? start.height / start.width : 0.4;
      const width = Math.max(0.03, nextWidth);
      commit({
        ...annotation,
        width,
        height: width * ratio,
      });
      return;
    }

    commit({
      ...annotation,
      width: nextWidth,
      height: start.height - localDY / frameHeight,
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released; ignore.
    }
  }

  function startMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (editing) return;
    event.preventDefault();
    onSelect(annotation.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode: "move",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startAnnotation: annotation,
    };
  }

  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    onSelect(annotation.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode: "resize",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startAnnotation: annotation,
    };
  }

  function startRotate(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    onSelect(annotation.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode: "rotate",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startAnnotation: annotation,
    };
  }

  function startEndpoint(
    event: ReactPointerEvent<HTMLDivElement>,
    endpoint: "start" | "end"
  ) {
    event.preventDefault();
    event.stopPropagation();
    onSelect(annotation.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode: "endpoint",
      endpoint,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startAnnotation: annotation,
    };
  }

  const isLine = annotation.type === "line";

  return (
    <div
      ref={rootRef}
      className={cn(
        "absolute touch-none",
        !editing && "cursor-grab active:cursor-grabbing",
        selected ? "ring-2 ring-primary" : "ring-1 ring-transparent hover:ring-primary/40"
      )}
      style={boxStyle}
      onPointerDown={startMove}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => {
        if (annotation.type === "text") onStartEdit(annotation.id);
      }}
      role="button"
      tabIndex={-1}
      aria-label={`${annotation.type} annotation`}
    >
      <AnnotationContent
        annotation={annotation}
        signatureUrl={signatureUrl}
        scale={scale}
        editing={editing}
        onChange={onChange}
        onEndEdit={onEndEdit}
      />

      {selected && (
        <>
          {/* Delete this instance (bottom-right, clear of the content area). */}
          <button
            type="button"
            aria-label={`Delete ${annotation.type}`}
            title="Delete"
            className="absolute -bottom-2.5 -right-2.5 flex size-6 items-center justify-center rounded-full border border-border bg-card text-destructive shadow-sm transition-colors hover:bg-destructive hover:text-white"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete(annotation.id);
            }}
          >
            <Trash2 className="size-3.5" />
          </button>

          {isLine ? (
            <>
              {/* Line endpoint handles (Shift snaps the angle to 15°). */}
              <div
                role="presentation"
                title="Drag to set the start point (hold Shift to snap angle)"
                className="absolute left-0 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 cursor-move rounded-full border-2 border-primary bg-background shadow-sm"
                onPointerDown={(e) => startEndpoint(e, "start")}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
              <div
                role="presentation"
                title="Drag to set the end point (hold Shift to snap angle)"
                className="absolute left-full top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 cursor-move rounded-full border-2 border-primary bg-background shadow-sm"
                onPointerDown={(e) => startEndpoint(e, "end")}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
            </>
          ) : (
            <>
              {/* Resize from the top-right corner (grows right/up). */}
              <div
                role="presentation"
                aria-hidden
                title="Drag to resize"
                className="absolute -right-1.5 -top-1.5 size-4 cursor-nesw-resize rounded-full border-2 border-primary bg-background shadow-sm"
                onPointerDown={startResize}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />

              {/* Rotate handle above the box (Shift snaps to 15 degrees). */}
              <div
                className="absolute -top-7 left-1/2 flex h-7 -translate-x-1/2 items-end justify-center"
                aria-hidden
              >
                <div className="h-4 w-px bg-primary" />
              </div>
              <div
                role="presentation"
                title="Drag to rotate (hold Shift to snap)"
                className="absolute -top-8 left-1/2 flex size-5 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border-2 border-primary bg-background text-primary shadow-sm active:cursor-grabbing"
                onPointerDown={startRotate}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                <RotateCw className="size-3" />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

type AnnotationContentProps = {
  annotation: Annotation;
  signatureUrl: string | null;
  scale: number;
  editing: boolean;
  onChange: (annotation: Annotation) => void;
  onEndEdit: () => void;
};

function AnnotationContent({
  annotation,
  signatureUrl,
  scale,
  editing,
  onChange,
  onEndEdit,
}: AnnotationContentProps) {
  if (annotation.type === "signature") {
    if (!signatureUrl) {
      return (
        <div className="pointer-events-none flex h-full w-full items-center justify-center rounded border border-dashed border-primary/50 bg-primary/5 text-[10px] text-muted-foreground">
          Signature
        </div>
      );
    }
    return (
      // Anchor bottom-left at natural aspect so preview position/size matches
      // the pdf-lib export (which draws height = width * imageAspect).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={signatureUrl}
        alt=""
        className="pointer-events-none absolute bottom-0 left-0 w-full select-none"
        draggable={false}
      />
    );
  }

  if (annotation.type === "text") {
    const textStyle: CSSProperties = {
      fontFamily: FONT_FAMILY_CSS[annotation.fontFamily],
      fontSize: `${Math.max(1, annotation.fontSize * scale)}px`,
      lineHeight: 1.25,
      color: annotation.color,
      fontWeight: annotation.bold ? 700 : 400,
      fontStyle: annotation.italic ? "italic" : "normal",
      textDecoration: annotation.underline ? "underline" : "none",
      textAlign: annotation.align ?? "left",
    };

    if (editing) {
      return (
        <textarea
          autoFocus
          value={annotation.text}
          onChange={(e) => onChange({ ...annotation, text: e.target.value })}
          onBlur={onEndEdit}
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className="h-full w-full resize-none border-none bg-transparent p-0 outline-none"
          style={textStyle}
        />
      );
    }

    return (
      <div
        className="pointer-events-none h-full w-full overflow-hidden whitespace-pre-wrap break-words"
        style={textStyle}
      >
        {annotation.text || " "}
      </div>
    );
  }

  // Shapes.
  const strokePx = Math.max(1, annotation.strokeWidth * scale);
  if (annotation.type === "rect") {
    return (
      <div
        className="pointer-events-none h-full w-full"
        style={{
          border: `${strokePx}px solid ${annotation.strokeColor}`,
          backgroundColor: annotation.fillColor ?? "transparent",
        }}
      />
    );
  }
  if (annotation.type === "ellipse") {
    return (
      <div
        className="pointer-events-none h-full w-full rounded-[50%]"
        style={{
          border: `${strokePx}px solid ${annotation.strokeColor}`,
          backgroundColor: annotation.fillColor ?? "transparent",
        }}
      />
    );
  }
  // Line: horizontal through the box center; the box rotation sets the angle.
  return (
    <svg
      className="pointer-events-none h-full w-full overflow-visible"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <line
        x1="0"
        y1="50"
        x2="100"
        y2="50"
        stroke={annotation.strokeColor}
        strokeWidth={strokePx}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
