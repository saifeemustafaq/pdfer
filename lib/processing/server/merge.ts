/** Browser only */

import { API_ROUTES } from "@/lib/constants";

export async function mergeFilesOnServer(files: File[]): Promise<Blob> {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));

  const res = await fetch(API_ROUTES.merge, { method: "POST", body: form });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error ?? "Processing failed. Please try again.");
  }

  return res.blob();
}
