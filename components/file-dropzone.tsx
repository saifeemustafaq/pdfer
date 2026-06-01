"use client";

import { useCallback } from "react";
import { useDropzone, type Accept } from "react-dropzone";
import { Camera, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { useIsMobile } from "@/hooks/use-mobile";
import { SecondaryActionButton } from "@/components/app-button";
import { FilePickerButton } from "@/components/file-picker-button";

type FileDropzoneProps = {
  onDrop: (files: File[]) => void;
  accept?: Accept;
  multiple?: boolean;
  maxSize?: number;
  label?: string;
  hint?: string;
  disabled?: boolean;
  compact?: boolean;
  fillHeight?: boolean;
  className?: string;
  capture?: boolean | "environment" | "user";
  showCameraButton?: boolean;
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
  capture,
  showCameraButton = false,
}: FileDropzoneProps) {
  const isMobile = useIsMobile();

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

  const inputProps = getInputProps();
  const captureValue =
    capture === true ? "environment" : capture === false ? undefined : capture;

  const showCamera = showCameraButton && isMobile;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
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
          fillHeight ? "h-full min-h-[120px]" : "min-h-[220px]",
          compact ? "p-3 bg-card border-border border-solid" : "p-8 bg-card",
          isDragActive && !isDragReject
            ? "border-primary bg-primary/5"
            : !compact && "border-border hover:border-primary/50 hover:bg-muted/50",
          isDragReject && "border-destructive bg-destructive/5",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <input {...inputProps} capture={captureValue} />
        <div
          className={cn(
            "flex items-center justify-center rounded-full transition-colors",
            compact
              ? "w-8 h-8 bg-muted text-muted-foreground"
              : "w-12 h-12 bg-muted text-muted-foreground",
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

      {showCamera && (
        <FilePickerButton
          onDrop={handleDrop}
          accept={{ "image/*": [] }}
          multiple={false}
          disabled={disabled}
          capture="environment"
        >
          {({ open, disabled: pickerDisabled }) => (
            <SecondaryActionButton
              type="button"
              onClick={open}
              disabled={pickerDisabled}
              className="w-full"
            >
              <Camera className="size-4" />
              Take photo
            </SecondaryActionButton>
          )}
        </FilePickerButton>
      )}
    </div>
  );
}
