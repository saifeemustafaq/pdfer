"use client";

import { useCallback, useEffect, useRef } from "react";
import { Eraser } from "lucide-react";
import { SecondaryActionButton } from "@/components/app-button";
import { cn } from "@/lib/utils";
import { canvasToTrimmedPng } from "@/lib/signature-image";

type SignaturePadProps = {
  onChange: (pngBytes: Uint8Array | null) => void;
  disabled?: boolean;
  className?: string;
};

function resolveStrokeColor(): string {
  if (typeof document === "undefined") return "currentColor";
  const foreground = getComputedStyle(document.documentElement)
    .getPropertyValue("--foreground")
    .trim();
  return foreground || "currentColor";
}

function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(dpr, dpr);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = resolveStrokeColor();
  return ctx;
}

export function SignaturePad({
  onChange,
  disabled = false,
  className,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const exportSignature = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || disabled) {
      onChange(null);
      return;
    }
    const bytes = await canvasToTrimmedPng(canvas);
    onChange(bytes);
  }, [disabled, onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setupCanvas(canvas);
  }, []);

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
    setupCanvas(canvas);
    onChange(null);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <canvas
        ref={canvasRef}
        className={cn(
          "h-36 w-full rounded-lg border border-dashed border-border touch-none",
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
