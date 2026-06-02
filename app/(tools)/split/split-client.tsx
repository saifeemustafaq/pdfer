"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Scissors, Loader2, X, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  PrimaryActionButton,
  IconTouchButton,
} from "@/components/app-button";
import { ToolShell } from "@/components/tool-shell";
import { ToolLanding, ToolWorkspace } from "@/components/tool-landing";
import { FileDropzone } from "@/components/file-dropzone";
import { ProcessingBadge } from "@/components/processing-badge";
import { ToolResultFooter } from "@/components/tool-result-footer";
import { EncryptedPdfNotice } from "@/components/encrypted-pdf-notice";
import {
  SplitOptionsPanel,
  type SplitMode,
} from "@/components/split-options-panel";
import type { PageGridSummary } from "@/components/page-grid";
import type { PageEditSpec } from "@/lib/pdf-client";
import {
  extractPageRange,
  extractPages,
  splitEveryN,
  packPdfBlobsToZip,
  nameSplitParts,
  pageNumbersToRange,
} from "@/lib/pdf-split";
import { preflightPdf } from "@/lib/processing/preflight";
import { triggerBlobDownload } from "@/lib/download-client";
import { LOCAL_SIZE_WARN_BYTES, OUTPUT_FILENAMES } from "@/lib/constants";
import { formatBytes } from "@/lib/file-utils";
import type { ProcessingInfo } from "@/lib/processing/types";

const PageGrid = dynamic(
  () => import("@/components/page-grid").then((m) => m.PageGrid),
  { ssr: false }
);

const LOCAL_PROCESSING: ProcessingInfo = {
  mode: "local",
  reason: "Split runs on your device",
};

