"use client";

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import dynamic from "next/dynamic";
import { Combine, Loader2, Minimize2, Download } from "lucide-react";
import { toast } from "sonner";
import {
  PrimaryActionButton,
  SecondaryActionButton,
  DestructiveActionButton,
} from "@/components/app-button";
import { ToolShell } from "@/components/tool-shell";
import { ToolLanding, ToolWorkspace } from "@/components/tool-landing";
import { FileDropzone } from "@/components/file-dropzone";
import { FileList } from "@/components/file-list";
import { ProcessingProgress } from "@/components/processing-progress";
import { HybridProcessingFeedback } from "@/components/hybrid-processing-feedback";
import {
  ImagePdfLayoutPanel,
  resolveImageLayoutForProcessing,
} from "@/components/image-pdf-layout-panel";
import { EmailDeliveryForm } from "@/components/email-delivery-form";
import { MobileDownloadFab } from "@/components/mobile-download-fab";
import { MobileOutputDrawer } from "@/components/mobile-output-drawer";
import {
  DEFAULT_IMAGE_PDF_LAYOUT,
  MERGE_IMAGE_LAYOUT_DEFAULT,
  type ImagePdfLayoutOptions as ImagePdfLayout,
} from "@/lib/image-pdf-layout";
import type { PageGridSummary } from "@/components/page-grid";
import { exportEditedPdf, type PageEditSpec } from "@/lib/pdf-client";
import { triggerBlobDownload } from "@/lib/download-client";
import {
  OUTPUT_FILENAMES,
  LOCAL_SIZE_WARN_BYTES,
  QUALITY_PRESETS,
  QUALITY_PRESET_KEYS,
  UPLOAD_WARN_BYTES,
  IMAGE_TOOL_ACCEPT,
  type QualityPreset,
} from "@/lib/constants";
import {
  createStagedFileId,
  formatBytes,
  buildCompressedFilename,
} from "@/lib/file-utils";
import {
  getFallbackVariant,
  getProcessingErrorMessage,
  type ProcessingFallbackVariant,
} from "@/lib/processing/errors";
import { processMerge, processCompress } from "@/lib/processing/orchestrator";
import { useRoutingBadge } from "@/lib/processing/use-routing-badge";
import type { ProcessingInfo, ProcessingMode } from "@/lib/processing/types";
import type { StagedFileItem } from "@/types";
import { cn } from "@/lib/utils";
import {
  collectMergeSourceDimensions,
  hasUnevenPageDimensions,
} from "@/lib/merge-dimension-preflight";

const PageGrid = dynamic(
  () => import("@/components/page-grid").then((m) => m.PageGrid),
  { ssr: false }
);

const MERGE_DEBOUNCE_MS = 400;
const DIMENSION_CHECK_MS = 300;

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf";
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

