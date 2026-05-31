"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Images, Loader2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import {
  PrimaryActionButton,
  SecondaryActionButton,
  DestructiveActionButton,
} from "@/components/app-button";
import { ToolShell } from "@/components/tool-shell";
import { FileDropzone } from "@/components/file-dropzone";
import { FileList } from "@/components/file-list";
import { DownloadButton } from "@/components/download-button";
import { ActionButtonGroup } from "@/components/action-button-group";
import { ProcessingProgress } from "@/components/processing-progress";
import { SizeWarning } from "@/components/size-warning";
import {
  API_ROUTES,
  MAX_UPLOAD_BYTES,
  OUTPUT_FILENAMES,
  TOOL_ROUTES,
  UPLOAD_WARN_BYTES,
} from "@/lib/constants";
import { formatBytes } from "@/lib/file-utils";
import { triggerBlobDownload } from "@/lib/download-client";
import type { StagedFileItem } from "@/types";

const IMAGE_ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

let idCounter = 0;
function newId() {
  return `img-${++idCounter}-${Math.random().toString(36).slice(2)}`;
}

export function ImageToPdfClient() {
  const [items, setItems] = useState<StagedFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);

  const totalSize = items.reduce((s, i) => s + i.file.size, 0);
  const overLimit = totalSize > MAX_UPLOAD_BYTES;
  const showWarn = totalSize > UPLOAD_WARN_BYTES;

  const handleDrop = useCallback((files: File[]) => {
    setResult(null);
    setItems((prev) => [
      ...prev,
      ...files.map((f) => ({ id: newId(), file: f })),
    ]);
  }, []);

  async function handleConvert() {
    if (items.length === 0) return;
    if (overLimit) {
      toast.error("File too large: 6 MB limit");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const form = new FormData();
      items.forEach((item) => form.append("images", item.file));

      const res = await fetch(API_ROUTES.imageToPdf, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Request failed" }));
        toast.error(body.error ?? "Processing failed. Please try again.");
        return;
      }

      const blob = await res.blob();
      setResult(blob);
      toast.success("Done. Downloading…");
      triggerBlobDownload(blob, OUTPUT_FILENAMES.imageToPdf, 300);
    } catch (err) {
      console.error("POST /api/image-to-pdf failed:", err);
      toast.error("Processing failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setItems([]);
    setResult(null);
  }

  return (
    <ToolShell
      icon={Images}
      title="Image to PDF"
      description="Upload images in the order you want them. Each image becomes one page."
    >
      <Link
        href={TOOL_ROUTES.convert}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground -mt-4 md:hidden"
      >
        <ChevronLeft className="w-3 h-3" />
        Convert options
      </Link>
      <FileDropzone
        onDrop={handleDrop}
        accept={IMAGE_ACCEPT}
        multiple
        compact={items.length > 0}
        label="Drop images here, or click to browse."
        hint="Accepts JPEG, PNG · max 6 MB total"
        disabled={loading}
      />

      {items.length > 0 && !result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {items.length} image{items.length !== 1 ? "s" : ""}
              <span className="text-muted-foreground font-normal font-mono tabular-nums ml-2">
                ({formatBytes(totalSize)})
              </span>
            </p>
            <DestructiveActionButton type="button" onClick={handleReset}>
              Clear all
            </DestructiveActionButton>
          </div>

          {showWarn && <SizeWarning overLimit={overLimit} />}
          <FileList items={items} onReorder={setItems} />
          <ProcessingProgress key={String(loading)} active={loading} />

          <div className="sticky bottom-16 md:static md:bottom-auto">
            <PrimaryActionButton
              onClick={handleConvert}
              disabled={loading || overLimit}
              className="w-full"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Processing…" : "Convert to PDF"}
            </PrimaryActionButton>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your PDF is ready:{" "}
            <span className="font-mono tabular-nums text-foreground">
              {formatBytes(result.size)}
            </span>
          </p>
          <ActionButtonGroup>
            <DownloadButton
              blob={result}
              filename={OUTPUT_FILENAMES.imageToPdf}
              label="Download"
            />
            <SecondaryActionButton type="button" onClick={handleReset}>
              Convert more images
            </SecondaryActionButton>
          </ActionButtonGroup>
        </div>
      )}
    </ToolShell>
  );
}
