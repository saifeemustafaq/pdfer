"use client";

import {
  DEFAULT_IMAGE_PDF_LAYOUT,
  MERGE_IMAGE_LAYOUT_DEFAULT,
  type ImagePdfLayoutOptions,
} from "@/lib/image-pdf-layout";
import { cn } from "@/lib/utils";
import { ImagePdfLayoutOptions as ImagePdfLayoutControls } from "@/components/image-pdf-layout-options";

type ImagePdfLayoutPanelProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  layout: ImagePdfLayoutOptions;
  onLayoutChange: (layout: ImagePdfLayoutOptions) => void;
  disabled?: boolean;
  helperText?: string;
  /** When true, show copy explaining mixed page sizes were detected. */
  unevenDimensionsDetected?: boolean;
};

function LayoutSwitch({
  id,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked
          ? "border-primary bg-primary"
          : "border-border bg-muted",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0.5 left-0.5 block h-5 w-5 rounded-full bg-background shadow-sm transition-transform",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}

export function ImagePdfLayoutPanel({
  enabled,
  onEnabledChange,
  layout,
  onLayoutChange,
  disabled = false,
  helperText,
  unevenDimensionsDetected = false,
}: ImagePdfLayoutPanelProps) {
  const switchId = "image-layout-enabled";

  const handleEnabledChange = (next: boolean) => {
    onEnabledChange(next);
    if (next && layout.mode === "native") {
      onLayoutChange(MERGE_IMAGE_LAYOUT_DEFAULT);
    }
  };

  const fitLayout: ImagePdfLayoutOptions = {
    ...layout,
    mode: "fit-page",
  };

  const defaultHelper =
    "Scale photos onto A4 or Letter. Off keeps each image at its original size.";
  const unevenHelper =
    "Mixed page sizes detected. Turn this on to fit each image onto a consistent page size.";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      {unevenDimensionsDetected && !enabled && (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-foreground">
          Your files use different page sizes. Enabling this will place every
          image on the same page dimensions.
        </p>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <label htmlFor={switchId} className="text-sm font-medium leading-tight">
            {unevenDimensionsDetected ? "Same page size" : "Fit images to page"}
          </label>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {helperText ??
              (unevenDimensionsDetected ? unevenHelper : defaultHelper)}
          </p>
        </div>
        <LayoutSwitch
          id={switchId}
          checked={enabled}
          onCheckedChange={handleEnabledChange}
          disabled={disabled}
        />
      </div>

      {enabled && (
        <div className="space-y-3 border-t border-border pt-2">
          <ImagePdfLayoutControls
            value={fitLayout}
            onChange={(next) => onLayoutChange({ ...next, mode: "fit-page" })}
            showModePicker={false}
          />
        </div>
      )}
    </div>
  );
}

/** Layout passed to processing when the panel toggle is off. */
export function resolveImageLayoutForProcessing(
  enabled: boolean,
  layout: ImagePdfLayoutOptions
): ImagePdfLayoutOptions {
  if (!enabled) {
    return DEFAULT_IMAGE_PDF_LAYOUT;
  }
  return { ...layout, mode: "fit-page" };
}
