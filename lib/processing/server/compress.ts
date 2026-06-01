/** Browser only */

import { API_ROUTES, type QualityPreset } from "@/lib/constants";

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

  const res = await fetch(API_ROUTES.compress, { method: "POST", body: form });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error ?? "Processing failed. Please try again.");
  }

  const blob = await res.blob();
  const originalSize =
    Number(res.headers.get("X-Original-Size")) || file.size;
  const compressedSize =
    Number(res.headers.get("X-Compressed-Size")) || blob.size;

  return { blob, originalSize, compressedSize };
}
