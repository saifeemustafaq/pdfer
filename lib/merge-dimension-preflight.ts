import { PDFDocument } from "pdf-lib";

export type PageDimension = { width: number; height: number };

/** Canonical size key; orientation-independent (595x842 === 842x595). */
export function dimensionKey(width: number, height: number): string {
  const w = Math.round(width);
  const h = Math.round(height);
  return `${Math.min(w, h)}x${Math.max(w, h)}`;
}

export function hasUnevenPageDimensions(dimensions: PageDimension[]): boolean {
  if (dimensions.length <= 1) return false;
  const keys = new Set(dimensions.map((d) => dimensionKey(d.width, d.height)));
  return keys.size > 1;
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf";
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

async function readImageDimensions(file: File): Promise<PageDimension> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";

  if (
    mime === "image/heic" ||
    mime === "image/heif" ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name)
  ) {
    const { normalizeImageForEmbed } = await import(
      "@/lib/processing/local/image-normalize"
    );
    const normalized = await normalizeImageForEmbed(bytes, mime);
    return { width: normalized.width, height: normalized.height };
  }

  const blob = new Blob([bytes], {
    type: mime.startsWith("image/") ? mime : "image/jpeg",
  });
  const bitmap = await createImageBitmap(blob);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

async function readPdfPageDimensions(file: File): Promise<PageDimension[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => page.getSize());
}

/** Page sizes each staged file would contribute in native (non fit-page) merge. */
export async function collectMergeSourceDimensions(
  files: File[]
): Promise<PageDimension[]> {
  const dimensions: PageDimension[] = [];

  for (const file of files) {
    if (isPdfFile(file)) {
      try {
        dimensions.push(...(await readPdfPageDimensions(file)));
      } catch (err) {
        console.error("collectMergeSourceDimensions pdf failed:", err);
      }
    } else if (isImageFile(file)) {
      try {
        dimensions.push(await readImageDimensions(file));
      } catch (err) {
        console.error("collectMergeSourceDimensions image failed:", err);
      }
    }
  }

  return dimensions;
}
