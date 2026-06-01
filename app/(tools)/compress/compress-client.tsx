"use client";

import { useState, useCallback, useMemo } from "react";
import { Minimize2, Loader2, CheckCircle2, X, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  PrimaryActionButton,
  SecondaryActionButton,
  IconTouchButton,
} from "@/components/app-button";
import { Badge } from "@/components/ui/badge";
import { ToolShell } from "@/components/tool-shell";
import { FileDropzone } from "@/components/file-dropzone";
import { DownloadButton } from "@/components/download-button";
import { ActionButtonGroup } from "@/components/action-button-group";
import { QualitySlider } from "@/components/quality-slider";
import { ProcessingProgress } from "@/components/processing-progress";
import { ProcessingBadge } from "@/components/processing-badge";
import { ProcessingFallback } from "@/components/processing-fallback";
import { UploadSizeNotice } from "@/components/upload-size-notice";
import { EmailDeliveryForm } from "@/components/email-delivery-form";
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
import { buildRoutingContext, decide } from "@/lib/processing/router";
import { getDeviceHints } from "@/lib/processing/device-context";
import type { ProcessingMode } from "@/lib/processing/types";

type CompressionResult = {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  filename: string;
  savingsPercent: number;
};

type ProcessingInfo = {
  mode: ProcessingMode;
  reason: string;
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

  const routingDecision = useMemo(() => {
    if (!file) return null;
    return decide(buildRoutingContext("compress", [file], getDeviceHints()));
  }, [file]);

  const badgeInfo = processingInfo ?? routingDecision;

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

  return (
    <ToolShell
      icon={Minimize2}
      title="Compress PDF"
      description="Upload a PDF, choose a quality preset, and download the compressed version."
    >
      {!file ? (
        <FileDropzone
          onDrop={handleDrop}
          accept={{ "application/pdf": [".pdf"] }}
          multiple={false}
          maxSize={LOCAL_SIZE_WARN_BYTES}
          label="Drop a PDF here, or click to browse."
          hint="Accepts PDF · large jobs run on your device"
          disabled={loading}
        />
      ) : (
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 shrink-0">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground font-mono tabular-nums">
              {formatBytes(file.size)}
            </p>
          </div>
          <IconTouchButton
            type="button"
            onClick={handleClear}
            aria-label="Remove file"
          >
            <X className="w-5 h-5" />
          </IconTouchButton>
        </div>
      )}

      {file && !result && (
        <>
          <UploadSizeNotice
            operation="compress"
            files={files}
            showWarn={showWarn}
          />
          <QualitySlider value={quality} onChange={setQuality} />

          {(loading || processingInfo) && badgeInfo && (
            <ProcessingBadge mode={badgeInfo.mode} reason={badgeInfo.reason} />
          )}

          {fallback && (
            <ProcessingFallback
              variant={fallback}
              onAction={
                fallback === "try-server"
                  ? () => handleCompress("server")
                  : fallback === "try-local"
                    ? () => handleCompress("local")
                    : undefined
              }
            />
          )}

          <ProcessingProgress key={String(loading)} active={loading} />
          <div className="mobile-sticky-cta">
            <PrimaryActionButton
              onClick={() => handleCompress()}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Processing…" : "Compress PDF"}
            </PrimaryActionButton>
          </div>
        </>
      )}

      {result && (
        <div className="space-y-4">
          {processingInfo && (
            <ProcessingBadge
              mode={processingInfo.mode}
              reason={processingInfo.reason}
            />
          )}

          <div className="flex items-center gap-2 text-sm font-medium text-success">
            <CheckCircle2 className="w-4 h-4" />
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
              <p className="text-xs text-muted-foreground mb-1">Original</p>
              <p className="text-sm font-semibold font-mono tabular-nums">
                {formatBytes(result.originalSize)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-3">
              <p className="text-xs text-muted-foreground mb-1">Compressed</p>
              <p className="text-sm font-semibold font-mono tabular-nums">
                {formatBytes(result.compressedSize)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-success/10 px-3 py-3">
              <p className="text-xs text-muted-foreground mb-1">Saved</p>
              <Badge
                variant="secondary"
                className="bg-success/10 text-success border-0"
              >
                –{savings}% smaller
              </Badge>
            </div>
          </div>

          <ProcessingProgress active={false} success={done} />

          <ActionButtonGroup>
            <DownloadButton
              blob={result.blob}
              filename={result.filename}
              label="Download"
            />
            <SecondaryActionButton type="button" onClick={handleClear}>
              Compress another
            </SecondaryActionButton>
          </ActionButtonGroup>

          <div className="rounded-xl border border-border bg-card p-4">
            <EmailDeliveryForm
              inputId="compress-email"
              blob={result.blob}
              filename={result.filename}
              toolLabel="compressed PDF"
            />
          </div>
        </div>
      )}
    </ToolShell>
  );
}