export function MergeClient() {
  const [items, setItems] = useState<StagedFileItem[]>([]);
  const [merging, setMerging] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [processingInfo, setProcessingInfo] = useState<ProcessingInfo | null>(
    null
  );
  const [fallback, setFallback] = useState<ProcessingFallbackVariant | null>(
    null
  );
  const [pageSummary, setPageSummary] = useState<PageGridSummary | null>(null);
  const [pageEditSpec, setPageEditSpec] = useState<PageEditSpec | null>(null);
  const [exportBlob, setExportBlob] = useState<Blob | null>(null);
  const [computingExportSize, setComputingExportSize] = useState(false);
  const [quality, setQuality] = useState<QualityPreset>("medium");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [imageLayoutEnabled, setImageLayoutEnabled] = useState(false);
  const [imageLayout, setImageLayout] = useState<ImagePdfLayout>(
    MERGE_IMAGE_LAYOUT_DEFAULT
  );
  const [dimensionState, setDimensionState] = useState<{
    loading: boolean;
    uneven: boolean;
  }>({ loading: false, uneven: false });

  const effectiveImageLayout = useMemo(
    () => resolveImageLayoutForProcessing(imageLayoutEnabled, imageLayout),
    [imageLayoutEnabled, imageLayout]
  );

  const mergeGenerationRef = useRef(0);
  const handleEditSpecChange = useCallback((spec: PageEditSpec) => {
    setPageEditSpec(spec);
  }, []);
  const pendingForceModeRef = useRef<ProcessingMode | undefined>(undefined);

  const files = useMemo(() => items.map((item) => item.file), [items]);
  const hasImages = useMemo(() => files.some(isImageFile), [files]);
  const showLayoutPanel =
    hasImages &&
    items.length > 0 &&
    (dimensionState.uneven || imageLayoutEnabled);
  const promptUnevenLayout =
    dimensionState.uneven && !imageLayoutEnabled && !dimensionState.loading;
  const totalSize = items.reduce((s, i) => s + i.file.size, 0);
  const showWarn = totalSize > UPLOAD_WARN_BYTES;

  const badgeInfo = useRoutingBadge("merge", files, processingInfo);

  const runAutoMerge = useCallback(
    async (fileItems: StagedFileItem[], forceMode?: ProcessingMode) => {
      if (fileItems.length === 0) {
        setMergedBlob(null);
        setProcessingInfo(null);
        return;
      }

      const generation = ++mergeGenerationRef.current;
      setMerging(true);
      setFallback(null);

      try {
        let blob: Blob;
        let info: ProcessingInfo | null = null;

        if (fileItems.length === 1 && isPdfFile(fileItems[0].file)) {
          blob = fileItems[0].file;
        } else {
          const orderedFiles = fileItems.map((item) => item.file);
          const mergeHasImages = orderedFiles.some(isImageFile);
          const result = await processMerge(
            orderedFiles,
            mergeHasImages ? effectiveImageLayout : DEFAULT_IMAGE_PDF_LAYOUT,
            undefined,
            forceMode ? { forceMode } : undefined
          );
          blob = result.blob;
          info = { mode: result.mode, reason: result.reason };
        }

        if (generation !== mergeGenerationRef.current) return;

        setMergedBlob(blob);
        setProcessingInfo(info);
      } catch (err) {
        if (generation !== mergeGenerationRef.current) return;
        console.error("auto merge failed:", err);
        setMergedBlob(null);
        const variant = getFallbackVariant(err);
        if (variant) {
          setFallback(variant);
        } else {
          toast.error(getProcessingErrorMessage(err));
        }
      } finally {
        if (generation === mergeGenerationRef.current) {
          setMerging(false);
        }
      }
    },
    [effectiveImageLayout]
  );

  useEffect(() => {
    if (items.length === 0) {
      setMergedBlob(null);
      setProcessingInfo(null);
      return;
    }

    const forceMode = pendingForceModeRef.current;
    pendingForceModeRef.current = undefined;

    const timer = window.setTimeout(() => {
      runAutoMerge(items, forceMode);
    }, MERGE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [items, effectiveImageLayout, runAutoMerge]);

  useEffect(() => {
    if (items.length === 0) {
      setDimensionState({ loading: false, uneven: false });
      return;
    }

    let cancelled = false;
    setDimensionState((prev) => ({ ...prev, loading: true }));

    const timer = window.setTimeout(async () => {
      try {
        const dimensions = await collectMergeSourceDimensions(files);
        if (!cancelled) {
          setDimensionState({
            loading: false,
            uneven: hasUnevenPageDimensions(dimensions),
          });
        }
      } catch (err) {
        console.error("merge dimension detection failed:", err);
        if (!cancelled) {
          setDimensionState({ loading: false, uneven: false });
        }
      }
    }, DIMENSION_CHECK_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [files, items.length]);

  useEffect(() => {
    setExportBlob(null);
    setPageEditSpec(null);
    setPageSummary(null);
  }, [mergedBlob]);

  useEffect(() => {
    if (!mergedBlob || !pageEditSpec || pageEditSpec.pageIndicesInOrder.length === 0) {
      setExportBlob(null);
      setComputingExportSize(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setComputingExportSize(true);
      try {
        const blob = await exportEditedPdf(mergedBlob, pageEditSpec);
        if (!cancelled) setExportBlob(blob);
      } catch (err) {
        if (!cancelled) {
          console.error("export size preview failed:", err);
          setExportBlob(null);
        }
      } finally {
        if (!cancelled) setComputingExportSize(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mergedBlob, pageEditSpec]);

  const handleDrop = useCallback((accepted: File[]) => {
    setProcessingInfo(null);
    setFallback(null);
    setItems((prev) => [
      ...prev,
      ...accepted.map((f) => ({ id: createStagedFileId("file"), file: f })),
    ]);
    if (accepted.some((f) => /heic|heif/i.test(f.type || f.name))) {
      toast.info("HEIC converts to JPEG inside the PDF.");
    } else if (accepted.some((f) => f.type.startsWith("image/"))) {
      toast.info("Images will be compressed to JPEG for embedding");
    }
  }, []);

  function handleReset() {
    mergeGenerationRef.current += 1;
    setItems([]);
    setMergedBlob(null);
    setProcessingInfo(null);
    setFallback(null);
    setPageSummary(null);
    setExportBlob(null);
    setPageEditSpec(null);
  }

  function handleFallbackRetry(mode: ProcessingMode) {
    pendingForceModeRef.current = mode;
    setFallback(null);
    runAutoMerge(items, mode);
  }

  async function buildExportBlob(): Promise<Blob | null> {
    if (!mergedBlob) return null;

    if (exportBlob) return exportBlob;

    if (!pageEditSpec || pageEditSpec.pageIndicesInOrder.length === 0) {
      toast.error("Keep at least one page.");
      return null;
    }

    return exportEditedPdf(mergedBlob, pageEditSpec);
  }

  async function getCompressedExportBlob(): Promise<Blob | null> {
    const blob = await buildExportBlob();
    if (!blob) return null;
    const sourceFile = new File([blob], OUTPUT_FILENAMES.merge, {
      type: "application/pdf",
    });
    const output = await processCompress(sourceFile, quality);
    return output.blob;
  }

  async function handleDownload() {
    setExporting(true);
    try {
      const blob = await buildExportBlob();
      if (!blob) return;
      toast.success("Done. Downloading…");
      triggerBlobDownload(blob, OUTPUT_FILENAMES.merge, 300);
    } catch (err) {
      console.error("merge download failed:", err);
      toast.error("Processing failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleCompressDownload() {
    setExporting(true);
    try {
      const blob = await buildExportBlob();
      if (!blob) return;

      const sourceFile = new File([blob], OUTPUT_FILENAMES.merge, {
        type: "application/pdf",
      });
      const result = await processCompress(sourceFile, quality);
      const filename = buildCompressedFilename(OUTPUT_FILENAMES.merge);
      toast.success("Done. Downloading…");
      triggerBlobDownload(result.blob, filename, 300);
    } catch (err) {
      console.error("merge compress download failed:", err);
      toast.error(getProcessingErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  const busy = merging || exporting;
  const combinedSizeLabel = exportBlob
    ? formatBytes(exportBlob.size)
    : computingExportSize
      ? "…"
      : mergedBlob
        ? formatBytes(mergedBlob.size)
        : merging
          ? "…"
          : "…";

  const layoutPanel =
    showLayoutPanel ? (
      <ImagePdfLayoutPanel
        enabled={imageLayoutEnabled}
        onEnabledChange={setImageLayoutEnabled}
        layout={imageLayout}
        onLayoutChange={setImageLayout}
        disabled={busy}
        unevenDimensionsDetected={promptUnevenLayout}
        helperText="Applies to image files only. PDF pages keep their original size."
      />
    ) : null;

  const downloadPanel = (
    <>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        {!mergedBlob && (
          <p className="text-xs text-muted-foreground">Building preview…</p>
        )}
        <p className="text-sm font-medium">Download</p>
        <PrimaryActionButton
          type="button"
          onClick={handleDownload}
          disabled={busy || !mergedBlob}
          className="w-full"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {exporting ? "Processing…" : "Download PDF"}
        </PrimaryActionButton>
        <p className="text-xs text-muted-foreground text-center">
          Without compression
        </p>
        <EmailDeliveryForm
          inputId="merge-email-download"
          blob={exportBlob}
          filename={OUTPUT_FILENAMES.merge}
          toolLabel="merged PDF"
          disabled={busy || !exportBlob}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium">Download compressed</p>
        <div className="space-y-2">
          <label
            htmlFor="merge-compress-preset"
            className="text-sm font-medium block"
          >
            Compression preset
          </label>
          <select
            id="merge-compress-preset"
            value={quality}
            onChange={(e) => {
              const value = e.target.value;
              if (
                (QUALITY_PRESET_KEYS as readonly string[]).includes(value)
              ) {
                setQuality(value as QualityPreset);
              }
            }}
            disabled={busy}
            className={cn(
              "w-full min-h-[48px] rounded-md border border-border bg-background",
              "px-3 py-2 text-sm text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            {QUALITY_PRESET_KEYS.map((preset) => (
              <option key={preset} value={preset}>
                {QUALITY_PRESETS[preset].label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {QUALITY_PRESETS[quality].description}
          </p>
        </div>
        <SecondaryActionButton
          type="button"
          onClick={handleCompressDownload}
          disabled={busy || !mergedBlob}
          className="w-full"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Minimize2 className="w-4 h-4" />
          )}
          Compress & download
        </SecondaryActionButton>
        <EmailDeliveryForm
          inputId="merge-email-compress"
          getBlob={async () => {
            const blob = await buildExportBlob();
            if (!blob) return null;
            const sourceFile = new File([blob], OUTPUT_FILENAMES.merge, {
              type: "application/pdf",
            });
            const output = await processCompress(sourceFile, quality);
            return output.blob;
          }}
          filename={buildCompressedFilename(OUTPUT_FILENAMES.merge)}
          toolLabel="compressed PDF"
          disabled={busy || !mergedBlob}
        />
      </div>
    </>
  );

  const rightSidebar =
    items.length > 0 ? (
      <div className="flex flex-col gap-3">
        {layoutPanel ? <div className="hidden lg:block">{layoutPanel}</div> : null}
        {downloadPanel}
      </div>
    ) : undefined;

  return (
    <>
    <ToolShell
      icon={Combine}
      title="Merge PDFs"
      description="Drop files, reorder them or individual pages, then download or compress."
      rightSidebar={items.length > 0 ? rightSidebar : undefined}
    >
      {items.length === 0 ? (
        <ToolLanding>
          <FileDropzone
            onDrop={handleDrop}
            accept={IMAGE_TOOL_ACCEPT}
            multiple
            maxSize={LOCAL_SIZE_WARN_BYTES}
            label="Drop PDFs and images here, or click to browse."
            hint="Accepts PDF, JPEG, PNG, WebP, HEIC · large jobs run on your device"
            disabled={busy}
          />
        </ToolLanding>
      ) : (
        <ToolWorkspace wide>
        <div className="space-y-6 min-w-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  Files
                  <span className="text-muted-foreground font-normal font-mono tabular-nums ml-2">
                    {items.length} · {formatBytes(totalSize)} staged
                  </span>
                </p>
                <DestructiveActionButton type="button" onClick={handleReset}>
                  Clear all
                </DestructiveActionButton>
              </div>

              <HybridProcessingFeedback
                operation="merge"
                files={files}
                showWarn={showWarn}
                processingInfo={badgeInfo}
                fallback={fallback}
                active={merging}
                onRetryServer={() => handleFallbackRetry("server")}
                onRetryLocal={() => handleFallbackRetry("local")}
                progressKey={String(merging)}
              />

              <p className="text-xs text-muted-foreground">
                Drag files to change merge order. The page preview below updates
                automatically.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,300px)_1fr] gap-3 items-stretch">
                <FileDropzone
                  onDrop={handleDrop}
                  accept={IMAGE_TOOL_ACCEPT}
                  multiple
                  maxSize={LOCAL_SIZE_WARN_BYTES}
                  compact
                  fillHeight
                  label="Add files"
                  hint="PDF, JPEG, PNG, WebP, HEIC"
                  disabled={busy}
                />
                <FileList items={items} onReorder={setItems} />
              </div>
            </div>

            {mergedBlob ? (
              <div className="space-y-4 pt-2 border-t border-border">
                {layoutPanel ? (
                  <div className="lg:hidden">{layoutPanel}</div>
                ) : null}

                <div>
                  <p className="text-sm font-medium">Page preview</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Combined PDF:{" "}
                    <span className="font-mono tabular-nums text-foreground">
                      {combinedSizeLabel}
                    </span>
                    {pageSummary && pageSummary.total > 0 && (
                      <>
                        {" "}
                        · {pageSummary.kept} of {pageSummary.total} page
                        {pageSummary.total !== 1 ? "s" : ""} kept
                      </>
                    )}
                  </p>
                </div>

                <PageGrid
                  pdfBlob={mergedBlob}
                  externalActions
                  onSummaryChange={setPageSummary}
                  onEditSpecChange={handleEditSpecChange}
                  previewPageSize={
                    imageLayoutEnabled ? imageLayout.pageSize : "letter"
                  }
                  previewOrientation={
                    imageLayoutEnabled ? imageLayout.orientation : "portrait"
                  }
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Building preview…</p>
            )}
        </div>
        </ToolWorkspace>
      )}
    </ToolShell>

    <MobileDownloadFab blob={mergedBlob} onClick={() => setDrawerOpen(true)} />
    <MobileOutputDrawer
      open={drawerOpen}
      onOpenChange={setDrawerOpen}
      blob={exportBlob}
      getBlob={buildExportBlob}
      filename={OUTPUT_FILENAMES.merge}
      toolLabel="merged PDF"
      supportsCompression
      getCompressedBlob={getCompressedExportBlob}
    />
    </>
  );
}
