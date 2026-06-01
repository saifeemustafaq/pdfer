/** Browser only */

import { API_ROUTES } from "@/lib/constants";
import { postFormDataBlob } from "@/lib/processing/server/fetch";

export async function buildPdfFromImagesOnServer(images: File[]): Promise<Blob> {
  const form = new FormData();
  images.forEach((file) => form.append("images", file));
  return postFormDataBlob(API_ROUTES.imageToPdf, form);
}
