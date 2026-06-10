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
import { ToolLanding, ToolWorkspace } from "@/components/tool-landing";
import { FileDropzone } from "@/components/file-dropzone";
import { AcceptedFormats } from "@/components/accepted-formats";
import { TOOL_SPECS } from "@/lib/tool-specs";
import { ProcessingBadge } from "@/components/processing-badge";
import { ToolResultFooter } from "@/components/tool-result-footer";
import { MobileDownloadFab } from "@/components/mobile-download-fab";
import { MobileOutputDrawer } from "@/components/mobile-output-drawer";
import { EncryptedPdfNotice } from "@/components/encrypted-pdf-notice";
import { EditPdfTabBar, type EditPdfTab } from "@/components/edit-pdf-tab-bar";
import { PdfWatermarkPanel } from "@/components/pdf-watermark-panel";
import {
  PdfFormSignPanel,
  DEFAULT_SIGNATURE_SPEC,
} from "@/components/pdf-form-sign-panel";
import type { PageGridSummary } from "@/components/page-grid";
import type { PageEditSpec } from "@/lib/pdf-client";
import { exportEditedPdfFull } from "@/lib/pdf-edit-export";
import {
  detectFormFields,
  type FormFieldMeta,
  type SignatureSpec,
} from "@/lib/pdf-form-sign";
import {
  DEFAULT_WATERMARK_SPEC,
  type WatermarkSpec,
} from "@/lib/pdf-watermark";
import { preflightPdf } from "@/lib/processing/preflight";
import { processCompress } from "@/lib/processing/orchestrator";
import { triggerBlobDownload } from "@/lib/download-client";
import { LOCAL_SIZE_WARN_BYTES, OUTPUT_FILENAMES } from "@/lib/constants";
import { formatBytes } from "@/lib/file-utils";
import type { ProcessingInfo } from "@/lib/processing/types";

const PageGrid = dynamic(
  () => import("@/components/page-grid").then((m) => m.PageGrid),
  { ssr: false }
);

const PdfWatermarkPreview = dynamic(
  () =>
    import("@/components/pdf-watermark-preview").then(
      (m) => m.PdfWatermarkPreview
    ),
  { ssr: false }
);

const PdfSignaturePreview = dynamic(
  () =>
    import("@/components/pdf-signature-preview").then(
      (m) => m.PdfSignaturePreview
    ),
  { ssr: false }
);

const LOCAL_PROCESSING: ProcessingInfo = {
  mode: "local",
  reason: "Page editing runs on your device",
};

