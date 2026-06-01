"use client";

import { useEffect, useMemo, type CSSProperties } from "react";
import { PdfPagePreviewFrame } from "@/components/pdf-page-preview-frame";
import { usePdfPagePreview } from "@/hooks/use-pdf-page-preview";
import {
  signatureOverlayStyle,
  type SignaturePlacement,
} from "@/lib/pdf-form-sign";

type PdfSignaturePreviewProps = {
  pdfBlob: Blob;
  signaturePng: Uint8Array | null;
  signatureEnabled: boolean;
  placement: SignaturePlacement;
  pageCount: number;
};

export function PdfSignaturePreview({
  pdfBlob,
  signaturePng,
  signatureEnabled,
  placement,
  pageCount,
}: PdfSignaturePreviewProps) {
  const previewPage = placement.pageIndex + 1;

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

  const overlayStyle = signatureOverlayStyle(placement);
  const signaturePositionStyle = {
    "--sig-left": overlayStyle.left,
    "--sig-bottom": overlayStyle.bottom,
    "--sig-width": overlayStyle.width,
  } as CSSProperties;

  return (
    <PdfPagePreviewFrame
      renderSize={renderSize}
      pageImageUrl={pageImageUrl}
      loading={loading}
      error={error}
      pageAlt={`Page ${previewPage} preview`}
      pageLabel={
        <p className="text-xs text-muted-foreground">
          Page {Math.min(previewPage, pageCount)} of {pageCount}
        </p>
      }
      hint={
        !signatureEnabled ? (
          <p className="text-xs text-muted-foreground">
            Enable the signature to preview placement on the page.
          </p>
        ) : !signaturePng?.length ? (
          <p className="text-xs text-muted-foreground">
            Draw or upload a signature to see it on the preview.
          </p>
        ) : null
      }
      overlay={
        signatureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={signatureUrl}
            alt="Signature preview"
            className="pdf-preview-overlay-signature pointer-events-none absolute h-auto"
            style={signaturePositionStyle}
            draggable={false}
          />
        ) : null
      }
    />
  );
}
