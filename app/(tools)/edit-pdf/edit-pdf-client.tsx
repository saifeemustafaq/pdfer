"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { LayoutGrid, Loader2, X, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  PrimaryActionButton,
  IconTouchButton,
} from "@/components/app-button";
import { ToolShell } from "@/components/tool-shell";
import { FileDropzone } from "@/components/file-dropzone";
import { ProcessingBadge } from "@/components/processing-badge";
import { ToolResultFooter } from "@/components/tool-result-footer";
import type { PageGridSummary } from "@/components/page-grid";
import { exportEditedPdf, type PageEditSpec } from "@/lib/pdf-client";
import { preflightPdf } from "@/lib/processing/preflight";
import { triggerBlobDownload } from "@/lib/download-client";
import {
  LOCAL_SIZE_WARN_BYTES,
  OUTPUT_FILENAMES,
} from "@/lib/constants";
import { formatBytes } from "@/lib/file-utils";
import type { ProcessingInfo } from "@/lib/processing/types";

const PageGrid = dynamic(
  () => import("@/components/page-grid").then((m) => m.PageGrid),
  { ssr: false }
);

const LOCAL_PROCESSING: ProcessingInfo = {
  mode: "local",
  reason: "Page editing runs on your device",
};

export function EditPdfClient() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pageEditSpec, setPageEditSpec] = useState<PageEditSpec | null>(null);
  const [pageSummary, setPageSummary] = useState<PageGridSummary | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const handleDrop = useCallback(async (files: File[]) => {
    const pdf = files[0];
    if (!pdf) return;

    setFile(pdf);
    setPdfBlob(null);
    setPreflightError(null);
    setPageEditSpec(null);
    setPageSummary(null);
    setResultBlob(null);
    setChecking(true);

    try {
      const preflight = await preflightPdf(pdf);
      if (preflight.encrypted) {
        setPreflightError(
          "This PDF is password protected. Unlock it in another app, then try again."
        );
        return;
      }

      setPdfBlob(pdf);
    } catch (err) {
      console.error("edit-pdf preflight failed:", err);
      setPreflightError("Could not read this PDF. Try re-saving it and upload again.");
    } finally {
      setChecking(false);
    }
  }, []);

  function handleClear() {
    setFile(null);
    setPdfBlob(null);
    setPreflightError(null);
    setPageEditSpec(null);
    setPageSummary(null);
    setResultBlob(null);
  }

  const handleEditSpecChange = useCallback((spec: PageEditSpec) => {
    setPageEditSpec(spec);
    setResultBlob(null);
  }, []);

  async function buildEditedBlob(): Promise<Blob | null> {
    if (!pdfBlob || !pageEditSpec || pageEditSpec.pageIndicesInOrder.length === 0) {
      toast.error("Keep at least one page.");
      return null;
    }
    return exportEditedPdf(pdfBlob, pageEditSpec);
  }

  async function handleDownload() {
    setExporting(true);
    try {
      const blob = await buildEditedBlob();
      if (!blob) return;
      setResultBlob(blob);
      toast.success("Done. Downloading…");
      triggerBlobDownload(blob, OUTPUT_FILENAMES.editPdf, 300);
    } catch (err) {
      console.error("edit-pdf download failed:", err);
      toast.error("Processing failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const busy = checking || exporting;

  return (
    <ToolShell
      wide
      icon={LayoutGrid}
      title="Edit PDF"
      description="Reorder, remove, or rotate pages. Your file stays on this device."
    >
      {!file ? (
        <FileDropzone
          onDrop={handleDrop}
          accept={{ "application/pdf": [".pdf"] }}
          multiple={false}
          maxSize={LOCAL_SIZE_WARN_BYTES}
          label="Drop a PDF here, or click to browse."
          hint="Accepts PDF · password-protected files are not supported"
          disabled={checking}
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
            disabled={busy}
          >
            <X className="w-5 h-5" />
          </IconTouchButton>
        </div>
      )}

      {checking && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking PDF…
        </p>
      )}

      {preflightError && (
        <p className="text-sm text-destructive">{preflightError}</p>
      )}

      {pdfBlob && !preflightError && (
        <div className="space-y-4">
          <ProcessingBadge
            mode={LOCAL_PROCESSING.mode}
            reason={LOCAL_PROCESSING.reason}
          />

          {pageSummary && pageSummary.total > 0 && (
            <p className="text-xs text-muted-foreground">
              {pageSummary.kept} of {pageSummary.total} page
              {pageSummary.total !== 1 ? "s" : ""} kept
            </p>
          )}

          <PageGrid
            pdfBlob={pdfBlob}
            externalActions
            onSummaryChange={setPageSummary}
            onEditSpecChange={handleEditSpecChange}
            loading={exporting}
          />

          <div className="mobile-sticky-cta space-y-4">
            <PrimaryActionButton
              onClick={handleDownload}
              disabled={
                busy ||
                !pageEditSpec ||
                pageEditSpec.pageIndicesInOrder.length === 0
              }
              className="w-full"
            >
              {exporting && <Loader2 className="w-4 h-4 animate-spin" />}
              {exporting ? "Processing…" : "Download edited PDF"}
            </PrimaryActionButton>

            {resultBlob && (
              <ToolResultFooter
                blob={resultBlob}
                getBlob={buildEditedBlob}
                downloadFilename={OUTPUT_FILENAMES.editPdf}
                secondaryLabel="Edit another PDF"
                onSecondary={handleClear}
                emailInputId="edit-pdf-email"
                toolLabel="Edit PDF"
              />
            )}
          </div>
        </div>
      )}
    </ToolShell>
  );
}
