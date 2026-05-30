"use client";

import { PDF_IMAGE_FORMATS, type PdfImageFormat } from "@/lib/constants";
import { cn } from "@/lib/utils";

type ImageFormatPickerProps = {
  value: PdfImageFormat;
  onChange: (value: PdfImageFormat) => void;
};

const FORMAT_ORDER: PdfImageFormat[] = ["jpeg", "png"];

export function ImageFormatPicker({ value, onChange }: ImageFormatPickerProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Image format</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {FORMAT_ORDER.map((format) => {
          const { label, description } = PDF_IMAGE_FORMATS[format];
          const selected = value === format;
          return (
            <button
              key={format}
              type="button"
              onClick={() => onChange(format)}
              className={cn(
                "flex items-start gap-3 text-left px-4 py-3 min-h-[48px] rounded-lg border transition-colors",
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                  selected ? "border-primary" : "border-muted-foreground/40"
                )}
              >
                {selected && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
