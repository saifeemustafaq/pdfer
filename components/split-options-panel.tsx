"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  previewSplitEveryN,
  type PageRange,
} from "@/lib/pdf-split";

export type SplitMode = "range" | "every-n" | "extract";

type SplitOptionsPanelProps = {
  mode: SplitMode;
  onModeChange: (mode: SplitMode) => void;
  pageCount: number;
  rangeStart: number;
  rangeEnd: number;
  onRangeStartChange: (value: number) => void;
  onRangeEndChange: (value: number) => void;
  pagesPerFile: number;
  onPagesPerFileChange: (value: number) => void;
  className?: string;
};

const MODES: { id: SplitMode; label: string; description: string }[] = [
  {
    id: "range",
    label: "Page range",
    description: "Keep one continuous range, e.g. pages 3–7.",
  },
  {
    id: "every-n",
    label: "Every N pages",
    description: "Split into equal chunks, downloaded as a ZIP.",
  },
  {
    id: "extract",
    label: "Extract selected",
    description: "Pick individual pages from thumbnails.",
  },
];

export function SplitOptionsPanel({
  mode,
  onModeChange,
  pageCount,
  rangeStart,
  rangeEnd,
  onRangeStartChange,
  onRangeEndChange,
  pagesPerFile,
  onPagesPerFileChange,
  className,
}: SplitOptionsPanelProps) {
  const everyNPreview =
    pageCount > 0 && pagesPerFile > 0
      ? previewSplitEveryN(pageCount, pagesPerFile)
      : null;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Split method</legend>
        <div className="flex flex-col gap-2">
          {MODES.map(({ id, label, description }) => (
            <label
              key={id}
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border px-3 py-3 transition-colors",
                mode === id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              <input
                type="radio"
                name="split-mode"
                value={id}
                checked={mode === id}
                onChange={() => onModeChange(id)}
                className="mt-1"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">
                  {description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {mode === "range" && pageCount > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              From page
            </span>
            <Input
              type="number"
              min={1}
              max={pageCount}
              value={rangeStart}
              onChange={(e) =>
                onRangeStartChange(Number.parseInt(e.target.value, 10) || 1)
              }
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              To page
            </span>
            <Input
              type="number"
              min={1}
              max={pageCount}
              value={rangeEnd}
              onChange={(e) =>
                onRangeEndChange(Number.parseInt(e.target.value, 10) || 1)
              }
            />
          </label>
          <p className="col-span-2 text-xs text-muted-foreground">
            Document has {pageCount} page{pageCount !== 1 ? "s" : ""}.
          </p>
        </div>
      )}

      {mode === "every-n" && pageCount > 0 && (
        <div className="space-y-2">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Pages per file
            </span>
            <Input
              type="number"
              min={1}
              max={pageCount}
              value={pagesPerFile}
              onChange={(e) =>
                onPagesPerFileChange(Number.parseInt(e.target.value, 10) || 1)
              }
            />
          </label>
          {everyNPreview && everyNPreview.fileCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {pageCount} pages → {everyNPreview.fileCount} file
              {everyNPreview.fileCount !== 1 ? "s" : ""}
              {everyNPreview.fileCount > 1
                ? ` (last file has ${everyNPreview.lastFilePages} page${
                    everyNPreview.lastFilePages !== 1 ? "s" : ""
                  })`
                : ""}
              , downloaded as a ZIP.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function buildRangeFromInputs(
  startPage: number,
  endPage: number,
  pageCount: number
): PageRange {
  return {
    start: Math.max(0, Math.min(startPage, pageCount) - 1),
    end: Math.max(0, Math.min(endPage, pageCount) - 1),
  };
}
