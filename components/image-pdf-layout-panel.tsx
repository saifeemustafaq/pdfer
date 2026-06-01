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
  /** Fixed left sidebar on large screens (merge). Inline card on small screens. */
  placement?: "sidebar" | "inline";
  disabled?: boolean;
  /** Shown when placement is sidebar (merge includes PDFs). */
  helperText?: string;
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

function PanelCard({
  enabled,
  onEnabledChange,
  layout,
  onLayoutChange,
  disabled,
  helperText,
  switchId,
}: Omit<ImagePdfLayoutPanelProps, "placement"> & { switchId: string }) {
  const fitLayout: ImagePdfLayoutOptions = {
    ...layout,
    mode: "fit-page",
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <label htmlFor={switchId} className="text-sm font-medium leading-tight">
            Fit images to page
          </label>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {helperText ??
              "Scale photos onto A4 or Letter. Off keeps each image at its original size."}
          </p>
        </div>
        <LayoutSwitch
          id={switchId}
          checked={enabled}
          onCheckedChange={onEnabledChange}
          disabled={disabled}
        />
      </div>

      {enabled && (
        <div className="space-y-3 pt-2 border-t border-border">
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

export function ImagePdfLayoutPanel({
  enabled,
  onEnabledChange,
  layout,
  onLayoutChange,
  placement = "inline",
  disabled = false,
  helperText,
}: ImagePdfLayoutPanelProps) {
  const switchId = "image-layout-enabled";

  const handleEnabledChange = (next: boolean) => {
    onEnabledChange(next);
    if (next && layout.mode === "native") {
      onLayoutChange(MERGE_IMAGE_LAYOUT_DEFAULT);
    }
  };

  const card = (
    <PanelCard
      enabled={enabled}
      onEnabledChange={handleEnabledChange}
      layout={layout}
      onLayoutChange={onLayoutChange}
      disabled={disabled}
      helperText={helperText}
      switchId={switchId}
    />
  );

  if (placement === "inline") {
    return card;
  }

  return (
    <>
      <aside
        aria-label="Image page layout"
        className="hidden lg:flex lg:flex-col fixed-layout-sidebar"
      >
        {card}
      </aside>
      <div className="lg:hidden">{card}</div>
    </>
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
