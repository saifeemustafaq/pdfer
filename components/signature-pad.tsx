"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Maximize2, Undo2, Redo2 } from "lucide-react";
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

  // Per-stroke snapshot history for undo/redo. history[0] is the pristine
  // baseline (blank or the loaded signature); each completed stroke pushes a
  // new full-resolution ImageData snapshot.
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const MAX_HISTORY = 50;

  const updateHistoryFlags = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const snapshotCanvas = useCallback((): ImageData | null => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || canvas.width === 0 || canvas.height === 0) {
      return null;
    }
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, []);

  const resetHistory = useCallback(() => {
    const baseline = snapshotCanvas();
    historyRef.current = baseline ? [baseline] : [];
    historyIndexRef.current = 0;
    updateHistoryFlags();
  }, [snapshotCanvas, updateHistoryFlags]);

  const pushHistory = useCallback(() => {
    const snap = snapshotCanvas();
    if (!snap) return;
    const kept = historyRef.current.slice(0, historyIndexRef.current + 1);
    kept.push(snap);
    const overflow = kept.length - MAX_HISTORY;
    historyRef.current = overflow > 0 ? kept.slice(overflow) : kept;
    historyIndexRef.current = historyRef.current.length - 1;
    updateHistoryFlags();
  }, [snapshotCanvas, updateHistoryFlags]);

  const restoreHistory = useCallback((index: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const snap = historyRef.current[index];
    if (!canvas || !ctx || !snap) return;
    ctx.putImageData(snap, 0, 0);
  }, []);

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
    } else {
      initSignatureCanvas(canvas, inkColorRef.current, size);
    }
    resetHistory();
  }, [initialPng, size, resetHistory]);

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
    pushHistory();
    void exportSignature();
  }

  function handleUndo() {
    if (disabled || historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    restoreHistory(historyIndexRef.current);
    updateHistoryFlags();
    void exportSignature();
  }

  function handleRedo() {
    if (disabled || historyIndexRef.current >= historyRef.current.length - 1) {
      return;
    }
    historyIndexRef.current += 1;
    restoreHistory(historyIndexRef.current);
    updateHistoryFlags();
    void exportSignature();
  }

  function handleClear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    initSignatureCanvas(canvas, inkColorRef.current, size);
    resetHistory();
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
      <div className="grid grid-cols-2 gap-2">
        <SecondaryActionButton
          type="button"
          onClick={handleUndo}
          disabled={disabled || !canUndo}
          aria-label="Undo last stroke"
        >
          <Undo2 className="size-4" />
          Undo
        </SecondaryActionButton>
        <SecondaryActionButton
          type="button"
          onClick={handleRedo}
          disabled={disabled || !canRedo}
          aria-label="Redo stroke"
        >
          <Redo2 className="size-4" />
          Redo
        </SecondaryActionButton>
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
