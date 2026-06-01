"use client";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_IMAGE_PDF_LAYOUT,
  type ImagePdfLayoutMode,
  type ImagePdfLayoutOptions,
  type MarginPreset,
  type PageOrientation,
  type PageSizeKey,
} from "@/lib/image-pdf-layout";
import { cn } from "@/lib/utils";

type ImagePdfLayoutOptionsProps = {
  value: ImagePdfLayoutOptions;
  onChange: (value: ImagePdfLayoutOptions) => void;
  /** When false, only A4/Letter, orientation, and margins (toggle supplies fit-page). */
  showModePicker?: boolean;
};

const MODE_OPTIONS: { value: ImagePdfLayoutMode; label: string; description: string }[] =
  [
    {
      value: "native",
      label: "Original size",
      description: "Each page matches the image dimensions.",
    },
    {
      value: "fit-page",
      label: "Fit to page",
      description: "Scale images onto A4 or Letter with margins.",
    },
  ];

const PAGE_SIZE_OPTIONS: { value: PageSizeKey; label: string }[] = [
  { value: "a4", label: "A4" },
  { value: "letter", label: "US Letter" },
];

const ORIENTATION_OPTIONS: { value: PageOrientation; label: string }[] = [
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
];

const MARGIN_OPTIONS: { value: MarginPreset; label: string }[] = [
  { value: "none", label: "None" },
  { value: "narrow", label: "Narrow" },
  { value: "standard", label: "Standard" },
];

function OptionRow<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={value === option.value ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className="min-h-10"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function ImagePdfLayoutOptions({
  value,
  onChange,
  showModePicker = true,
}: ImagePdfLayoutOptionsProps) {
  const fitPage = value.mode === "fit-page";

  return (
    <div className={cn("space-y-4", showModePicker && "rounded-xl border border-border bg-card p-4")}>
      {showModePicker && (
      <div className="space-y-2">
        <p className="text-sm font-medium">Page layout</p>
        <div className="grid grid-cols-1 gap-2">
          {MODE_OPTIONS.map((option) => {
            const selected = value.mode === option.value;
            return (
              <Button
                key={option.value}
                type="button"
                variant={selected ? "default" : "outline"}
                onClick={() =>
                  onChange({
                    ...(selected ? value : DEFAULT_IMAGE_PDF_LAYOUT),
                    mode: option.value,
                  })
                }
                className={cn(
                  "h-auto w-full flex items-start gap-3 text-left px-4 py-3 min-h-[48px] whitespace-normal"
                )}
              >
                <div className="flex-1 min-w-0 text-left">
                  <span
                    className={cn(
                      "text-sm font-medium block",
                      selected ? "text-primary-foreground" : "text-foreground"
                    )}
                  >
                    {option.label}
                  </span>
                  <span
                    className={cn(
                      "text-xs block mt-0.5",
                      selected
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    )}
                  >
                    {option.description}
                  </span>
                </div>
              </Button>
            );
          })}
        </div>
      </div>
      )}

      {(showModePicker ? fitPage : true) && (
        <div
          className={cn(
            "space-y-4",
            showModePicker && "pt-2 border-t border-border"
          )}
        >
          <OptionRow
            label="Page size"
            options={PAGE_SIZE_OPTIONS}
            value={value.pageSize}
            onChange={(pageSize) => onChange({ ...value, pageSize })}
          />
          <OptionRow
            label="Orientation"
            options={ORIENTATION_OPTIONS}
            value={value.orientation}
            onChange={(orientation) => onChange({ ...value, orientation })}
          />
          <OptionRow
            label="Margins"
            options={MARGIN_OPTIONS}
            value={value.margin}
            onChange={(margin) => onChange({ ...value, margin })}
          />
        </div>
      )}
    </div>
  );
}
