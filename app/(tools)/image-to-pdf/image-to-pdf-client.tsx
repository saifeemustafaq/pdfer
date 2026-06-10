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
import { ToolLanding, ToolWorkspace } from "@/components/tool-landing";
import { FileDropzone } from "@/components/file-dropzone";
import { AcceptedFormats } from "@/components/accepted-formats";
import { TOOL_SPECS } from "@/lib/tool-specs";
import { FileList } from "@/components/file-list";
import { ProcessingBadge } from "@/components/processing-badge";
import { HybridProcessingFeedback } from "@/components/hybrid-processing-feedback";
import {
  ImagePdfLayoutPanel,
  resolveImageLayoutForProcessing,
} from "@/components/image-pdf-layout-panel";
import { ToolResultFooter } from "@/components/tool-result-footer";
import { MobileDownloadFab } from "@/components/mobile-download-fab";
import { MobileOutputDrawer } from "@/components/mobile-output-drawer";
import {
  MERGE_IMAGE_LAYOUT_DEFAULT,
  type ImagePdfLayoutOptions as ImagePdfLayout,
} from "@/lib/image-pdf-layout";
import {
  OUTPUT_FILENAMES,
  LOCAL_SIZE_WARN_BYTES,
  TOOL_ROUTES,
  UPLOAD_WARN_BYTES,
  IMAGE_TO_PDF_ACCEPT,
} from "@/lib/constants";
import { createStagedFileId, formatBytes } from "@/lib/file-utils";
import { triggerBlobDownload } from "@/lib/download-client";
import {
  getFallbackVariant,
  getProcessingErrorMessage,
  type ProcessingFallbackVariant,
} from "@/lib/processing/errors";
import {
  processImageToPdf,
  processCompress,
} from "@/lib/processing/orchestrator";
import { useRoutingBadge } from "@/lib/processing/use-routing-badge";
import { useImagePaste } from "@/hooks/use-clipboard-paste";
import type { ProcessingInfo, ProcessingMode } from "@/lib/processing/types";
import type { StagedFileItem } from "@/types";

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
  const [imageLayoutEnabled, setImageLayoutEnabled] = useState(false);
  const [layout, setLayout] = useState<ImagePdfLayout>(MERGE_IMAGE_LAYOUT_DEFAULT);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const effectiveLayout = useMemo(
    () => resolveImageLayoutForProcessing(imageLayoutEnabled, layout),
    [imageLayoutEnabled, layout]
  );

  const getCompressedBlob = useCallback(async (): Promise<Blob | null> => {
    if (!result) return null;
    const source = new File([result], OUTPUT_FILENAMES.imageToPdf, {
      type: "application/pdf",
    });
    const output = await processCompress(source, "medium");
    return output.blob;
  }, [result]);

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
    if (files.some((f) => /heic|heif/i.test(f.type || f.name))) {
      toast.info("HEIC converts to JPEG inside the PDF.");
    }
  }, []);

  // Cmd/Ctrl+V anywhere on the page pastes a copied image straight in.
  useImagePaste(handleDrop, { enabled: !loading });

  async function handleConvert(forceMode?: ProcessingMode) {
    if (items.length === 0) return;

    setLoading(true);
    setResult(null);
    setProcessingInfo(null);
    setFallback(null);

    try {
      const output = await processImageToPdf(
        files,
        effectiveLayout,
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

  const rightSidebar =
    items.length > 0 ? (
      <div className="flex flex-col gap-4">
        <div className="hidden lg:block">
          <ImagePdfLayoutPanel
            enabled={imageLayoutEnabled}
            onEnabledChange={setImageLayoutEnabled}
            layout={layout}
            onLayoutChange={setLayout}
            disabled={loading}
          />
        </div>
        {!result && (
          <PrimaryActionButton
            onClick={() => handleConvert()}
            disabled={loading || items.length === 0}
            className="w-full"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Processing…" : "Convert to PDF"}
          </PrimaryActionButton>
        )}

        {result && (
          <ToolResultFooter
            blob={result}
            downloadFilename={OUTPUT_FILENAMES.imageToPdf}
            secondaryLabel="Convert more images"
            onSecondary={handleReset}
            emailInputId="image-to-pdf-email"
            toolLabel="converted PDF"
          />
        )}
      </div>
    ) : undefined;

  return (
    <>
    <ToolShell
      icon={Images}
      title="Image to PDF"
      description="Upload images in the order you want them. Each image becomes one page."
      rightSidebar={rightSidebar}
    >
      {items.length === 0 ? (
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
            accept={IMAGE_TO_PDF_ACCEPT}
            multiple
            maxSize={LOCAL_SIZE_WARN_BYTES}
            label="Drop images here, paste, or click to browse."
            hint="Paste (⌘V / Ctrl+V), take a photo, or choose from library · JPEG, PNG, WebP, HEIC"
            capture="environment"
            showCameraButton
            showPasteButton
            disabled={loading}
          />
          <AcceptedFormats spec={TOOL_SPECS.imageToPdf} />
        </ToolLanding>
      ) : (
        <ToolWorkspace>
          {!result ? (
            <div className="space-y-4">
              <FileDropzone
                onDrop={handleDrop}
                accept={IMAGE_TO_PDF_ACCEPT}
                multiple
                maxSize={LOCAL_SIZE_WARN_BYTES}
                compact
                label="Add more images"
                hint="Paste (⌘V / Ctrl+V), take a photo, or choose from library"
                capture="environment"
                showCameraButton
                showPasteButton
                disabled={loading}
              />

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {items.length} image{items.length !== 1 ? "s" : ""}
                  <span className="ml-2 font-normal font-mono tabular-nums text-muted-foreground">
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

              <ImagePdfLayoutPanel
                enabled={imageLayoutEnabled}
                onEnabledChange={setImageLayoutEnabled}
                layout={layout}
                onLayoutChange={setLayout}
                disabled={loading}
              />
            </div>
          ) : (
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
            </div>
          )}
        </ToolWorkspace>
      )}
    </ToolShell>

    <MobileDownloadFab blob={result} onClick={() => setDrawerOpen(true)} />
    <MobileOutputDrawer
      open={drawerOpen}
      onOpenChange={setDrawerOpen}
      blob={result}
      filename={OUTPUT_FILENAMES.imageToPdf}
      toolLabel="converted PDF"
      supportsCompression
      getCompressedBlob={getCompressedBlob}
    />
    </>
  );
}
