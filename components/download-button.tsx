"use client";

import { Download } from "lucide-react";
import { PrimaryActionButton } from "@/components/app-button";
import { triggerBlobDownload } from "@/lib/download-client";
import { cn } from "@/lib/utils";

type DownloadButtonProps = {
  blob: Blob;
  filename: string;
  label?: string;
  className?: string;
};

export function DownloadButton({
  blob,
  filename,
  label = "Download",
  className,
}: DownloadButtonProps) {
  function handleDownload() {
    triggerBlobDownload(blob, filename);
  }

  return (
    <PrimaryActionButton
      onClick={handleDownload}
      className={cn(className)}
    >
      <Download className="w-4 h-4" />
      {label}
    </PrimaryActionButton>
  );
}
