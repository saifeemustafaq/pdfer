"use client";

import { useCallback, type ReactNode } from "react";
import { useDropzone, type Accept } from "react-dropzone";
import { cn } from "@/lib/utils";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

type FilePickerButtonProps = {
  onDrop: (files: File[]) => void;
  accept?: Accept;
  multiple?: boolean;
  maxSize?: number;
  disabled?: boolean;
  capture?: boolean | "environment" | "user";
  className?: string;
  children: (props: { open: () => void; disabled: boolean }) => ReactNode;
};

/** Button-triggered file pick via react-dropzone (camera, signature upload, etc.). */
export function FilePickerButton({
  onDrop,
  accept,
  multiple = false,
  maxSize = MAX_UPLOAD_BYTES,
  disabled = false,
  capture,
  className,
  children,
}: FilePickerButtonProps) {
  const handleDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onDrop(accepted);
    },
    [onDrop]
  );

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop: handleDrop,
    accept,
    multiple,
    maxSize,
    disabled,
    noClick: true,
    noKeyboard: true,
  });

  const captureValue =
    capture === true ? "environment" : capture === false ? undefined : capture;

  return (
    <div {...getRootProps({ className: cn(className) })}>
      <input {...getInputProps()} capture={captureValue} />
      {children({ open, disabled })}
    </div>
  );
}
