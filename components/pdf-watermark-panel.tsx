"use client";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  DEFAULT_WATERMARK_SPEC,
  type WatermarkPosition,
  type WatermarkSpec,
} from "@/lib/pdf-watermark";

type PdfWatermarkPanelProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  spec: WatermarkSpec;
  onChange: (spec: WatermarkSpec) => void;
  pageCount: number;
  className?: string;
};

const POSITIONS: { id: WatermarkPosition; label: string }[] = [
  { id: "diagonal", label: "Diagonal" },
  { id: "center", label: "Center" },
  { id: "footer", label: "Footer" },
];

function readSliderValue(values: number | readonly number[]): number {
  const next = Array.isArray(values) ? values[0] : values;
  return typeof next === "number" ? next : 0;
}

export function PdfWatermarkPanel({
  enabled,
  onEnabledChange,
  spec,
  onChange,
  pageCount,
  className,
}: PdfWatermarkPanelProps) {
  function patch(partial: Partial<WatermarkSpec>) {
    onChange({ ...spec, ...partial });
  }

  function handleEnableChange(checked: boolean) {
    onEnabledChange(checked);
    if (checked && !spec.text.trim()) {
      patch({ text: DEFAULT_WATERMARK_SPEC.text });
    }
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <label className="flex items-start gap-2 rounded-lg border border-border px-3 py-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={enabled}
          onChange={(e) => handleEnableChange(e.target.checked)}
        />
        <span>
          <span className="block text-sm font-medium">Add text watermark</span>
          <span className="block text-xs text-muted-foreground">
            Off by default. Only applied when this is checked.
          </span>
        </span>
      </label>

      <fieldset
        disabled={!enabled}
        className={cn(
          "flex flex-col gap-4 border-0 p-0 m-0 min-w-0",
          !enabled && "opacity-50"
        )}
      >
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Watermark text
          </span>
          <Input
            value={spec.text}
            onChange={(e) => patch({ text: e.target.value })}
            placeholder={DEFAULT_WATERMARK_SPEC.text}
            disabled={!enabled}
          />
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Opacity
            </span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {Math.round(spec.opacity * 100)}%
            </span>
          </div>
          <Slider
            min={5}
            max={80}
            step={5}
            value={[Math.round(spec.opacity * 100)]}
            onValueChange={(values) =>
              patch({ opacity: readSliderValue(values) / 100 || 0.3 })
            }
            disabled={!enabled}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Text size
            </span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {Math.round(spec.fontSizeScale * 100)}%
            </span>
          </div>
          <Slider
            min={50}
            max={200}
            step={10}
            value={[Math.round(spec.fontSizeScale * 100)]}
            onValueChange={(values) =>
              patch({ fontSizeScale: readSliderValue(values) / 100 || 1 })
            }
            disabled={!enabled}
          />
        </div>

        {spec.position === "diagonal" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Rotation
              </span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {spec.rotationDegrees}°
              </span>
            </div>
            <Slider
              min={-90}
              max={90}
              step={5}
              value={[spec.rotationDegrees]}
              onValueChange={(values) =>
                patch({ rotationDegrees: readSliderValue(values) })
              }
              disabled={!enabled}
            />
          </div>
        )}

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-muted-foreground">
            Position
          </legend>
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => patch({ position: id })}
                disabled={!enabled}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  spec.position === id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/40"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-muted-foreground">
            Pages
          </legend>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={spec.pageScope === "all"}
                onChange={() => patch({ pageScope: "all" })}
                disabled={!enabled}
              />
              All pages
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={spec.pageScope === "range"}
                onChange={() =>
                  patch({
                    pageScope: "range",
                    rangeStart: spec.rangeStart ?? 1,
                    rangeEnd: spec.rangeEnd ?? pageCount,
                  })
                }
                disabled={!enabled}
              />
              Page range
            </label>
          </div>
          {spec.pageScope === "range" && pageCount > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Input
                type="number"
                min={1}
                max={pageCount}
                value={spec.rangeStart ?? 1}
                onChange={(e) =>
                  patch({
                    rangeStart: Number.parseInt(e.target.value, 10) || 1,
                  })
                }
                aria-label="Watermark from page"
                disabled={!enabled}
              />
              <Input
                type="number"
                min={1}
                max={pageCount}
                value={spec.rangeEnd ?? pageCount}
                onChange={(e) =>
                  patch({
                    rangeEnd: Number.parseInt(e.target.value, 10) || pageCount,
                  })
                }
                aria-label="Watermark to page"
                disabled={!enabled}
              />
            </div>
          )}
        </fieldset>
      </fieldset>
    </div>
  );
}
