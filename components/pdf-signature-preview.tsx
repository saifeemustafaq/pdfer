"use client";

import { useEffect, useMemo, type CSSProperties } from "react";
import { Input } from "@/components/ui/input";
import { PdfPagePreviewFrame } from "@/components/pdf-page-preview-frame";
import { SignatureDraggableOverlay } from "@/components/signature-draggable-overlay";
import { usePdfPagePreview } from "@/hooks/use-pdf-page-preview";
import {
  getActivePlacement,
  isPageSigned,
  pngAspectRatio,
  setActivePlacement,
  signatureOverlayStyle,
  type SignatureSpec,
} from "@/lib/pdf-form-sign";

type PdfSignaturePreviewProps = {
  pdfBlob: Blob;
  signaturePng: Uint8Array | null;
  signatureEnabled: boolean;
  spec: SignatureSpec;
  onSpecChange: (spec: SignatureSpec) => void;
  pageCount: number;
};

export function PdfSignaturePreview({
  pdfBlob,
  signaturePng,
  signatureEnabled,
  spec,
  onSpecChange,
  pageCount,
}: PdfSignaturePreviewProps) {
  const previewPage = spec.activePageIndex + 1;

  const { pageImageUrl, renderSize, loading, error } = usePdfPagePreview(
    pdfBlob,
    previewPage
  );

  const signatureUrl = useMemo(() => {
    if (!signatureEnabled || !signaturePng?.length) return null;
    return URL.createObjectURL(
      new Blob([signaturePng.buffer as ArrayBuffer], { type: "image/png" })
    );
  }, [signatureEnabled, signaturePng]);

  useEffect(() => {
    return () => {
      if (signatureUrl) URL.revokeObjectURL(signatureUrl);
    };
  }, [signatureUrl]);

  const imageAspect = useMemo(() => {
    if (!signaturePng?.length) return 0.35;
    try {
      return pngAspectRatio(signaturePng);
    } catch {
      return 0.35;
    }
  }, [signaturePng]);

  const activePlacement = getActivePlacement(spec);
  const pageIsSigned = isPageSigned(spec, spec.activePageIndex, pageCount);
  const canInteract =
    signatureEnabled &&
    !!signatureUrl &&
    pageIsSigned &&
    renderSize.width > 0;

  const overlayStyle = signatureOverlayStyle(activePlacement);
  const staticPositionStyle = {
    "--sig-left": overlayStyle.left,
    "--sig-bottom": overlayStyle.bottom,
    "--sig-width": overlayStyle.width,
  } as CSSProperties;

  function handlePreviewPageChange(pageNumber: number) {
    onSpecChange({
      ...spec,
      activePageIndex: Math.max(
        0,
        Math.min(pageNumber - 1, Math.max(0, pageCount - 1))
      ),
    });
  }

  function handlePlacementChange(position: typeof activePlacement) {
    onSpecChange(setActivePlacement(spec, position));
  }

  const pageLabel =
    pageCount > 1 ? (
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Preview page
        <Input
          type="number"
          min={1}
          max={pageCount}
          value={previewPage}
          onChange={(e) =>
            handlePreviewPageChange(
              Math.min(
                pageCount,
                Math.max(1, Number.parseInt(e.target.value, 10) || 1)
              )
            )
          }
          className="h-8 w-16"
        />
        <span>of {pageCount}</span>
      </label>
    ) : null;

  return (
    <PdfPagePreviewFrame
      renderSize={renderSize}
      pageImageUrl={pageImageUrl}
      loading={loading}
      error={error}
      pageAlt={`Page ${previewPage} preview`}
      pageNumber={previewPage}
      pageCount={pageCount}
      onPageChange={handlePreviewPageChange}
      pageLabel={pageLabel}
      hint={
        !signatureEnabled ? (
          <p className="text-xs text-muted-foreground">
            Enable the signature to preview placement on the page.
          </p>
        ) : !signaturePng?.length ? (
          <p className="text-xs text-muted-foreground">
            Draw or upload a signature to see it on the preview.
          </p>
        ) : !pageIsSigned ? (
          <p className="text-xs text-muted-foreground">
            This page is not selected for signing. Pick it in the sidebar or
            switch preview page.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Drag the signature to move it. Use the corner handle to resize.
            {spec.perPagePlacement
              ? " Per-page mode: changes apply to this preview page only."
              : " Placement applies to all signed pages."}
          </p>
        )
      }
      overlay={
        signatureUrl && pageIsSigned ? (
          canInteract ? (
            <SignatureDraggableOverlay
              signatureUrl={signatureUrl}
              position={activePlacement}
              imageAspect={imageAspect}
              frameWidth={renderSize.width}
              frameHeight={renderSize.height}
              onPositionChange={handlePlacementChange}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signatureUrl}
              alt="Signature preview"
              className="pdf-preview-overlay-signature pointer-events-none absolute h-auto opacity-50"
              style={staticPositionStyle}
              draggable={false}
            />
          )
        ) : null
      }
    />
  );
}
