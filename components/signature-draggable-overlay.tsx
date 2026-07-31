"use client";

import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clampSignaturePosition,
  signatureOverlayStyle,
  type SignaturePosition,
} from "@/lib/pdf-form-sign";

type DragState = {
  mode: "move" | "resize" | "rotate";
  pointerId: number;
  startX: number;
  startY: number;
  startPosition: SignaturePosition;
};

type SignatureDraggableOverlayProps = {
  signatureUrl: string;
  position: SignaturePosition;
  imageAspect: number;
  frameWidth: number;
  frameHeight: number;
  disabled?: boolean;
  onPositionChange: (position: SignaturePosition) => void;
};

/** Draggable/resizable signature overlay for the edit PDF preview. */
export function SignatureDraggableOverlay({
  signatureUrl,
  position,
  imageAspect,
  frameWidth,
  frameHeight,
  disabled = false,
  onPositionChange,
}: SignatureDraggableOverlayProps) {
  const dragRef = useRef<DragState | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const pageAspect = frameWidth / frameHeight;
  const rotation = position.rotation ?? 0;

  const overlayStyle = signatureOverlayStyle(position);
  const positionStyle = {
    "--sig-left": overlayStyle.left,
    "--sig-bottom": overlayStyle.bottom,
    "--sig-width": overlayStyle.width,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
  } as CSSProperties;

  function commitPosition(next: SignaturePosition) {
    const clamped = clampSignaturePosition(next, imageAspect, pageAspect);
    onPositionChange({ ...clamped, rotation: next.rotation ?? 0 });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (drag.mode === "rotate") {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle =
        (Math.atan2(event.clientY - cy, event.clientX - cx) * 180) / Math.PI +
        90;
      const snapped = event.shiftKey ? Math.round(angle / 15) * 15 : angle;
      commitPosition({
        ...drag.startPosition,
        rotation: ((Math.round(snapped) % 360) + 360) % 360,
      });
      return;
    }

    if (drag.mode === "move") {
      commitPosition({
        ...drag.startPosition,
        x: drag.startPosition.x + deltaX / frameWidth,
        y: drag.startPosition.y - deltaY / frameHeight,
      });
      return;
    }

    // Resize: project the screen delta onto the image's local (unrotated) x-axis
    // so the handle tracks the pointer even when the image is rotated.
    const r = (rotation * Math.PI) / 180;
    const localDX = deltaX * Math.cos(r) + deltaY * Math.sin(r);
    commitPosition({
      ...drag.startPosition,
      width: drag.startPosition.width + localDX / frameWidth,
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function startMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode: "move",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: position,
    };
  }

  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode: "resize",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: position,
    };
  }

  function startRotate(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode: "rotate",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: position,
    };
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "pdf-preview-overlay-signature absolute touch-none",
        !disabled &&
          "cursor-grab ring-2 ring-primary/70 active:cursor-grabbing"
      )}
      style={positionStyle}
      onPointerDown={startMove}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      aria-label="Signature placement. Drag to move."
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={signatureUrl}
        alt=""
        className="block h-auto w-full select-none"
        draggable={false}
      />
      {!disabled && (
        <>
          <div
            role="presentation"
            aria-hidden
            title="Drag to resize"
            className="absolute -bottom-1 -right-1 size-3 cursor-nwse-resize rounded-sm border border-primary-foreground bg-primary shadow-sm"
            onPointerDown={startResize}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          />

          {/* Rotate handle above the image (hold Shift to snap to 15°). */}
          <div
            className="absolute -top-6 left-1/2 flex h-6 -translate-x-1/2 items-end justify-center"
            aria-hidden
          >
            <div className="h-3 w-px bg-primary" />
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
    </div>
  );
}
