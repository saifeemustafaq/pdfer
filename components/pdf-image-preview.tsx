"use client";

import { useMemo, type CSSProperties } from "react";
import { Input } from "@/components/ui/input";
import {
  PdfPagePreviewFrame,
  usePdfPreviewBudget,
} from "@/components/pdf-page-preview-frame";
import { AnnotationStaticOverlay } from "@/components/annotation-overlay";
import { SignatureDraggableOverlay } from "@/components/signature-draggable-overlay";
import { usePdfPagePreview } from "@/hooks/use-pdf-page-preview";
import { bytesToDataUrl } from "@/lib/image-data-url";
import { resolveKeptPage } from "@/lib/page-nav";
import { annotationsForPage, type Annotation } from "@/lib/pdf-annotations";
import {
  getActivePlacement,
  isPageSigned,
  pngAspectRatio,
  removePageFromSpec,
  setActivePlacement,
  signatureOverlayStyle,
  type SignatureSpec,
} from "@/lib/pdf-form-sign";

type PdfImagePreviewProps = {
  pdfBlob: Blob;
  imagePng: Uint8Array | null;
  imageEnabled: boolean;
  spec: SignatureSpec;
  onSpecChange: (spec: SignatureSpec) => void;
  pageCount: number;
  /** Sign tab content, drawn on top as context. */
  annotations?: Annotation[];
  /** Shared signature PNG referenced by signature annotations. */
  signaturePng?: Uint8Array | null;
  signatureEnabled?: boolean;
  /** Pages marked for removal in the Pages tab (skipped during navigation). */
  removedPages?: Set<number>;
};

export function PdfImagePreview({
  pdfBlob,
  imagePng,
  imageEnabled,
  spec,
  onSpecChange,
  pageCount,
  annotations = [],
  signaturePng = null,
  signatureEnabled = false,
  removedPages,
}: PdfImagePreviewProps) {
  const previewPage = spec.activePageIndex + 1;

  const { budget, onBudgetChange } = usePdfPreviewBudget();
  const { pdf, pageImageUrl, renderSize, pagePtSize, loading, error } =
    usePdfPagePreview(pdfBlob, previewPage, budget);

  const imageUrl = useMemo(() => {
    if (!imageEnabled || !imagePng?.length) return null;
    return bytesToDataUrl(imagePng, "image/png");
  }, [imageEnabled, imagePng]);

  const signatureContextUrl = useMemo(() => {
    if (!signatureEnabled || !signaturePng?.length) return null;
    return bytesToDataUrl(signaturePng, "image/png");
  }, [signatureEnabled, signaturePng]);

  // Context only: these are owned by the Sign tab. Export stamps the image
  // first, so annotations are drawn on top of it here to match.
  const contextAnnotations = useMemo(
    () => annotationsForPage(annotations, spec.activePageIndex),
    [annotations, spec.activePageIndex]
  );

  const annotationScale =
    pagePtSize.height > 0 ? renderSize.height / pagePtSize.height : 1;

  const imageAspect = useMemo(() => {
    if (!imagePng?.length) return 0.35;
    try {
      return pngAspectRatio(imagePng);
    } catch {
      return 0.35;
    }
  }, [imagePng]);

  const activePlacement = getActivePlacement(spec);
  const pageHasImage = isPageSigned(spec, spec.activePageIndex, pageCount);
  const canInteract =
    imageEnabled && !!imageUrl && pageHasImage && renderSize.width > 0;

  const overlayStyle = signatureOverlayStyle(activePlacement);
  const staticPositionStyle = {
    "--sig-left": overlayStyle.left,
    "--sig-bottom": overlayStyle.bottom,
    "--sig-width": overlayStyle.width,
    transform: activePlacement.rotation
      ? `rotate(${activePlacement.rotation}deg)`
      : undefined,
  } as CSSProperties;

  function handlePreviewPageChange(pageNumber: number) {
    const target = pageNumber - 1;
    const resolved = removedPages
      ? resolveKeptPage(target, spec.activePageIndex, removedPages, pageCount)
      : Math.max(0, Math.min(target, Math.max(0, pageCount - 1)));
    onSpecChange({ ...spec, activePageIndex: resolved });
  }

  function handlePlacementChange(position: typeof activePlacement) {
    onSpecChange(setActivePlacement(spec, position));
  }

  function handleRemoveFromPage() {
    onSpecChange(removePageFromSpec(spec, spec.activePageIndex, pageCount));
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
      onBudgetChange={onBudgetChange}
      pdf={pdf}
      pageLabel={pageLabel}
      hint={
        <>
        {contextAnnotations.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Your signature and annotations are shown on top. Switch to the Sign
            &amp; Annotate tab to edit them.
          </p>
        )}
        {!imageEnabled ? (
          <p className="text-xs text-muted-foreground">
            Enable Add image to preview placement on the page.
          </p>
        ) : !imagePng?.length ? (
          <p className="text-xs text-muted-foreground">
            Upload an image to see it on the preview.
          </p>
        ) : !pageHasImage ? (
          <p className="text-xs text-muted-foreground">
            The image is not on this page. Tick it under &ldquo;Add image
            to&rdquo; in the sidebar, or switch preview page.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Drag the image to move it, the corner handle to resize, or the
            handle above it to rotate. Use the X to take it off this page.
            {spec.perPagePlacement
              ? " Per-page mode: changes apply to this preview page only."
              : " Placement applies to all selected pages."}
          </p>
        )}
        </>
      }
      overlay={
        <>
          {imageUrl && pageHasImage ? (
            canInteract ? (
              <SignatureDraggableOverlay
                signatureUrl={imageUrl}
                position={activePlacement}
                imageAspect={imageAspect}
                frameWidth={renderSize.width}
                frameHeight={renderSize.height}
                onPositionChange={handlePlacementChange}
                onRemove={handleRemoveFromPage}
                removeLabel={`Remove image from page ${previewPage}`}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Image preview"
                className="pdf-preview-overlay-signature pointer-events-none absolute h-auto opacity-50"
                style={staticPositionStyle}
                draggable={false}
              />
            )
          ) : null}
          {renderSize.width > 0 &&
            contextAnnotations.map((annotation) => (
              <AnnotationStaticOverlay
                key={annotation.id}
                annotation={annotation}
                signatureUrl={signatureContextUrl}
                scale={annotationScale}
              />
            ))}
        </>
      }
    />
  );
}
