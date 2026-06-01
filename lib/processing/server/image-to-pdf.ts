/** Browser only */

import { API_ROUTES } from "@/lib/constants";
import type { ImagePdfLayoutOptions } from "@/lib/image-pdf-layout";
import { postFormDataBlob } from "@/lib/processing/server/fetch";

export async function buildPdfFromImagesOnServer(
  images: File[],
  layout: ImagePdfLayoutOptions
): Promise<Blob> {
  const form = new FormData();
  images.forEach((file) => form.append("images", file));
  form.append("layoutMode", layout.mode);
  form.append("pageSize", layout.pageSize);
  form.append("orientation", layout.orientation);
  form.append("margin", layout.margin);
  return postFormDataBlob(API_ROUTES.imageToPdf, form);
}
