/** Browser only */

import { API_ROUTES, type QualityPreset } from "@/lib/constants";
import { postFormData } from "@/lib/processing/server/fetch";

export type ServerCompressResult = {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
};

export async function compressPdfOnServer(
  file: File,
  quality: QualityPreset
): Promise<ServerCompressResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("quality", quality);

  const res = await postFormData(API_ROUTES.compress, form);
  const blob = await res.blob();
  const originalSize =
    Number(res.headers.get("X-Original-Size")) || file.size;
  const compressedSize =
    Number(res.headers.get("X-Compressed-Size")) || blob.size;

  return { blob, originalSize, compressedSize };
}
