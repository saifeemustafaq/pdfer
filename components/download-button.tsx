"use client";

import { Download } from "lucide-react";
import { PrimaryActionButton } from "@/components/app-button";
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
