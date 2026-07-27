"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { signatureOverlayStyle, type SignaturePosition } from "@/lib/pdf-form-sign";

type PdfOverlayImageProps = {
  url: string;
  position: SignaturePosition;
  alt?: string;
  className?: string;
};

/**
 * Non-interactive image placed on a PDF page preview at a normalized position.
 * Used to show context overlays (e.g. the added image while positioning a
 * signature on the Sign tab, or vice versa).
 */
export function PdfOverlayImage({
  url,
  position,
  alt = "",
  className,
}: PdfOverlayImageProps) {
  const style = signatureOverlayStyle(position);
  const positionStyle = {
    "--sig-left": style.left,
    "--sig-bottom": style.bottom,
    "--sig-width": style.width,
  } as CSSProperties;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={cn(
        "pdf-preview-overlay-signature pointer-events-none absolute h-auto",
        className
      )}
      style={positionStyle}
      draggable={false}
    />
  );
}
