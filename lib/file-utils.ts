import {
  ACCEPTED_CONVERTIBLE_IMAGE_TYPES,
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

export function isAcceptedConvertibleImageMime(mime: string): boolean {
  return (ACCEPTED_CONVERTIBLE_IMAGE_TYPES as readonly string[]).includes(mime);
}

function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 12 && buffer.slice(0, 4).toString("ascii") === "RIFF") {
    if (buffer.slice(8, 12).toString("ascii") === "WEBP") return "image/webp";
  }
  if (buffer.length >= 12) {
    const ftyp = buffer.slice(4, 8).toString("ascii");
    if (ftyp === "ftyp") {
      const brand = buffer.slice(8, 12).toString("ascii");
      if (brand.startsWith("heic") || brand.startsWith("heix") || brand.startsWith("mif1")) {
        return "image/heic";
      }
    }
  }
  return null;
}

/** Resolve MIME when the browser leaves file.type empty (common on iOS). */
export function resolveImageMime(mime: string, buffer: Buffer): string {
  if (mime && mime !== "application/octet-stream") return mime;
  const sniffed = sniffImageMime(buffer);
  return sniffed ?? mime;
}

export function isAcceptedMergeMime(mime: string, buffer: Buffer): boolean {
  if (isPdfBuffer(buffer)) return true;
  const resolved = resolveImageMime(mime, buffer);
  return isAcceptedConvertibleImageMime(resolved);
}

export function isAcceptedImageToPdfMime(mime: string, buffer: Buffer): boolean {
  const resolved = resolveImageMime(mime, buffer);
  return isAcceptedConvertibleImageMime(resolved);
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

let stagedIdCounter = 0;

/** Unique id for drag-reorder file list items. */
export function createStagedFileId(prefix: string): string {
  return `${prefix}-${++stagedIdCounter}-${Math.random().toString(36).slice(2)}`;
}

export type ReadFormFileResult =
  | { file: File; buffer: Buffer }
  | { error: string };

/** Parse a single multipart file entry for API routes. */
export async function readFormFile(
  entry: FormDataEntryValue
): Promise<ReadFormFileResult> {
  if (!(entry instanceof File)) {
    return { error: "Invalid file upload." };
  }
  const buffer = Buffer.from(await entry.arrayBuffer());
  return { file: entry, buffer };
}
