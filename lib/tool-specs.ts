import {
  Combine,
  Minimize2,
  Images,
  FileImage,
  LayoutGrid,
  Scissors,
  LockKeyhole,
  type LucideIcon,
} from "lucide-react";
import { TOOL_ROUTES } from "@/lib/constants";

/**
 * How a tool accepts input, along the two axes that matter to users:
 * how many files, and how many distinct formats.
 */
export type AcceptanceKind =
  | "single-file"
  | "single-file-multi-format"
  | "multi-file-single-format"
  | "multi-file-multi-format";

export const ACCEPTANCE_LABELS: Record<AcceptanceKind, string> = {
  "single-file": "Single file · one format",
  "single-file-multi-format": "Single file · multiple formats",
  "multi-file-single-format": "Multiple files · one format",
  "multi-file-multi-format": "Multiple files · multiple formats",
};

export function isMultiFile(kind: AcceptanceKind): boolean {
  return kind === "multi-file-single-format" || kind === "multi-file-multi-format";
}

export type ToolSpec = {
  /** Stable key, matches the keys in TOOL_ROUTES. */
  key: keyof typeof TOOL_ROUTES;
  route: string;
  label: string;
  icon: LucideIcon;
  acceptance: AcceptanceKind;
  /** Accepted input formats, shown as chips. */
  formats: string[];
  /** Plain-language description of what the input must be. */
  inputSummary: string;
  /** What the tool hands back. */
  output: string;
  /** Optional extra constraint (size, encryption, processing location). */
  note?: string;
};

export const TOOL_SPECS: Record<
  Exclude<keyof typeof TOOL_ROUTES, "convert" | "docs">,
  ToolSpec
> = {
  merge: {
    key: "merge",
    route: TOOL_ROUTES.merge,
    label: "Merge PDFs",
    icon: Combine,
    acceptance: "multi-file-multi-format",
    formats: ["PDF", "JPEG", "PNG", "WebP", "HEIC/HEIF"],
    inputSummary:
      "Two or more files — PDFs and images, in any mix you like.",
    output: "One merged PDF.",
    note: "Reorder files (or individual pages) before downloading. Large jobs run on your device.",
  },
  split: {
    key: "split",
    route: TOOL_ROUTES.split,
    label: "Split PDF",
    icon: Scissors,
    acceptance: "single-file",
    formats: ["PDF"],
    inputSummary:
      "Exactly one PDF. Password-protected PDFs aren't supported — unlock it first.",
    output: "One PDF, or a ZIP when you split into several files.",
    note: "Runs entirely on your device.",
  },
  compress: {
    key: "compress",
    route: TOOL_ROUTES.compress,
    label: "Compress PDF",
    icon: Minimize2,
    acceptance: "single-file",
    formats: ["PDF"],
    inputSummary: "Exactly one PDF.",
    output: "One compressed PDF.",
    note: "Choose a quality preset. Large jobs run on your device.",
  },
  editPdf: {
    key: "editPdf",
    route: TOOL_ROUTES.editPdf,
    label: "Edit PDF",
    icon: LayoutGrid,
    acceptance: "single-file",
    formats: ["PDF"],
    inputSummary:
      "Exactly one PDF. Password-protected PDFs aren't supported — unlock it first.",
    output: "One edited PDF.",
    note: "Reorder pages, watermark, fill forms, or sign. Runs on your device.",
  },
  imageToPdf: {
    key: "imageToPdf",
    route: TOOL_ROUTES.imageToPdf,
    label: "Image to PDF",
    icon: Images,
    acceptance: "multi-file-multi-format",
    formats: ["JPEG", "PNG", "WebP", "HEIC/HEIF"],
    inputSummary:
      "One or more images. Paste, snap a photo, or pick from your library.",
    output: "One PDF — each image becomes a page.",
    note: "PDFs aren't accepted here; use Merge to combine PDFs.",
  },
  pdfToImage: {
    key: "pdfToImage",
    route: TOOL_ROUTES.pdfToImage,
    label: "PDF to image",
    icon: FileImage,
    acceptance: "single-file",
    formats: ["PDF"],
    inputSummary: "Exactly one PDF.",
    output: "A ZIP of images (JPEG or PNG), one per page.",
    note: "Runs in your browser; the PDF is never uploaded.",
  },
  unlock: {
    key: "unlock",
    route: TOOL_ROUTES.unlock,
    label: "Unlock PDF",
    icon: LockKeyhole,
    acceptance: "single-file",
    formats: ["PDF (password-protected)"],
    inputSummary: "Exactly one password-protected PDF that you own.",
    output: "One unlocked PDF.",
    note: "Runs on the server (up to 6 MB). The password is used once and never stored.",
  },
};

/** Specs in sidebar/nav order, for listings like the Docs page. */
export const TOOL_SPEC_LIST: ToolSpec[] = [
  TOOL_SPECS.merge,
  TOOL_SPECS.split,
  TOOL_SPECS.compress,
  TOOL_SPECS.editPdf,
  TOOL_SPECS.imageToPdf,
  TOOL_SPECS.pdfToImage,
  TOOL_SPECS.unlock,
];
