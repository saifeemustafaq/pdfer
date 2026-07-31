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
import { resolveKeptPage } from "@/lib/page-nav";
import {
  applyActivePlacementToAllSignedPages,
  getActivePlacement,
  setActivePlacement,
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
  /** Pages marked for removal in the Pages tab (excluded from targeting). */
  removedPages?: Set<number>;
};

export function PdfImageOptionsPanel({
  enabled,
  onEnabledChange,
  spec,
  onSpecChange,
  onImageChange,
  imagePng = null,
  pageCount,
  removedPages,
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
          excludedPages={removedPages}
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
              onChange={(e) => {
                const target = (Number.parseInt(e.target.value, 10) || 1) - 1;
                const resolved = removedPages
                  ? resolveKeptPage(
                      target,
                      spec.activePageIndex,
                      removedPages,
                      pageCount
                    )
                  : Math.max(0, Math.min(target, Math.max(0, pageCount - 1)));
                onSpecChange({ ...spec, activePageIndex: resolved });
              }}
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

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Rotation (degrees)
          </span>
          <Input
            type="number"
            min={0}
            max={359}
            value={Math.round(activePlacement.rotation ?? 0)}
            onChange={(e) => {
              const raw = Number.parseInt(e.target.value, 10) || 0;
              updateActivePlacement({ rotation: ((raw % 360) + 360) % 360 });
            }}
            disabled={!enabled}
          />
          <span className="block text-[11px] text-muted-foreground">
            Or drag the rotate handle above the image on the preview.
          </span>
        </label>
      </fieldset>
    </div>
  );
}
