/**
 * Browser-only PDF page rasterization (pdfjs-dist). Import dynamically from client handlers only.
 */
import * as PDFJS from "pdfjs-dist";
import JSZip from "jszip";
import type { PdfImageFormat } from "@/lib/constants";

PDFJS.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const DEFAULT_EXPORT_SCALE = 2;
const DEFAULT_JPEG_QUALITY = 0.92;

export type PdfToImagesProgress = (current: number, total: number) => void;

/**
 * Render every PDF page to JPEG or PNG and pack into a ZIP blob.
 */
export async function exportPdfToImageZip(
  pdfBlob: Blob,
  format: PdfImageFormat,
  options?: {
    scale?: number;
    jpegQuality?: number;
    onProgress?: PdfToImagesProgress;
  }
): Promise<Blob> {
  const scale = options?.scale ?? DEFAULT_EXPORT_SCALE;
  const jpegQuality = options?.jpegQuality ?? DEFAULT_JPEG_QUALITY;
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const pdf = await PDFJS.getDocument({ data: arrayBuffer }).promise;
  const zip = new JSZip();
  const ext = format === "jpeg" ? "jpg" : "png";
  const mime = format === "jpeg" ? "image/jpeg" : "image/png";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create canvas context");

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const dataUrl =
      format === "jpeg"
        ? canvas.toDataURL(mime, jpegQuality)
        : canvas.toDataURL(mime);

    const base64 = dataUrl.split(",")[1];
    if (!base64) throw new Error(`Failed to encode page ${pageNum}`);

    zip.file(`page-${String(pageNum).padStart(3, "0")}.${ext}`, base64, {
      base64: true,
    });
    options?.onProgress?.(pageNum, pdf.numPages);
  }

  return zip.generateAsync({ type: "blob" });
}
