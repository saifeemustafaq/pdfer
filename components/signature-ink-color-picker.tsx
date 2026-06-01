"use client";

import type { CSSProperties, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SIGNATURE_INK_COLOR,
  SIGNATURE_INK_COLORS,
  SIGNATURE_INK_PRESET_OPTIONS,
  type SignatureInkPreset,
} from "@/lib/constants";

type SignatureInkColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  className?: string;
};

function normalizeHex(color: string): string {
  return color.trim().toLowerCase();
}

function activePreset(color: string): SignatureInkPreset | null {
  const normalized = normalizeHex(color);
  for (const preset of SIGNATURE_INK_PRESET_OPTIONS) {
    if (normalizeHex(SIGNATURE_INK_COLORS[preset.id]) === normalized) {
      return preset.id;
    }
  }
  return null;
}

type InkSwatchProps = {
  color: string;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: ReactNode;
};

function InkSwatch({
  color,
  label,
  active,
  disabled = false,
  onClick,
  children,
}: InkSwatchProps) {
  const swatchClassName = cn(
    "relative flex size-5 shrink-0 items-center justify-center rounded-full border border-border transition-transform",
    !disabled && "hover:scale-110",
    active && "ring-2 ring-primary ring-offset-1 ring-offset-background",
    disabled && "opacity-50"
  );

  const swatchStyle = { backgroundColor: color } as CSSProperties;

  return (
    <Tooltip>
      <TooltipTrigger
        disabled={disabled}
        render={
          onClick ? (
            <button
              type="button"
              disabled={disabled}
              aria-label={label}
              aria-pressed={active}
              onClick={onClick}
              className={swatchClassName}
              style={swatchStyle}
            />
          ) : (
            <label className={cn(swatchClassName, !disabled && "cursor-pointer")}>
              <span className="sr-only">{label}</span>
              <span
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={swatchStyle}
              />
              {children}
            </label>
          )
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Preset black/blue/red swatches plus a custom color picker for the signature pad. */
export function SignatureInkColorPicker({
  value,
  onChange,
  disabled = false,
  className,
}: SignatureInkColorPickerProps) {
  const selectedPreset = activePreset(value);
  const pickerValue =
    value.startsWith("#") && (value.length === 7 || value.length === 4)
      ? value
      : DEFAULT_SIGNATURE_INK_COLOR;

  return (
    <fieldset
      disabled={disabled}
      className={cn("space-y-2 border-0 p-0 m-0", disabled && "opacity-50", className)}
    >
      <legend className="text-xs font-medium text-muted-foreground">
        Ink color
      </legend>
      <div className="flex flex-wrap items-center gap-2 px-0.5 pt-0.5 pb-3">
        {SIGNATURE_INK_PRESET_OPTIONS.map(({ id, label }) => (
          <InkSwatch
            key={id}
            color={SIGNATURE_INK_COLORS[id]}
            label={label}
            active={selectedPreset === id}
            disabled={disabled}
            onClick={() => onChange(SIGNATURE_INK_COLORS[id])}
          />
        ))}

        <InkSwatch
          color={pickerValue}
          label="Custom"
          active={selectedPreset === null}
          disabled={disabled}
        >
          <Input
            type="color"
            value={pickerValue}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            aria-label="Custom ink color"
          />
        </InkSwatch>
      </div>
    </fieldset>
  );
}