export function EditPdfClient() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [encrypted, setEncrypted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<EditPdfTab>("pages");
  const [pageEditSpec, setPageEditSpec] = useState<PageEditSpec | null>(null);
  const [pageSummary, setPageSummary] = useState<PageGridSummary | null>(null);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkSpec, setWatermarkSpec] =
    useState<WatermarkSpec>(DEFAULT_WATERMARK_SPEC);
  const [formFields, setFormFields] = useState<FormFieldMeta[]>([]);
  const [formFillEnabled, setFormFillEnabled] = useState(false);
  const [fieldValues, setFieldValues] = useState<
    Record<string, string | boolean>
  >({});
  const [signatureEnabled, setSignatureEnabled] = useState(false);
  const [signaturePng, setSignaturePng] = useState<Uint8Array | null>(null);
  const [signatureSpec, setSignatureSpec] =
    useState<SignatureSpec>(DEFAULT_SIGNATURE_SPEC);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDrop = useCallback(async (files: File[]) => {
    const pdf = files[0];
    if (!pdf) return;

    setFile(pdf);
    setPdfBlob(null);
    setPreflightError(null);
    setEncrypted(false);
    setPageEditSpec(null);
    setPageSummary(null);
    setFormFields([]);
    setFieldValues({});
    setFormFillEnabled(false);
    setSignatureEnabled(false);
    setSignaturePng(null);
    setResultBlob(null);
    setWatermarkEnabled(false);
    setActiveTab("pages");
    setChecking(true);

    try {
      const preflight = await preflightPdf(pdf);
      if (preflight.encrypted) {
        setEncrypted(true);
        setPreflightError("encrypted");
        return;
      }

      setPageCount(preflight.pageCount ?? 0);
      setPdfBlob(pdf);
      setWatermarkSpec((prev) => ({
        ...prev,
        rangeEnd: preflight.pageCount ?? prev.rangeEnd,
      }));
      setSignatureSpec((prev) => {
        const maxIndex = Math.max(0, (preflight.pageCount ?? 1) - 1);
        const filteredSelected = prev.selectedPages.filter(
          (index) => index <= maxIndex
        );
        return {
          ...prev,
          rangeEnd: preflight.pageCount ?? prev.rangeEnd,
          activePageIndex: Math.min(prev.activePageIndex, maxIndex),
          selectedPages:
            filteredSelected.length > 0
              ? filteredSelected
              : [Math.min(prev.activePageIndex, maxIndex)],
        };
      });

      try {
        const fields = await detectFormFields(pdf);
        setFormFields(fields);
      } catch (err) {
        console.error("edit-pdf form detect failed:", err);
        setFormFields([]);
      }
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
    setPageCount(0);
    setPreflightError(null);
    setEncrypted(false);
    setPageEditSpec(null);
    setPageSummary(null);
    setFormFields([]);
    setFieldValues({});
    setFormFillEnabled(false);
    setSignatureEnabled(false);
    setSignaturePng(null);
    setResultBlob(null);
    setWatermarkEnabled(false);
    setWatermarkSpec(DEFAULT_WATERMARK_SPEC);
    setSignatureSpec(DEFAULT_SIGNATURE_SPEC);
  }

  const handleEditSpecChange = useCallback((spec: PageEditSpec) => {
    setPageEditSpec(spec);
    setResultBlob(null);
  }, []);

  async function buildEditedBlob(): Promise<Blob | null> {
    if (!pdfBlob) return null;

    if (
      activeTab === "pages" &&
      pageEditSpec &&
      pageEditSpec.pageIndicesInOrder.length === 0
    ) {
      toast.error("Keep at least one page.");
      return null;
    }

    return exportEditedPdfFull(pdfBlob, {
      pageEdit: pageEditSpec,
      watermark:
        watermarkEnabled && watermarkSpec.text.trim()
          ? watermarkSpec
          : null,
      formFillEnabled,
      fieldMeta: formFields,
      fieldValues,
      signatureEnabled,
      signaturePng,
      signatureSpec,
    });
  }

  async function buildCompressedEditedBlob(): Promise<Blob | null> {
    const blob = await buildEditedBlob();
    if (!blob) return null;
    const source = new File([blob], OUTPUT_FILENAMES.editPdf, {
      type: "application/pdf",
    });
    const output = await processCompress(source, "medium");
    return output.blob;
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
  const canDownload = !busy && !!pdfBlob && !preflightError;

  const tabPanel =
    pdfBlob && !preflightError ? (
      activeTab === "watermark" ? (
        <PdfWatermarkPanel
          enabled={watermarkEnabled}
          onEnabledChange={(enabled) => {
            setWatermarkEnabled(enabled);
            setResultBlob(null);
          }}
          spec={watermarkSpec}
          onChange={(spec) => {
            setWatermarkSpec(spec);
            setResultBlob(null);
          }}
          pageCount={pageCount}
        />
      ) : activeTab === "sign" ? (
        <PdfFormSignPanel
          fields={formFields}
          formFillEnabled={formFillEnabled}
          onFormFillEnabledChange={(enabled) => {
            setFormFillEnabled(enabled);
            setResultBlob(null);
          }}
          values={fieldValues}
          onValuesChange={(values) => {
            setFieldValues(values);
            setResultBlob(null);
          }}
          signatureEnabled={signatureEnabled}
          onSignatureEnabledChange={(enabled) => {
            setSignatureEnabled(enabled);
            if (!enabled) setSignaturePng(null);
            setResultBlob(null);
          }}
          signatureSpec={signatureSpec}
          onSignatureSpecChange={(spec) => {
            setSignatureSpec(spec);
            setResultBlob(null);
          }}
          onSignatureChange={(png) => {
            setSignaturePng(png);
            setResultBlob(null);
          }}
          signaturePng={signaturePng}
          pageCount={pageCount}
        />
      ) : null
    ) : null;

  const rightSidebar =
    pdfBlob && !preflightError ? (
      <div className="flex flex-col gap-4">
        {tabPanel}
        <PrimaryActionButton
          onClick={handleDownload}
          disabled={!canDownload}
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
    ) : undefined;

  return (
    <>
    <ToolShell
      icon={LayoutGrid}
      title="Edit PDF"
      description="Reorder pages, add a watermark, fill forms, or sign. Runs on your device."
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
            hint="Accepts PDF · use Unlock for password-protected files"
            disabled={checking}
          />
          <AcceptedFormats spec={TOOL_SPECS.editPdf} />
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
                <EditPdfTabBar active={activeTab} onChange={setActiveTab} />

                <ProcessingBadge
                  mode={LOCAL_PROCESSING.mode}
                  reason={LOCAL_PROCESSING.reason}
                />

                {activeTab === "pages" && (
                  <>
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
                  </>
                )}

                {activeTab === "watermark" && pdfBlob && (
                  <PdfWatermarkPreview
                    pdfBlob={pdfBlob}
                    spec={watermarkSpec}
                    enabled={watermarkEnabled}
                    pageCount={pageCount}
                  />
                )}

                {activeTab === "sign" && pdfBlob && (
                  <PdfSignaturePreview
                    pdfBlob={pdfBlob}
                    signaturePng={signaturePng}
                    signatureEnabled={signatureEnabled}
                    spec={signatureSpec}
                    onSpecChange={(spec) => {
                      setSignatureSpec(spec);
                      setResultBlob(null);
                    }}
                    pageCount={pageCount}
                  />
                )}

              </>
            )}
          </div>
        </ToolWorkspace>
      )}
    </ToolShell>

    <MobileDownloadFab blob={resultBlob} onClick={() => setDrawerOpen(true)} />
    <MobileOutputDrawer
      open={drawerOpen}
      onOpenChange={setDrawerOpen}
      blob={resultBlob}
      getBlob={buildEditedBlob}
      filename={OUTPUT_FILENAMES.editPdf}
      toolLabel="Edit PDF"
      supportsCompression
      getCompressedBlob={buildCompressedEditedBlob}
    />
    </>
  );
}
