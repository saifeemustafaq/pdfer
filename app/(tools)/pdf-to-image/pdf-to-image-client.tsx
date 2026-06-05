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
import { ToolLanding, ToolWorkspace } from "@/components/tool-landing";
import { FileDropzone } from "@/components/file-dropzone";
import { ImageFormatPicker } from "@/components/image-format-picker";
import { ProcessingProgress } from "@/components/processing-progress";
import { ToolResultFooter } from "@/components/tool-result-footer";
import { MobileDownloadFab } from "@/components/mobile-download-fab";
import { MobileOutputDrawer } from "@/components/mobile-output-drawer";
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
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const rightSidebar = file ? (
    <div className="flex flex-col gap-4">
      <div className="hidden lg:block">
        {!result && (
          <ImageFormatPicker value={format} onChange={setFormat} />
        )}
      </div>
      {!result && (
        <PrimaryActionButton
          onClick={handleConvert}
          disabled={loading}
          className="w-full"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Processing…" : "Export to ZIP"}
        </PrimaryActionButton>
      )}

      {result && (
        <ToolResultFooter
          blob={result}
          downloadFilename={OUTPUT_FILENAMES.pdfToImageZip}
          downloadLabel="Download ZIP"
          secondaryLabel="Convert another PDF"
          onSecondary={handleClear}
          emailInputId="pdf-to-image-email"
          toolLabel="PDF export ZIP"
        />
      )}
    </div>
  ) : undefined;

  return (
    <>
    <ToolShell
      icon={FileImage}
      title="PDF to image"
      description="Export each page as an image. Processing runs in your browser; the PDF is not uploaded."
      rightSidebar={rightSidebar}
    >
      {!file ? (
        <ToolLanding>
          <Link
            href={TOOL_ROUTES.convert}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground md:hidden"
          >
            <ChevronLeft className="size-3" />
            Convert options
          </Link>
          <FileDropzone
            onDrop={handleDrop}
            accept={{ "application/pdf": [".pdf"] }}
            multiple={false}
            maxSize={LOCAL_SIZE_WARN_BYTES}
            label="Drop a PDF here, or click to browse."
            hint="Accepts PDF · large jobs run on your device · email up to 6 MB"
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
                disabled={loading}
              >
                <X className="size-5" />
              </IconTouchButton>
            </div>

            {!result && (
              <>
                {progress.total > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Rendering page {progress.current} of {progress.total}…
                  </p>
                )}
                <ProcessingProgress key={String(loading)} active={loading} />
                <ImageFormatPicker value={format} onChange={setFormat} />
              </>
            )}

            {result && (
              <>
                <p className="text-sm text-muted-foreground">
                  {pageCount} page{pageCount !== 1 ? "s" : ""} exported as{" "}
                  {format.toUpperCase()} ·{" "}
                  <span className="font-mono tabular-nums text-foreground">
                    {formatBytes(result.size)}
                  </span>
                </p>
              </>
            )}
          </div>
        </ToolWorkspace>
      )}
    </ToolShell>

    <MobileDownloadFab blob={result} onClick={() => setDrawerOpen(true)} />
    <MobileOutputDrawer
      open={drawerOpen}
      onOpenChange={setDrawerOpen}
      blob={result}
      filename={OUTPUT_FILENAMES.pdfToImageZip}
      toolLabel="PDF export ZIP"
    />
    </>
  );
}
