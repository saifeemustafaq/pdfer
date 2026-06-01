"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { FileImage, Loader2, X, FileText, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import {
  PrimaryActionButton,
  IconTouchButton,
} from "@/components/app-button";
import { ToolShell } from "@/components/tool-shell";
import { FileDropzone } from "@/components/file-dropzone";
import { ImageFormatPicker } from "@/components/image-format-picker";
import { ProcessingProgress } from "@/components/processing-progress";
import { ToolResultFooter } from "@/components/tool-result-footer";
import {
  LOCAL_SIZE_WARN_BYTES,
  OUTPUT_FILENAMES,
  TOOL_ROUTES,
  type PdfImageFormat,
} from "@/lib/constants";
import { formatBytes } from "@/lib/file-utils";
import { triggerBlobDownload } from "@/lib/download-client";

export function PdfToImageClient() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<PdfImageFormat>("jpeg");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<Blob | null>(null);
  const [pageCount, setPageCount] = useState(0);

  const handleDrop = useCallback((files: File[]) => {
    const pdf = files[0];
    if (!pdf) return;
    setFile(pdf);
    setResult(null);
    setPageCount(0);
  }, []);

  function handleClear() {
    setFile(null);
    setResult(null);
    setPageCount(0);
  }

  async function handleConvert() {
    if (!file) return;

    setLoading(true);
    setResult(null);
    setProgress({ current: 0, total: 0 });

    try {
      const { exportPdfToImageZip } = await import("@/lib/pdf-export");
      const zip = await exportPdfToImageZip(file, format, {
        onProgress: (current, total) => {
          setProgress({ current, total });
          setPageCount(total);
        },
      });

      setResult(zip);
      toast.success("Done. Downloading…");
      triggerBlobDownload(zip, OUTPUT_FILENAMES.pdfToImageZip, 300);
    } catch (err) {
      console.error("exportPdfToImageZip failed:", err);
      toast.error("Processing failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolShell
      icon={FileImage}
      title="PDF to image"
      description="Export each page as an image. Processing runs in your browser; the PDF is not uploaded."
    >
      <Link
        href={TOOL_ROUTES.convert}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground -mt-4 md:hidden"
      >
        <ChevronLeft className="w-3 h-3" />
        Convert options
      </Link>
      {!file ? (
        <FileDropzone
          onDrop={handleDrop}
          accept={{ "application/pdf": [".pdf"] }}
          multiple={false}
          maxSize={LOCAL_SIZE_WARN_BYTES}
          label="Drop a PDF here, or click to browse."
          hint="Accepts PDF · large jobs run on your device · email up to 6 MB"
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
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </IconTouchButton>
        </div>
      )}

      {file && !result && (
        <>
          <ImageFormatPicker value={format} onChange={setFormat} />
          {progress.total > 0 && (
            <p className="text-sm text-muted-foreground">
              Rendering page {progress.current} of {progress.total}…
            </p>
          )}
          <ProcessingProgress key={String(loading)} active={loading} />
          <div className="mobile-sticky-cta">
            <PrimaryActionButton
              onClick={handleConvert}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Processing…" : "Export to ZIP"}
            </PrimaryActionButton>
          </div>
        </>
      )}

      {result && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {pageCount} page{pageCount !== 1 ? "s" : ""} exported as{" "}
            {format.toUpperCase()} ·{" "}
            <span className="font-mono tabular-nums text-foreground">
              {formatBytes(result.size)}
            </span>
          </p>
          <ToolResultFooter
            blob={result}
            downloadFilename={OUTPUT_FILENAMES.pdfToImageZip}
            downloadLabel="Download ZIP"
            secondaryLabel="Convert another PDF"
            onSecondary={handleClear}
            emailInputId="pdf-to-image-email"
            toolLabel="PDF export ZIP"
          />
        </div>
      )}
    </ToolShell>
  );
}
