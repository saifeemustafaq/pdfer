/** Shared types for the hybrid processing pipeline. */

export type ProcessingMode = "local" | "server";

/** Runtime mode shown in tool UI after routing or completion. */
export type ProcessingInfo = {
  mode: ProcessingMode;
  reason: string;
};

export type ProcessingOperation =
  | "merge"
  | "compress"
  | "image-to-pdf"
  | "pdf-to-image"
  | "merge-page-edit"
  | "split"
  | "unlock";

export type RoutingContext = {
  operation: ProcessingOperation;
  totalBytes: number;
  fileCount: number;
  mimeTypes: string[];
  isMobile: boolean;
  deviceMemoryGb?: number;
  pageCount?: number;
};

export type RoutingDecision = {
  mode: ProcessingMode;
  reason: string;
  /** False when total size exceeds the Netlify upload cap. */
  serverEligible: boolean;
};

export type MergeResult = {
  pdf: Uint8Array;
  mode: ProcessingMode;
  reason: string;
};

export type ImageToPdfResult = {
  pdf: Uint8Array;
  mode: ProcessingMode;
  reason: string;
};

export type CompressResult = {
  pdf: Uint8Array;
  mode: ProcessingMode;
  reason: string;
  originalSize: number;
  compressedSize: number;
};

export type FileSummary = {
  totalBytes: number;
  mimeTypes: string[];
  fileCount: number;
};

export type PdfPreflight = {
  pageCount?: number;
  encrypted?: boolean;
};
