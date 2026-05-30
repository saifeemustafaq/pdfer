import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPES,
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
