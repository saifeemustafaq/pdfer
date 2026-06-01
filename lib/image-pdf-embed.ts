import {
  PDFDocument,
  type PDFDocument as PDFDocumentType,
  type PDFPage,
} from "pdf-lib";
import {
  computeImageDrawRect,
  MARGIN_PT,
  resolvePageDimensions,
  type ImagePdfLayoutOptions,
} from "@/lib/image-pdf-layout";

type EmbedImageInput = {
  data: Uint8Array;
  width: number;
  height: number;
};

export async function embedImageOnPdfPage(
  doc: PDFDocumentType,
  { data, width, height }: EmbedImageInput,
  layout: ImagePdfLayoutOptions
): Promise<PDFPage> {
  const embedded = await doc.embedJpg(data);

  if (layout.mode === "native") {
    const page = doc.addPage([width, height]);
    page.drawImage(embedded, { x: 0, y: 0, width, height });
    return page;
  }

  const { width: pageWidth, height: pageHeight } = resolvePageDimensions(
    layout.pageSize,
    layout.orientation
  );
  const marginPt = MARGIN_PT[layout.margin];
  const rect = computeImageDrawRect(
    pageWidth,
    pageHeight,
    width,
    height,
    marginPt
  );
  const page = doc.addPage([pageWidth, pageHeight]);
  page.drawImage(embedded, rect);
  return page;
}

export async function buildPdfFromNormalizedImages(
  images: EmbedImageInput[],
  layout: ImagePdfLayoutOptions
): Promise<Uint8Array> {
  const output = await PDFDocument.create();

  for (const image of images) {
    await embedImageOnPdfPage(output, image, layout);
  }

  return output.save();
}
