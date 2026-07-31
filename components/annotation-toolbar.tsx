"use client";

import type { ReactNode } from "react";
import {
  Bold,
  Italic,
  Underline,
  Trash2,
  Pencil,
  RotateCw,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TEXT_FONT_SIZE_MAX,
  TEXT_FONT_SIZE_MIN,
  type Annotation,
  type AnnotationFontFamily,
  type AnnotationTextAlign,
} from "@/lib/pdf-annotations";

type AnnotationToolbarProps = {
  annotation: Annotation;
  onChange: (annotation: Annotation) => void;
  onDelete: (id: string) => void;
  onEditText: (id: string) => void;
  /** Optional grab handle rendered at the start of the toolbar for dragging. */
  dragHandle?: ReactNode;
  className?: string;
};

const FONT_OPTIONS: { value: AnnotationFontFamily; label: string }[] = [
  { value: "helvetica", label: "Sans" },
  { value: "times", label: "Serif" },
  { value: "courier", label: "Mono" },
];

/** Contextual controls for the selected annotation (Adobe-style toolbar). */
export function AnnotationToolbar({
  annotation,
  onChange,
  onDelete,
  onEditText,
  dragHandle,
  className,
}: AnnotationToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-nowrap items-center justify-center gap-1.5 rounded-lg border border-border bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur-sm supports-[backdrop-filter]:bg-card/80",
        className
      )}
      role="toolbar"
      aria-label="Annotation options"
    >
      {dragHandle}

      {annotation.type === "text" && (
        <TextControls annotation={annotation} onChange={onChange} onEditText={onEditText} />
      )}

      {(annotation.type === "rect" ||
        annotation.type === "ellipse" ||
        annotation.type === "line") && (
        <ShapeControls annotation={annotation} onChange={onChange} />
      )}

      {annotation.type === "signature" && (
        <span className="px-1 text-xs font-medium text-muted-foreground">
          Signature
        </span>
      )}

      <div className="mx-0.5 h-5 w-px bg-border" aria-hidden />

      <label
        className="flex items-center gap-1 text-xs text-muted-foreground"
        title={
          annotation.type === "line"
            ? "Line angle in degrees"
            : "Rotation in degrees"
        }
      >
        <RotateCw className="size-4" />
        <input
          type="number"
          aria-label={
            annotation.type === "line" ? "Angle (degrees)" : "Rotation (degrees)"
          }
          value={Math.round(annotation.rotation ?? 0)}
          onChange={(e) => {
            const raw = Number.parseInt(e.target.value, 10) || 0;
            const normalized = ((raw % 360) + 360) % 360;
            onChange({ ...annotation, rotation: normalized });
          }}
          className="h-8 w-14 rounded-md border border-border bg-background px-1.5 text-xs tabular-nums"
        />
      </label>

      <div className="mx-0.5 h-5 w-px bg-border" aria-hidden />

      <button
        type="button"
        onClick={() => onDelete(annotation.id)}
        aria-label="Delete annotation"
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function ToggleButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md border text-sm transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-transparent text-muted-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

