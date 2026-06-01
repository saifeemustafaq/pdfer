/** Browser only */

import { API_ROUTES } from "@/lib/constants";
import type { ImagePdfLayoutOptions } from "@/lib/image-pdf-layout";
import { postFormDataBlob } from "@/lib/processing/server/fetch";

export async function mergeFilesOnServer(
  files: File[],
  imageLayout: ImagePdfLayoutOptions
): Promise<Blob> {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  form.append("layoutMode", imageLayout.mode);
  form.append("pageSize", imageLayout.pageSize);
  form.append("orientation", imageLayout.orientation);
  form.append("margin", imageLayout.margin);
  return postFormDataBlob(API_ROUTES.merge, form);
}
