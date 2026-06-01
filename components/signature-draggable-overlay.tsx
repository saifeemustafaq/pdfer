"use client";

import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/utils";
import {
  clampSignaturePosition,
  signatureOverlayStyle,
  type SignaturePosition,
} from "@/lib/pdf-form-sign";

type DragState = {
  mode: "move" | "resize";
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
  const pageAspect = frameWidth / frameHeight;

  const overlayStyle = signatureOverlayStyle(position);
  const positionStyle = {
    "--sig-left": overlayStyle.left,
    "--sig-bottom": overlayStyle.bottom,
    "--sig-width": overlayStyle.width,
  } as CSSProperties;

  function commitPosition(next: SignaturePosition) {
    onPositionChange(clampSignaturePosition(next, imageAspect, pageAspect));
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (drag.mode === "move") {
      commitPosition({
        ...drag.startPosition,
        x: drag.startPosition.x + deltaX / frameWidth,
        y: drag.startPosition.y - deltaY / frameHeight,
      });
      return;
    }

    commitPosition({
      ...drag.startPosition,
      width: drag.startPosition.width + deltaX / frameWidth,
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

  return (
    <div
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
        <div
          role="presentation"
          aria-hidden
          className="absolute -bottom-1 -right-1 size-3 cursor-nwse-resize rounded-sm border border-primary-foreground bg-primary shadow-sm"
          onPointerDown={startResize}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
      )}
    </div>
  );
}