function TextControls({
  annotation,
  onChange,
  onEditText,
}: {
  annotation: Extract<Annotation, { type: "text" }>;
  onChange: (annotation: Annotation) => void;
  onEditText: (id: string) => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => onEditText(annotation.id)}
        aria-label="Edit text"
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
      >
        <Pencil className="size-4" />
      </button>

      <select
        aria-label="Font"
        value={annotation.fontFamily}
        onChange={(e) =>
          onChange({
            ...annotation,
            fontFamily: e.target.value as AnnotationFontFamily,
          })
        }
        className="h-8 rounded-md border border-border bg-background px-1.5 text-xs"
      >
        {FONT_OPTIONS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <input
        type="number"
        aria-label="Font size"
        min={TEXT_FONT_SIZE_MIN}
        max={TEXT_FONT_SIZE_MAX}
        value={Math.round(annotation.fontSize)}
        onChange={(e) =>
          onChange({
            ...annotation,
            fontSize: Math.max(
              TEXT_FONT_SIZE_MIN,
              Math.min(
                TEXT_FONT_SIZE_MAX,
                Number.parseInt(e.target.value, 10) || TEXT_FONT_SIZE_MIN
              )
            ),
          })
        }
        className="h-8 w-14 rounded-md border border-border bg-background px-1.5 text-xs tabular-nums"
      />

      <ColorSwatch
        label="Text color"
        value={annotation.color}
        onChange={(color) => onChange({ ...annotation, color })}
      />

      <ToggleButton
        active={annotation.bold}
        label="Bold"
        onClick={() => onChange({ ...annotation, bold: !annotation.bold })}
      >
        <Bold className="size-4" />
      </ToggleButton>
      <ToggleButton
        active={annotation.italic}
        label="Italic"
        onClick={() => onChange({ ...annotation, italic: !annotation.italic })}
      >
        <Italic className="size-4" />
      </ToggleButton>
      <ToggleButton
        active={annotation.underline}
        label="Underline"
        onClick={() =>
          onChange({ ...annotation, underline: !annotation.underline })
        }
      >
        <Underline className="size-4" />
      </ToggleButton>

      <div className="mx-0.5 h-5 w-px bg-border" aria-hidden />

      {(
        [
          { value: "left", label: "Align left", Icon: AlignLeft },
          { value: "center", label: "Align center", Icon: AlignCenter },
          { value: "right", label: "Align right", Icon: AlignRight },
        ] as const
      ).map(({ value, label, Icon }) => (
        <ToggleButton
          key={value}
          active={(annotation.align ?? "left") === value}
          label={label}
          onClick={() =>
            onChange({
              ...annotation,
              align: value as AnnotationTextAlign,
            })
          }
        >
          <Icon className="size-4" />
        </ToggleButton>
      ))}
    </>
  );
}

function ShapeControls({
  annotation,
  onChange,
}: {
  annotation: Extract<Annotation, { type: "rect" | "ellipse" | "line" }>;
  onChange: (annotation: Annotation) => void;
}) {
  const isLine = annotation.type === "line";
  const supportsFill = !isLine;
  return (
    <>
      <ColorSwatch
        label="Stroke color"
        value={annotation.strokeColor}
        onChange={(strokeColor) => onChange({ ...annotation, strokeColor })}
      />

      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>{isLine ? "Thickness" : "Width"}</span>
        <input
          type="number"
          aria-label="Stroke width"
          min={1}
          max={20}
          value={Math.round(annotation.strokeWidth)}
          onChange={(e) =>
            onChange({
              ...annotation,
              strokeWidth: Math.max(
                1,
                Math.min(20, Number.parseInt(e.target.value, 10) || 1)
              ),
            })
          }
          className="h-8 w-14 rounded-md border border-border bg-background px-1.5 text-xs tabular-nums"
        />
      </label>

      {isLine && (
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Length</span>
          <input
            type="number"
            aria-label="Line length (% of page width)"
            min={2}
            max={100}
            value={Math.round(annotation.width * 100)}
            onChange={(e) =>
              onChange({
                ...annotation,
                width:
                  Math.max(
                    2,
                    Math.min(100, Number.parseInt(e.target.value, 10) || 2)
                  ) / 100,
              })
            }
            className="h-8 w-14 rounded-md border border-border bg-background px-1.5 text-xs tabular-nums"
          />
          <span className="text-[10px]">%</span>
        </label>
      )}

      {supportsFill && (
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={annotation.fillColor !== null}
            onChange={(e) =>
              onChange({
                ...annotation,
                fillColor: e.target.checked ? "#ffe08a" : null,
              })
            }
          />
          Fill
          {annotation.fillColor !== null && (
            <ColorSwatch
              label="Fill color"
              value={annotation.fillColor}
              onChange={(fillColor) => onChange({ ...annotation, fillColor })}
            />
          )}
        </label>
      )}
    </>
  );
}

function ColorSwatch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className="relative flex size-8 cursor-pointer items-center justify-center rounded-md border border-border"
      aria-label={label}
      title={label}
    >
      <span
        className="size-4 rounded-sm border border-border"
        style={{ backgroundColor: value }}
      />
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}
