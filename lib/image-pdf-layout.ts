/** Shared image-to-PDF page layout math (no sharp, no DOM). */

export type ImagePdfLayoutMode = "native" | "fit-page";
export type PageSizeKey = "a4" | "letter";
export type PageOrientation = "portrait" | "landscape";
export type MarginPreset = "none" | "narrow" | "standard";

export type ImagePdfLayoutOptions = {
  mode: ImagePdfLayoutMode;
  pageSize: PageSizeKey;
  orientation: PageOrientation;
  margin: MarginPreset;
};

export const DEFAULT_IMAGE_PDF_LAYOUT: ImagePdfLayoutOptions = {
  mode: "native",
  pageSize: "a4",
  orientation: "portrait",
  margin: "narrow",
};

/** Sensible default when merging photos or receipts with PDFs. */
export const MERGE_IMAGE_LAYOUT_DEFAULT: ImagePdfLayoutOptions = {
  mode: "fit-page",
  pageSize: "a4",
  orientation: "portrait",
  margin: "narrow",
};

/** ISO A4 and US Letter sizes in PDF points (72 pt per inch). */
export const PAGE_SIZE_PT: Record<PageSizeKey, { width: number; height: number }> =
  {
    a4: { width: 595.28, height: 841.89 },
    letter: { width: 612, height: 792 },
  };

export const MARGIN_PT: Record<MarginPreset, number> = {
  none: 0,
  narrow: 18,
  standard: 36,
};

export function resolvePageDimensions(
  pageSize: PageSizeKey,
  orientation: PageOrientation
): { width: number; height: number } {
  const base = PAGE_SIZE_PT[pageSize];
  if (orientation === "landscape") {
    return { width: base.height, height: base.width };
  }
  return { width: base.width, height: base.height };
}

export type ImageDrawRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Scale image to fit inside the page minus margins (contain, no crop). */
export function computeImageDrawRect(
  pageWidth: number,
  pageHeight: number,
  imageWidth: number,
  imageHeight: number,
  marginPt: number
): ImageDrawRect {
  const innerWidth = Math.max(pageWidth - marginPt * 2, 1);
  const innerHeight = Math.max(pageHeight - marginPt * 2, 1);

  const scale = Math.min(
    innerWidth / imageWidth,
    innerHeight / imageHeight
  );

  const width = imageWidth * scale;
  const height = imageHeight * scale;
  const x = marginPt + (innerWidth - width) / 2;
  const y = marginPt + (innerHeight - height) / 2;

  return { x, y, width, height };
}

export function parseImagePdfLayoutFromForm(
  formData: FormData
): ImagePdfLayoutOptions | { error: string } {
  const modeRaw = formData.get("layoutMode");
  const mode =
    modeRaw === "fit-page"
      ? "fit-page"
      : modeRaw === "native" || modeRaw === null
        ? "native"
        : null;
  if (!mode) {
    return { error: "Invalid layout mode." };
  }

  const pageSizeRaw = formData.get("pageSize");
  const pageSize =
    pageSizeRaw === "letter"
      ? "letter"
      : pageSizeRaw === "a4" || pageSizeRaw === null
        ? "a4"
        : null;
  if (!pageSize) {
    return { error: "Invalid page size." };
  }

  const orientationRaw = formData.get("orientation");
  const orientation =
    orientationRaw === "landscape"
      ? "landscape"
      : orientationRaw === "portrait" || orientationRaw === null
        ? "portrait"
        : null;
  if (!orientation) {
    return { error: "Invalid orientation." };
  }

  const marginRaw = formData.get("margin");
  const margin =
    marginRaw === "none"
      ? "none"
      : marginRaw === "standard"
        ? "standard"
        : marginRaw === "narrow" || marginRaw === null
          ? "narrow"
          : null;
  if (!margin) {
    return { error: "Invalid margin." };
  }

  return {
    mode,
    pageSize,
    orientation,
    margin,
  };
}
