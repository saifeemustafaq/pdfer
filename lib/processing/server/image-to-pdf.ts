/** Browser only */

import { API_ROUTES } from "@/lib/constants";

export async function buildPdfFromImagesOnServer(images: File[]): Promise<Blob> {
  const form = new FormData();
  images.forEach((file) => form.append("images", file));

  const res = await fetch(API_ROUTES.imageToPdf, { method: "POST", body: form });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error ?? "Processing failed. Please try again.");
  }

  return res.blob();
}
