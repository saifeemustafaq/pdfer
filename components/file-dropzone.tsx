"use client";

import { useCallback } from "react";
import { useDropzone, type Accept } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

type FileDropzoneProps = {
  onDrop: (files: File[]) => void;
  accept?: Accept;
  multiple?: boolean;
  maxSize?: number;
  label?: string;
  hint?: string;
  disabled?: boolean;
  compact?: boolean;
  /** Stretch to fill parent height (e.g. beside a file list). */
  fillHeight?: boolean;
  className?: string;
};

export function FileDropzone({
  onDrop,
  accept,
  multiple = true,
  maxSize = MAX_UPLOAD_BYTES,
  label = "Drop files here, or click to browse.",
  hint,
  disabled = false,
  compact = false,
  fillHeight = false,
  className,
}: FileDropzoneProps) {
  const handleDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onDrop(accepted);
    },
    [onDrop]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject, open } =
    useDropzone({
      onDrop: handleDrop,
      accept,
      multiple,
      maxSize,
      disabled,
      noClick: false,
    });

  return (
    <div
      {...getRootProps({
        role: "button",
        tabIndex: 0,
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        },
      })}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed text-center cursor-pointer select-none",
        fillHeight ? "h-full min-h-[120px]" : "min-h-[140px] md:min-h-0",
        compact ? "p-3 bg-card border-border border-solid" : "p-8 bg-card",
        isDragActive && !isDragReject
          ? "border-primary bg-primary/5"
          : !compact && "border-border hover:border-primary/50 hover:bg-muted/50",
        isDragReject && "border-destructive bg-destructive/5",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <input {...getInputProps()} />
      <div
        className={cn(
          "flex items-center justify-center rounded-full transition-colors",
          compact ? "w-8 h-8 bg-muted text-muted-foreground" : "w-12 h-12 bg-muted text-muted-foreground",
          isDragActive && !isDragReject && "bg-primary text-primary-foreground"
        )}
      >
        <UploadCloud className={compact ? "w-4 h-4" : "w-8 h-8"} />
      </div>
      <div className="space-y-1">
        <p className={cn("font-medium", compact ? "text-sm" : "text-sm")}>
          {isDragActive
            ? isDragReject
              ? "File type not accepted"
              : "Drop to add"
            : compact
              ? "Add more files"
              : label}
        </p>
        {hint && !isDragActive && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
    </div>
  );
}
