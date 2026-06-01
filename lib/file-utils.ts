import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_JPEG_PNG_TYPES,
  ACCEPTED_PDF_TYPES,
  MAX_UPLOAD_BYTES,
  QUALITY_PRESET_KEYS,
  type QualityPreset,
} from "@/lib/constants";

/** Detect whether a buffer is a PDF by checking the %PDF header. */
export function isPdfBuffer(buf: Buffer): boolean {
  return buf.slice(0, 4).toString("ascii") === "%PDF";
}

export function isQualityPreset(value: unknown): value is QualityPreset {
  return (
    typeof value === "string" &&
    (QUALITY_PRESET_KEYS as readonly string[]).includes(value)
  );
}

export function isAcceptedPdfMime(mime: string): boolean {
  return (ACCEPTED_PDF_TYPES as readonly string[]).includes(mime);
}

export function isAcceptedImageMime(mime: string): boolean {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(mime);
}

export function isAcceptedJpegPngMime(mime: string): boolean {
  return (ACCEPTED_JPEG_PNG_TYPES as readonly string[]).includes(mime);
}

export function isAcceptedMergeMime(mime: string, buffer: Buffer): boolean {
  if (isPdfBuffer(buffer)) return true;
  return isAcceptedJpegPngMime(mime);
}

export function getUploadSizeError(totalBytes: number): string | null {
  if (totalBytes > MAX_UPLOAD_BYTES) {
    return "File too large: 6 MB limit";
  }
  return null;
}

export function buildCompressedFilename(originalName: string): string {
  const base = sanitizeFilename(originalName.replace(/\.pdf$/i, ""));
  return `compressed-${base}.pdf`;
}

/** Format bytes as a human-readable string. */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 200);
}
