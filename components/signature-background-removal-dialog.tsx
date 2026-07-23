"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  applyWhiteKnockout,
  canvasToSignaturePng,
} from "@/lib/signature-image";

type SignatureBackgroundRemovalDialogProps = {
  open: boolean;
  source: HTMLCanvasElement | null;
  onConfirm: (pngBytes: Uint8Array) => void;
  onCancel: () => void;
};

const DEFAULT_STRENGTH = 15;

const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
  backgroundColor: "#f1f5f9",
};

function readSliderValue(values: number | readonly number[]): number {
  const next = Array.isArray(values) ? values[0] : values;
  return typeof next === "number" ? next : 0;
}

export function SignatureBackgroundRemovalDialog({
  open,
  source,
  onConfirm,
  onCancel,
}: SignatureBackgroundRemovalDialogProps) {
  const [strength, setStrength] = useState<number>(DEFAULT_STRENGTH);
  const [background, setBackground] = useState<"document" | "checkerboard">(
    "document"
  );
  const [processing, setProcessing] = useState(false);

  const previewUrl = useMemo(() => {
    if (!open || !source) return null;
    return applyWhiteKnockout(source, strength).toDataURL("image/png");
  }, [open, source, strength]);

  const handleConfirm = useCallback(async () => {
    if (!source) return;
    setProcessing(true);
    try {
      const knocked = applyWhiteKnockout(source, strength);
      const png = await canvasToSignaturePng(knocked);
      onConfirm(png);
    } catch (err) {
      console.error("signature background removal failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Could not process signature image."
      );
    } finally {
      setProcessing(false);
    }
  }, [source, strength, onConfirm]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !processing) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={!processing}>
        <DialogHeader>
          <DialogTitle>Remove signature background</DialogTitle>
          <DialogDescription>
            Drag the slider until the background disappears and only your
            signature remains. Works best on signatures with a light (white)
            background.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Preview background
            </span>
            <div className="inline-flex rounded-md border border-border p-0.5">
              <button
                type="button"
                onClick={() => setBackground("document")}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  background === "document"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Document
              </button>
              <button
                type="button"
                onClick={() => setBackground("checkerboard")}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  background === "checkerboard"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Transparency
              </button>
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-lg border border-border"
            style={
              background === "checkerboard"
                ? CHECKERBOARD_STYLE
                : { backgroundColor: "#ffffff" }
            }
          >
            {background === "document" && (
              <div
                className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-2.5 px-6 py-6"
                aria-hidden
              >
                <div className="h-2 w-3/4 rounded-full bg-slate-200" />
                <div className="h-2 w-full rounded-full bg-slate-200" />
                <div className="h-2 w-5/6 rounded-full bg-slate-200" />
                <div className="mt-6 flex items-end gap-2">
                  <span className="font-mono text-lg leading-none text-slate-400">
                    X
                  </span>
                  <span className="mb-1 h-px flex-1 bg-slate-400" />
                </div>
                <span className="text-[11px] text-slate-400">
                  Authorized signature
                </span>
              </div>
            )}

            <div className="relative flex min-h-[220px] items-center justify-center p-6">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Signature preview"
                  className="max-h-[180px] max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  Loading preview…
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Background removal
              </span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {strength}%
              </span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[strength]}
              onValueChange={(values) => setStrength(readSliderValue(values))}
              disabled={processing || !source}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Soft (white only)</span>
              <span>Aggressive (light grays)</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={processing || !source}
          >
            {processing ? "Processing…" : "Use signature"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
