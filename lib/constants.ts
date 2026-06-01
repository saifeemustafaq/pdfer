/** Max upload for Netlify API routes (unchanged). */
export const MAX_SERVER_UPLOAD_BYTES = 6 * 1024 * 1024;

/** Alias kept for backward compatibility during migration. */
export const MAX_UPLOAD_BYTES = MAX_SERVER_UPLOAD_BYTES;

/** Soft warning when local jobs may be slow (optional, tune after testing). */
export const LOCAL_SIZE_WARN_BYTES = 15 * 1024 * 1024;

/** Warn in UI when total staged size exceeds this threshold. */
export const UPLOAD_WARN_BYTES = 5 * 1024 * 1024;

/** Below this savings %, show honest "minimal shrink" copy on compress. */
export const MIN_MEANINGFUL_SAVINGS_PERCENT = 5;

export const ACCEPTED_PDF_TYPES = ["application/pdf"] as const;

/** JPEG and PNG only. Used by merge (images), image-to-PDF, and related APIs. */
export const ACCEPTED_JPEG_PNG_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
] as const;

export const ACCEPTED_IMAGE_TYPES = [
  ...ACCEPTED_JPEG_PNG_TYPES,
  "image/webp",
  "image/gif",
  "image/tiff",
  "image/avif",
  "image/heic",
] as const;

export const QUALITY_PRESETS = {
  low: { label: "Small file", description: "Aggressive compression, best for email attachments", jpegQuality: 40 },
  medium: { label: "Balanced", description: "Good quality with meaningful size reduction", jpegQuality: 65 },
  high: { label: "Best quality", description: "Minimal compression, preserves detail", jpegQuality: 85 },
} as const;

export type QualityPreset = keyof typeof QUALITY_PRESETS;

export const QUALITY_PRESET_KEYS = Object.keys(QUALITY_PRESETS) as QualityPreset[];

export const API_ROUTES = {
  merge: "/api/merge",
  compress: "/api/compress",
  imageToPdf: "/api/image-to-pdf",
  sendResult: "/api/send-result",
} as const;

export const TOOL_ROUTES = {
  merge: "/merge",
  compress: "/compress",
  convert: "/convert",
  imageToPdf: "/image-to-pdf",
  pdfToImage: "/pdf-to-image",
} as const;

/** Public source repository (update if the repo moves). */
export const GITHUB_REPO_URL = "https://github.com/saifeemustafaq/pdfer" as const;

export const OUTPUT_FILENAMES = {
  merge: "merged.pdf",
  compress: "compressed.pdf",
  imageToPdf: "converted.pdf",
  pdfToImageZip: "pdf-pages.zip",
} as const;

export type PdfImageFormat = "jpeg" | "png";

export const PDF_IMAGE_FORMATS = {
  jpeg: { label: "JPEG", description: "Smaller files, best for photos and sharing", extension: "jpg" },
  png: { label: "PNG", description: "Lossless, best for text and sharp edges", extension: "png" },
} as const;
