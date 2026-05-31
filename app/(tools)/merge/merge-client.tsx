"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Combine, Loader2, ChevronRight } from "lucide-react";
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
import { reorderPdfPages } from "@/lib/pdf-client";
import { triggerBlobDownload } from "@/lib/download-client";
import {
  API_ROUTES,
  MAX_UPLOAD_BYTES,
  OUTPUT_FILENAMES,
  UPLOAD_WARN_BYTES,
} from "@/lib/constants";
import { formatBytes } from "@/lib/file-utils";
import type { StagedFileItem } from "@/types";

const PageGrid = dynamic(
  () => import("@/components/page-grid").then((m) => m.PageGrid),
  { ssr: false }
);

const MERGE_ACCEPT = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

let idCounter = 0;
function newId() {
  return `file-${++idCounter}-${Math.random().toString(36).slice(2)}`;
}

type Step = "upload" | "edit-pages" | "done";

export function MergeClient() {
  const [items, setItems] = useState<StagedFileItem[]>([]);
  const [merging, setMerging] = useState(false);
  const [applying, setApplying] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [finalBlob, setFinalBlob] = useState<Blob | null>(null);

  const totalSize = items.reduce((s, i) => s + i.file.size, 0);
  const overLimit = totalSize > MAX_UPLOAD_BYTES;
  const showWarn = totalSize > UPLOAD_WARN_BYTES;

  const handleDrop = useCallback((files: File[]) => {
    setItems((prev) => [
      ...prev,
      ...files.map((f) => ({ id: newId(), file: f })),
    ]);
    if (files.some((f) => f.type.startsWith("image/"))) {
      toast.info("Images will be compressed to JPEG for embedding");
    }
  }, []);

  async function handleMerge() {
    if (items.length < 2) return;
    if (overLimit) {
      toast.error("File too large: 6 MB limit");
      return;
    }

    setMerging(true);
    try {
      const form = new FormData();
      items.forEach((item) => form.append("files", item.file));

      const res = await fetch(API_ROUTES.merge, { method: "POST", body: form });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Request failed" }));
        toast.error(body.error ?? "Processing failed. Please try again.");
        return;
      }

      const blob = await res.blob();
      setMergedBlob(blob);
      setStep("edit-pages");
      toast.success("Done. Review pages below.");
    } catch (err) {
      console.error("POST /api/merge failed:", err);
      toast.error("Processing failed. Please try again.");
    } finally {
      setMerging(false);
    }
  }

  async function handlePageConfirm(orderedKeptIndices: number[]) {
    if (!mergedBlob) return;
    setApplying(true);
    try {
      const result = await reorderPdfPages(mergedBlob, orderedKeptIndices);
      setFinalBlob(result);
      setStep("done");
      toast.success("Done. Downloading…");
      triggerBlobDownload(result, OUTPUT_FILENAMES.merge, 300);
    } catch (err) {
      console.error("reorderPdfPages failed:", err);
      toast.error("Processing failed. Please try again.");
    } finally {
      setApplying(false);
    }
  }

  function handleReset() {
    setItems([]);
    setMergedBlob(null);
    setFinalBlob(null);
    setStep("upload");
  }

  return (
    <ToolShell
      icon={Combine}
      title="Merge PDFs"
      description="Drop PDFs and images, merge them, then remove any pages you don't want."
      wide
    >
      {step !== "upload" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground -mt-2">
          <span>1. Add files</span>
          <ChevronRight className="w-3 h-3" />
          <span
            className={
              step === "edit-pages" ? "text-primary font-medium" : undefined
            }
          >
            2. Reorder & remove
          </span>
          <ChevronRight className="w-3 h-3" />
          <span
            className={step === "done" ? "text-primary font-medium" : undefined}
          >
            3. Download
          </span>
        </div>
      )}

      {step === "upload" && (
        <>
          <FileDropzone
            onDrop={handleDrop}
            accept={MERGE_ACCEPT}
            multiple
            compact={items.length > 0}
            label="Drop PDFs and images here, or click to browse."
            hint="Accepts PDF, JPEG, PNG · max 6 MB total"
            disabled={merging}
          />

          {items.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {items.length} file{items.length !== 1 ? "s" : ""}
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

              <ProcessingProgress key={String(merging)} active={merging} />

              <div className="sticky bottom-16 md:static md:bottom-auto pt-2">
                <PrimaryActionButton
                  onClick={handleMerge}
                  disabled={merging || items.length < 2 || overLimit}
                  className="w-full"
                >
                  {merging && <Loader2 className="w-4 h-4 animate-spin" />}
                  {merging ? "Processing…" : "Merge files"}
                </PrimaryActionButton>
              </div>
            </div>
          )}
        </>
      )}

      {step === "edit-pages" && mergedBlob && (
        <>
          <PageGrid
            pdfBlob={mergedBlob}
            onConfirm={handlePageConfirm}
            loading={applying}
          />
          <SecondaryActionButton type="button" onClick={handleReset}>
            Start over
          </SecondaryActionButton>
        </>
      )}

      {step === "done" && finalBlob && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your PDF is ready:{" "}
            <span className="font-mono tabular-nums text-foreground">
              {formatBytes(finalBlob.size)}
            </span>
          </p>
          <ActionButtonGroup>
            <DownloadButton
              blob={finalBlob}
              filename={OUTPUT_FILENAMES.merge}
              label="Download"
            />
            <SecondaryActionButton
              type="button"
              onClick={() => {
                setFinalBlob(null);
                setStep("edit-pages");
              }}
            >
              Back to page editor
            </SecondaryActionButton>
          </ActionButtonGroup>
        </div>
      )}
    </ToolShell>
  );
}
