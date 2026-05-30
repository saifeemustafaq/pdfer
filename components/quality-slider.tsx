"use client";

import { QUALITY_PRESETS, type QualityPreset } from "@/lib/constants";
import { cn } from "@/lib/utils";

type QualitySliderProps = {
  value: QualityPreset;
  onChange: (value: QualityPreset) => void;
};

const PRESET_ORDER: QualityPreset[] = ["low", "medium", "high"];

export function QualitySlider({ value, onChange }: QualitySliderProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Compression quality</p>
      <div className="grid grid-cols-1 gap-2">
        {PRESET_ORDER.map((preset) => {
          const { label, description } = QUALITY_PRESETS[preset];
          const selected = value === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
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
