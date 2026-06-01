"use client";

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { SecondaryActionButton } from "@/components/app-button";
import { FilePickerButton } from "@/components/file-picker-button";
import { SignaturePadField } from "@/components/signature-pad-field";
import { SignaturePageScopePanel } from "@/components/signature-page-scope-panel";
import { cn } from "@/lib/utils";
import { DEFAULT_SIGNATURE_INK_COLOR } from "@/lib/constants";
import { fileToSignaturePng } from "@/lib/signature-image";
import {
  applyActivePlacementToAllSignedPages,
  applySignaturePreset,
  getActivePlacement,
  setActivePlacement,
  SIGNATURE_PLACEMENT_PRESETS,
  type SignaturePlacementPreset,
  type SignaturePosition,
  type SignatureSpec,
} from "@/lib/pdf-form-sign";

type PdfSignatureOptionsPanelProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  spec: SignatureSpec;
  onSpecChange: (spec: SignatureSpec) => void;
  onSignatureChange: (pngBytes: Uint8Array | null) => void;
  signaturePng?: Uint8Array | null;
  pageCount: number;
};

const PLACEMENT_PRESETS: { id: SignaturePlacementPreset; label: string }[] = [
  { id: "bottom-left", label: "Bottom left" },
  { id: "bottom-center", label: "Bottom center" },
  { id: "bottom-right", label: "Bottom right" },
];

export function PdfSignatureOptionsPanel({
  enabled,
  onEnabledChange,
  spec,
  onSpecChange,
  onSignatureChange,
  signaturePng = null,
  pageCount,
}: PdfSignatureOptionsPanelProps) {
  const [inkColor, setInkColor] = useState<string>(DEFAULT_SIGNATURE_INK_COLOR);
  const activePlacement = getActivePlacement(spec);

  function updateActivePlacement(
    patch: Partial<SignaturePosition> | SignaturePosition
  ) {
    const next: SignaturePosition =
      "x" in patch && "y" in patch && "width" in patch
        ? (patch as SignaturePosition)
        : { ...activePlacement, ...patch };
    onSpecChange(setActivePlacement(spec, next));
  }

  function applyPreset(preset: SignaturePlacementPreset) {
    updateActivePlacement(applySignaturePreset(activePlacement, preset));
  }

  const handleUploadDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      try {
        const png = await fileToSignaturePng(file);
        onSignatureChange(png);
        toast.success("Signature image loaded.");
      } catch (err) {
        console.error("signature upload failed:", err);
        toast.error(
          err instanceof Error ? err.message : "Could not load signature image."
        );
      }
    },
    [onSignatureChange]
  );

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <label className="flex items-start gap-2 rounded-lg border border-border px-3 py-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        <span>
          <span className="block text-sm font-medium">Add signature</span>
          <span className="block text-xs text-muted-foreground">
            Draw or upload a signature. Image overlay only, not a certified
            digital signature.
          </span>
        </span>
      </label>

      <fieldset
        disabled={!enabled}
        className={cn("space-y-4 border-0 p-0 m-0", !enabled && "opacity-50")}
      >
        <SignaturePadField
          value={signaturePng}
          onChange={onSignatureChange}
          inkColor={inkColor}
          onInkColorChange={setInkColor}
          disabled={!enabled}
        />

        <FilePickerButton
          onDrop={handleUploadDrop}
          accept={{
            "image/png": [".png"],
            "image/jpeg": [".jpg", ".jpeg"],
            "image/webp": [".webp"],
          }}
          multiple={false}
          disabled={!enabled}
        >
          {({ open, disabled: pickerDisabled }) => (
            <SecondaryActionButton
              type="button"
              className="w-full"
              disabled={pickerDisabled}
              onClick={open}
            >
              <Upload className="size-4" />
              Upload signature image
            </SecondaryActionButton>
          )}
        </FilePickerButton>

        <SignaturePageScopePanel
          spec={spec}
          onChange={onSpecChange}
          pageCount={pageCount}
          disabled={!enabled}
        />

        {spec.perPagePlacement && (
          <SecondaryActionButton
            type="button"
            className="w-full text-xs"
            disabled={!enabled}
            onClick={() =>
              onSpecChange(
                applyActivePlacementToAllSignedPages(spec, pageCount)
              )
            }
          >
            Copy current position to all signed pages
          </SecondaryActionButton>
        )}

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Preview page
            </span>
            <Input
              type="number"
              min={1}
              max={Math.max(1, pageCount)}
              value={spec.activePageIndex + 1}
              onChange={(e) =>
                onSpecChange({
                  ...spec,
                  activePageIndex: Math.max(
                    0,
                    Math.min(
                      (Number.parseInt(e.target.value, 10) || 1) - 1,
                      Math.max(0, pageCount - 1)
                    )
                  ),
                })
              }
              disabled={!enabled}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Width (% of page)
            </span>
            <Input
              type="number"
              min={10}
              max={80}
              value={Math.round(activePlacement.width * 100)}
              onChange={(e) =>
                updateActivePlacement({
                  width:
                    Math.max(
                      10,
                      Math.min(80, Number.parseInt(e.target.value, 10) || 35)
                    ) / 100,
                })
              }
              disabled={!enabled}
            />
          </label>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-muted-foreground">
            Position preset
          </legend>
          <div className="flex flex-wrap gap-2">
            {PLACEMENT_PRESETS.map(({ id, label }) => {
              const preset = SIGNATURE_PLACEMENT_PRESETS[id];
              const active =
                Math.abs(activePlacement.x - preset.x) < 0.001 &&
                Math.abs(activePlacement.y - preset.y) < 0.001;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!enabled}
                  onClick={() => applyPreset(id)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Horizontal (%)
            </span>
            <Input
              type="number"
              min={0}
              max={90}
              value={Math.round(activePlacement.x * 100)}
              onChange={(e) =>
                updateActivePlacement({
                  x:
                    Math.max(
                      0,
                      Math.min(90, Number.parseInt(e.target.value, 10) || 0)
                    ) / 100,
                })
              }
              disabled={!enabled}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              From bottom (%)
            </span>
            <Input
              type="number"
              min={0}
              max={90}
              value={Math.round(activePlacement.y * 100)}
              onChange={(e) =>
                updateActivePlacement({
                  y:
                    Math.max(
                      0,
                      Math.min(90, Number.parseInt(e.target.value, 10) || 0)
                    ) / 100,
                })
              }
              disabled={!enabled}
            />
          </label>
        </div>
      </fieldset>
    </div>
  );
}
