"use client";

import { useState, useCallback } from "react";
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
import {
  API_ROUTES,
  type QualityPreset,
} from "@/lib/constants";
import {
  formatBytes,
  buildCompressedFilename,
} from "@/lib/file-utils";
import { triggerBlobDownload } from "@/lib/download-client";

type CompressionResult = {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  filename: string;
};

export function CompressClient() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<QualityPreset>("medium");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<CompressionResult | null>(null);

  const handleDrop = useCallback((files: File[]) => {
    setFile(files[0] ?? null);
    setResult(null);
    setDone(false);
  }, []);

  function handleClear() {
    setFile(null);
    setResult(null);
    setDone(false);
  }

  async function handleCompress() {
    if (!file) return;

    setLoading(true);
    setResult(null);
    setDone(false);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("quality", quality);

      const res = await fetch(API_ROUTES.compress, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Request failed" }));
        toast.error(body.error ?? "Processing failed. Please try again.");
        return;
      }

      const blob = await res.blob();
      const originalSize =
        Number(res.headers.get("X-Original-Size")) || file.size;
      const compressedSize =
        Number(res.headers.get("X-Compressed-Size")) || blob.size;

      const filename = buildCompressedFilename(file.name);

      setResult({ blob, originalSize, compressedSize, filename });
      setDone(true);
      toast.success("Done. Downloading…");

      triggerBlobDownload(blob, filename, 300);
    } catch (err) {
      console.error("POST /api/compress failed:", err);
      toast.error("Processing failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const savings =
    result && result.originalSize > 0
      ? Math.round((1 - result.compressedSize / result.originalSize) * 100)
      : 0;

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
          label="Drop a PDF here, or click to browse."
          hint="Accepts PDF · max 6 MB"
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
          <QualitySlider value={quality} onChange={setQuality} />
          <ProcessingProgress key={String(loading)} active={loading} />
          <div className="sticky bottom-16 md:static md:bottom-auto">
            <PrimaryActionButton
              onClick={handleCompress}
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
          <div className="flex items-center gap-2 text-sm font-medium text-success">
            <CheckCircle2 className="w-4 h-4" />
            Done. Downloading…
          </div>

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
        </div>
      )}
    </ToolShell>
  );
}
