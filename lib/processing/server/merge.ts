/** Browser only */

import { API_ROUTES } from "@/lib/constants";
import { postFormDataBlob } from "@/lib/processing/server/fetch";

export async function mergeFilesOnServer(files: File[]): Promise<Blob> {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  return postFormDataBlob(API_ROUTES.merge, form);
}
