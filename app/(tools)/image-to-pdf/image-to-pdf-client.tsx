"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Images, Loader2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import {
  PrimaryActionButton,
  DestructiveActionButton,
} from "@/components/app-button";
import { ToolShell } from "@/components/tool-shell";
import { FileDropzone } from "@/components/file-dropzone";
import { FileList } from "@/components/file-list";
import { ProcessingBadge } from "@/components/processing-badge";
import { HybridProcessingFeedback } from "@/components/hybrid-processing-feedback";
import { ToolResultFooter } from "@/components/tool-result-footer";
import {
  OUTPUT_FILENAMES,
  LOCAL_SIZE_WARN_BYTES,
  TOOL_ROUTES,
  UPLOAD_WARN_BYTES,
} from "@/lib/constants";
import { createStagedFileId, formatBytes } from "@/lib/file-utils";
import { triggerBlobDownload } from "@/lib/download-client";
import {
  getFallbackVariant,
  getProcessingErrorMessage,
  type ProcessingFallbackVariant,
} from "@/lib/processing/errors";
import { processImageToPdf } from "@/lib/processing/orchestrator";
import { useRoutingBadge } from "@/lib/processing/use-routing-badge";
import type { ProcessingInfo, ProcessingMode } from "@/lib/processing/types";
import type { StagedFileItem } from "@/types";

const IMAGE_ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

export function ImageToPdfClient() {
  const [items, setItems] = useState<StagedFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [processingInfo, setProcessingInfo] = useState<ProcessingInfo | null>(
    null
  );
  const [fallback, setFallback] = useState<ProcessingFallbackVariant | null>(
    null
  );

  const files = useMemo(() => items.map((item) => item.file), [items]);
  const totalSize = items.reduce((s, i) => s + i.file.size, 0);
  const showWarn = totalSize > UPLOAD_WARN_BYTES;
  const badgeInfo = useRoutingBadge("image-to-pdf", files, processingInfo);

  const handleDrop = useCallback((files: File[]) => {
    setResult(null);
    setProcessingInfo(null);
    setFallback(null);
    setItems((prev) => [
      ...prev,
      ...files.map((f) => ({ id: createStagedFileId("img"), file: f })),
    ]);
  }, []);

  async function handleConvert(forceMode?: ProcessingMode) {
    if (items.length === 0) return;

    setLoading(true);
    setResult(null);
    setProcessingInfo(null);
    setFallback(null);

    try {
      const output = await processImageToPdf(
        files,
        undefined,
        forceMode ? { forceMode } : undefined
      );
      setProcessingInfo({ mode: output.mode, reason: output.reason });
      setResult(output.blob);
      toast.success("Done. Downloading…");
      triggerBlobDownload(output.blob, OUTPUT_FILENAMES.imageToPdf, 300);
    } catch (err) {
      console.error("processImageToPdf failed:", err);
      const variant = getFallbackVariant(err);
      if (variant) {
        setFallback(variant);
      } else {
        toast.error(getProcessingErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setItems([]);
    setResult(null);
    setProcessingInfo(null);
    setFallback(null);
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
        maxSize={LOCAL_SIZE_WARN_BYTES}
        compact={items.length > 0}
        label="Drop images here, or click to browse."
        hint="Accepts JPEG, PNG · large jobs run on your device"
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

          <HybridProcessingFeedback
            operation="image-to-pdf"
            files={files}
            showWarn={showWarn}
            processingInfo={badgeInfo}
            fallback={fallback}
            active={loading}
            onRetryServer={() => handleConvert("server")}
            onRetryLocal={() => handleConvert("local")}
            progressKey={String(loading)}
          />
          <FileList items={items} onReorder={setItems} />

          <div className="mobile-sticky-cta">
            <PrimaryActionButton
              onClick={() => handleConvert()}
              disabled={loading || items.length === 0}
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
          {processingInfo && (
            <ProcessingBadge
              mode={processingInfo.mode}
              reason={processingInfo.reason}
            />
          )}
          <p className="text-sm text-muted-foreground">
            Your PDF is ready:{" "}
            <span className="font-mono tabular-nums text-foreground">
              {formatBytes(result.size)}
            </span>
          </p>
          <ToolResultFooter
            blob={result}
            downloadFilename={OUTPUT_FILENAMES.imageToPdf}
            secondaryLabel="Convert more images"
            onSecondary={handleReset}
            emailInputId="image-to-pdf-email"
            toolLabel="converted PDF"
          />
        </div>
      )}
    </ToolShell>
  );
}
