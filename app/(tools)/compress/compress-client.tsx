"use client";

import { useState, useCallback, useMemo } from "react";
import { Minimize2, Loader2, CheckCircle2, X, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  PrimaryActionButton,
  IconTouchButton,
} from "@/components/app-button";
import { Badge } from "@/components/ui/badge";
import { ToolShell } from "@/components/tool-shell";
import { ToolLanding, ToolWorkspace } from "@/components/tool-landing";
import { FileDropzone } from "@/components/file-dropzone";
import { QualitySlider } from "@/components/quality-slider";
import { ProcessingProgress } from "@/components/processing-progress";
import { ProcessingBadge } from "@/components/processing-badge";
import { HybridProcessingFeedback } from "@/components/hybrid-processing-feedback";
import { ToolResultFooter } from "@/components/tool-result-footer";
import {
  LOCAL_SIZE_WARN_BYTES,
  MIN_MEANINGFUL_SAVINGS_PERCENT,
  type QualityPreset,
  UPLOAD_WARN_BYTES,
} from "@/lib/constants";
import { formatBytes, buildCompressedFilename } from "@/lib/file-utils";
import { triggerBlobDownload } from "@/lib/download-client";
import {
  getFallbackVariant,
  getProcessingErrorMessage,
  type ProcessingFallbackVariant,
} from "@/lib/processing/errors";
import { processCompress } from "@/lib/processing/orchestrator";
import { useRoutingBadge } from "@/lib/processing/use-routing-badge";
import type { ProcessingInfo, ProcessingMode } from "@/lib/processing/types";

type CompressionResult = {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  filename: string;
  savingsPercent: number;
};

export function CompressClient() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<QualityPreset>("medium");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [processingInfo, setProcessingInfo] = useState<ProcessingInfo | null>(
    null
  );
  const [fallback, setFallback] = useState<ProcessingFallbackVariant | null>(
    null
  );

  const files = useMemo(() => (file ? [file] : []), [file]);
  const showWarn = file ? file.size > UPLOAD_WARN_BYTES : false;
  const badgeInfo = useRoutingBadge("compress", files, processingInfo);

  const handleDrop = useCallback((files: File[]) => {
    setFile(files[0] ?? null);
    setResult(null);
    setDone(false);
    setProcessingInfo(null);
    setFallback(null);
  }, []);

  function handleClear() {
    setFile(null);
    setResult(null);
    setDone(false);
    setProcessingInfo(null);
    setFallback(null);
  }

  async function handleCompress(forceMode?: ProcessingMode) {
    if (!file) return;

    setLoading(true);
    setResult(null);
    setDone(false);
    setProcessingInfo(null);
    setFallback(null);

    try {
      const output = await processCompress(
        file,
        quality,
        undefined,
        forceMode ? { forceMode } : undefined
      );

      const filename = buildCompressedFilename(file.name);

      setProcessingInfo({ mode: output.mode, reason: output.reason });
      setResult({
        blob: output.blob,
        originalSize: output.originalSize,
        compressedSize: output.compressedSize,
        filename,
        savingsPercent: output.savingsPercent,
      });
      setDone(true);
      toast.success("Done. Downloading…");
      triggerBlobDownload(output.blob, filename, 300);
    } catch (err) {
      console.error("processCompress failed:", err);
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

  const savings = Math.max(0, result?.savingsPercent ?? 0);
  const minimalSavings =
    result !== null && savings < MIN_MEANINGFUL_SAVINGS_PERCENT;

  const rightSidebar = file ? (
    <div className="flex flex-col gap-4">
      {!result && (
        <>
          <QualitySlider value={quality} onChange={setQuality} />
          <PrimaryActionButton
            onClick={() => handleCompress()}
            disabled={loading}
            className="w-full"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Processing…" : "Compress PDF"}
          </PrimaryActionButton>
        </>
      )}

      {result && (
        <ToolResultFooter
          blob={result.blob}
          downloadFilename={result.filename}
          secondaryLabel="Compress another"
          onSecondary={handleClear}
          emailInputId="compress-email"
          toolLabel="compressed PDF"
        />
      )}
    </div>
  ) : undefined;

  return (
    <ToolShell
      icon={Minimize2}
      title="Compress PDF"
      description="Upload a PDF, choose a quality preset, and download the compressed version."
      rightSidebar={rightSidebar}
    >
      {!file ? (
        <ToolLanding>
          <FileDropzone
            onDrop={handleDrop}
            accept={{ "application/pdf": [".pdf"] }}
            multiple={false}
            maxSize={LOCAL_SIZE_WARN_BYTES}
            label="Drop a PDF here, or click to browse."
            hint="Accepts PDF · large jobs run on your device"
            disabled={loading}
          />
        </ToolLanding>
      ) : (
        <ToolWorkspace>
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <FileText className="size-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  {formatBytes(file.size)}
                </p>
              </div>
              <IconTouchButton
                type="button"
                onClick={handleClear}
                aria-label="Remove file"
              >
                <X className="size-5" />
              </IconTouchButton>
            </div>

            {!result && (
              <>
                <HybridProcessingFeedback
                  operation="compress"
                  files={files}
                  showWarn={showWarn}
                  processingInfo={badgeInfo}
                  fallback={fallback}
                  active={loading}
                  onRetryServer={() => handleCompress("server")}
                  onRetryLocal={() => handleCompress("local")}
                  progressKey={String(loading)}
                />
              </>
            )}

            {result && (
              <>
                {processingInfo && (
                  <ProcessingBadge
                    mode={processingInfo.mode}
                    reason={processingInfo.reason}
                  />
                )}

                <div className="flex items-center gap-2 text-sm font-medium text-success">
                  <CheckCircle2 className="size-4" />
                  Done. Downloading…
                </div>

                {minimalSavings && (
                  <p className="text-xs text-muted-foreground">
                    This PDF is mostly text or already optimized. Savings may be
                    minimal.
                  </p>
                )}

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-3">
                    <p className="mb-1 text-xs text-muted-foreground">Original</p>
                    <p className="font-mono text-sm font-semibold tabular-nums">
                      {formatBytes(result.originalSize)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-3">
                    <p className="mb-1 text-xs text-muted-foreground">Compressed</p>
                    <p className="font-mono text-sm font-semibold tabular-nums">
                      {formatBytes(result.compressedSize)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-success/10 px-3 py-3">
                    <p className="mb-1 text-xs text-muted-foreground">Saved</p>
                    <Badge
                      variant="secondary"
                      className="border-0 bg-success/10 text-success"
                    >
                      –{savings}% smaller
                    </Badge>
                  </div>
                </div>

                <ProcessingProgress active={false} success={done} />
              </>
            )}
          </div>
        </ToolWorkspace>
      )}
    </ToolShell>
  );
}