export function SplitClient() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [encrypted, setEncrypted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState<SplitMode>("range");
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(1);
  const [pagesPerFile, setPagesPerFile] = useState(1);
  const [pageEditSpec, setPageEditSpec] = useState<PageEditSpec | null>(null);
  const [pageSummary, setPageSummary] = useState<PageGridSummary | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFilename, setResultFilename] = useState<string>(
    OUTPUT_FILENAMES.split
  );

  const handleDrop = useCallback(async (files: File[]) => {
    const pdf = files[0];
    if (!pdf) return;

    setFile(pdf);
    setPdfBlob(null);
    setPreflightError(null);
    setEncrypted(false);
    setPageEditSpec(null);
    setPageSummary(null);
    setResultBlob(null);
    setChecking(true);

    try {
      const preflight = await preflightPdf(pdf);
      if (preflight.encrypted) {
        setEncrypted(true);
        setPreflightError("encrypted");
        return;
      }
      if (!preflight.pageCount) {
        setPreflightError("Could not read this PDF. Try re-saving it and upload again.");
        return;
      }

      setPageCount(preflight.pageCount);
      setRangeStart(1);
      setRangeEnd(preflight.pageCount);
      setPagesPerFile(1);
      setPdfBlob(pdf);
    } catch (err) {
      console.error("split preflight failed:", err);
      setPreflightError("Could not read this PDF. Try re-saving it and upload again.");
    } finally {
      setChecking(false);
    }
  }, []);

  function handleClear() {
    setFile(null);
    setPdfBlob(null);
    setPageCount(0);
    setPreflightError(null);
    setEncrypted(false);
    setPageEditSpec(null);
    setPageSummary(null);
    setResultBlob(null);
    setResultFilename(OUTPUT_FILENAMES.split);
  }

  async function buildResultBlob(): Promise<Blob | null> {
    if (!pdfBlob) return null;

    if (mode === "range") {
      const range = pageNumbersToRange(rangeStart, rangeEnd, pageCount);
      return extractPageRange(pdfBlob, range);
    }

    if (mode === "every-n") {
      const parts = await splitEveryN(pdfBlob, pagesPerFile);
      const names = nameSplitParts(parts.length);
      return packPdfBlobsToZip(
        parts.map((blob, index) => ({ name: names[index], blob }))
      );
    }

    if (!pageEditSpec || pageEditSpec.pageIndicesInOrder.length === 0) {
      toast.error("Select at least one page to extract.");
      return null;
    }

    return extractPages(pdfBlob, pageEditSpec.pageIndicesInOrder);
  }

  async function handleSplit() {
    setProcessing(true);
    try {
      const blob = await buildResultBlob();
      if (!blob) return;

      const filename =
        mode === "every-n" ? OUTPUT_FILENAMES.splitZip : OUTPUT_FILENAMES.split;

      setResultBlob(blob);
      setResultFilename(filename);
      toast.success("Done. Downloading…");
      triggerBlobDownload(blob, filename, 300);
    } catch (err) {
      console.error("split failed:", err);
      const message =
        err instanceof Error ? err.message : "Processing failed. Please try again.";
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  }

  const busy = checking || processing;
  const canSplit =
    !busy &&
    !!pdfBlob &&
    (mode === "extract"
      ? !!pageEditSpec && pageEditSpec.pageIndicesInOrder.length > 0
      : true);

  const splitLabel =
    mode === "every-n"
      ? "Download ZIP"
      : mode === "extract"
        ? "Extract pages"
        : "Download range";

  const sidebarOptions =
    pdfBlob && !preflightError ? (
      <SplitOptionsPanel
        mode={mode}
        onModeChange={setMode}
        pageCount={pageCount}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onRangeStartChange={setRangeStart}
        onRangeEndChange={setRangeEnd}
        pagesPerFile={pagesPerFile}
        onPagesPerFileChange={setPagesPerFile}
      />
    ) : null;

  const rightSidebar =
    pdfBlob && !preflightError ? (
      <div className="flex flex-col gap-4">
        <div className="hidden lg:block">{sidebarOptions}</div>
        <PrimaryActionButton
          onClick={handleSplit}
          disabled={!canSplit}
          className="w-full"
        >
          {processing && <Loader2 className="w-4 h-4 animate-spin" />}
          {processing ? "Processing…" : splitLabel}
        </PrimaryActionButton>

        {resultBlob && (
          <ToolResultFooter
            blob={resultBlob}
            getBlob={buildResultBlob}
            downloadFilename={resultFilename}
            secondaryLabel="Split another PDF"
            onSecondary={handleClear}
            emailInputId="split-email"
            toolLabel="Split PDF"
          />
        )}
      </div>
    ) : undefined;

  return (
    <ToolShell
      icon={Scissors}
      title="Split PDF"
      description="Extract a page range, split every N pages, or pick pages. Runs on your device."
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
            hint="Accepts PDF · split runs locally"
            disabled={checking}
          />
        </ToolLanding>
      ) : (
        <ToolWorkspace wide>
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
                disabled={busy}
              >
                <X className="size-5" />
              </IconTouchButton>
            </div>

            {checking && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Checking PDF…
              </p>
            )}

            {encrypted && (
              <EncryptedPdfNotice className="text-sm text-destructive" />
            )}

            {preflightError && !encrypted && (
              <p className="text-sm text-destructive">{preflightError}</p>
            )}

            {pdfBlob && !preflightError && (
              <>
                <ProcessingBadge
                  mode={LOCAL_PROCESSING.mode}
                  reason={LOCAL_PROCESSING.reason}
                />

                <div className="lg:hidden">{sidebarOptions}</div>

                {mode === "extract" ? (
                  <>
                    {pageSummary && pageSummary.total > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {pageSummary.kept} of {pageSummary.total} page
                        {pageSummary.total !== 1 ? "s" : ""} selected
                      </p>
                    )}
                    <PageGrid
                      pdfBlob={pdfBlob}
                      externalActions
                      selectionOnly
                      onSummaryChange={setPageSummary}
                      onEditSpecChange={setPageEditSpec}
                      loading={processing}
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Configure the split method above, then download below.
                  </p>
                )}
              </>
            )}
          </div>
        </ToolWorkspace>
      )}
    </ToolShell>
  );
}
