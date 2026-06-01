"use client";

import { useCallback, useEffect, useRef } from "react";
import { Eraser, Maximize2 } from "lucide-react";
import { IconTouchButton, SecondaryActionButton } from "@/components/app-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DEFAULT_SIGNATURE_INK_COLOR } from "@/lib/constants";
import {
  canvasToTrimmedPng,
  initSignatureCanvas,
  loadPngOntoCanvas,
  type SignatureCanvasSize,
} from "@/lib/signature-image";

type SignaturePadProps = {
  onChange: (pngBytes: Uint8Array | null) => void;
  inkColor?: string;
  disabled?: boolean;
  className?: string;
  size?: SignatureCanvasSize;
  initialPng?: Uint8Array | null;
  showExpandButton?: boolean;
  onExpandClick?: () => void;
};

const CANVAS_HEIGHT: Record<SignatureCanvasSize, string> = {
  compact: "h-36",
  large: "min-h-[220px] h-56 sm:h-64",
};

export function SignaturePad({
  onChange,
  inkColor = DEFAULT_SIGNATURE_INK_COLOR,
  disabled = false,
  className,
  size = "compact",
  initialPng = null,
  showExpandButton = false,
  onExpandClick,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inkColorRef = useRef(inkColor);
  const skipExternalLoadRef = useRef(false);
  inkColorRef.current = inkColor;

  const exportSignature = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || disabled) {
      onChange(null);
      return;
    }
    const bytes = await canvasToTrimmedPng(canvas);
    skipExternalLoadRef.current = true;
    onChange(bytes);
  }, [disabled, onChange]);

  const resetCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (initialPng?.length) {
      await loadPngOntoCanvas(canvas, initialPng, inkColorRef.current, size);
      return;
    }
    initSignatureCanvas(canvas, inkColorRef.current, size);
  }, [initialPng, size]);

  useEffect(() => {
    if (skipExternalLoadRef.current) {
      skipExternalLoadRef.current = false;
      return;
    }
    void resetCanvas();
  }, [initialPng, resetCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) ctx.strokeStyle = inkColor;
  }, [inkColor]);

  useEffect(() => {
    if (disabled) onChange(null);
  }, [disabled, onChange]);

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.strokeStyle = inkColorRef.current;
    canvas.setPointerCapture(event.pointerId);
    const { x, y } = getPoint(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !canvas.hasPointerCapture(event.pointerId)) return;

    const { x, y } = getPoint(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas?.hasPointerCapture(event.pointerId)) return;
    canvas.releasePointerCapture(event.pointerId);
    void exportSignature();
  }

  function handleClear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    initSignatureCanvas(canvas, inkColorRef.current, size);
    skipExternalLoadRef.current = true;
    onChange(null);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className={cn(
            "w-full rounded-lg border border-dashed border-border touch-none",
            CANVAS_HEIGHT[size],
            disabled
              ? "cursor-not-allowed bg-muted/40 opacity-50"
              : "signature-pad-grid bg-transparent"
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          aria-label="Draw your signature"
          aria-disabled={disabled}
        />
        {showExpandButton && !disabled && onExpandClick && (
          <Tooltip>
            <TooltipTrigger
              render={
                <IconTouchButton
                  type="button"
                  aria-label="Open larger signature pad"
                  onClick={onExpandClick}
                  className="absolute top-1.5 right-1.5 min-h-9 min-w-9 hover:text-foreground"
                >
                  <Maximize2 className="size-4" />
                </IconTouchButton>
              }
            />
            <TooltipContent>Larger signing area</TooltipContent>
          </Tooltip>
        )}
      </div>
      <SecondaryActionButton
        type="button"
        onClick={handleClear}
        disabled={disabled}
        className="w-full"
      >
        <Eraser className="size-4" />
        Clear drawing
      </SecondaryActionButton>
    </div>
  );
}
