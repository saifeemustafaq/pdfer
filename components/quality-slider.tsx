"use client";

import { Button } from "@/components/ui/button";
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
            <Button
              key={preset}
              type="button"
              variant={selected ? "default" : "outline"}
              onClick={() => onChange(preset)}
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
                  {label}
                </span>
                <span
                  className={cn(
                    "text-xs block mt-0.5",
                    selected
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}
                >
                  {description}
                </span>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
