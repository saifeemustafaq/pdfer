"use client";

import { useCallback } from "react";
import { Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { SecondaryActionButton } from "@/components/app-button";
import { FilePickerButton } from "@/components/file-picker-button";
import { SignaturePageScopePanel } from "@/components/signature-page-scope-panel";
import { cn } from "@/lib/utils";
import { fileToImagePng } from "@/lib/image-overlay";
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

type PdfImageOptionsPanelProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  spec: SignatureSpec;
  onSpecChange: (spec: SignatureSpec) => void;
  onImageChange: (pngBytes: Uint8Array | null) => void;
  imagePng?: Uint8Array | null;
  pageCount: number;
};

const PLACEMENT_PRESETS: { id: SignaturePlacementPreset; label: string }[] = [
  { id: "bottom-left", label: "Bottom left" },
  { id: "bottom-center", label: "Bottom center" },
  { id: "bottom-right", label: "Bottom right" },
];

export function PdfImageOptionsPanel({
  enabled,
  onEnabledChange,
  spec,
  onSpecChange,
  onImageChange,
  imagePng = null,
  pageCount,
}: PdfImageOptionsPanelProps) {
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
        const png = await fileToImagePng(file);
        onImageChange(png);
        toast.success("Image loaded.");
      } catch (err) {
        console.error("image upload failed:", err);
        toast.error(
          err instanceof Error ? err.message : "Could not load image."
        );
      }
    },
    [onImageChange]
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
          <span className="block text-sm font-medium">Add image</span>
          <span className="block text-xs text-muted-foreground">
            Place an image on the page exactly as-is. No background removal.
          </span>
        </span>
      </label>

      <fieldset
        disabled={!enabled}
        className={cn("space-y-4 border-0 p-0 m-0", !enabled && "opacity-50")}
      >
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
              {imagePng?.length ? "Replace image" : "Upload image"}
            </SecondaryActionButton>
          )}
        </FilePickerButton>

        {imagePng?.length ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ImageIcon className="size-3.5" />
            Image ready. Drag it on the preview to position it.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Upload a PNG, JPEG, or WebP to place on the PDF.
          </p>
        )}

        <SignaturePageScopePanel
          spec={spec}
          onChange={onSpecChange}
          pageCount={pageCount}
          disabled={!enabled}
          legendLabel="Add image to"
          renderSummary={(count) =>
            `Image will be added to ${count} page${count !== 1 ? "s" : ""} on export.`
          }
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
            Copy current position to all selected pages
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
