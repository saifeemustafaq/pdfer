/** Browser-only fetch helper for POST /api/unlock. */
import { API_ROUTES } from "@/lib/constants";
import { postFormDataBlob } from "@/lib/processing/server/fetch";

export async function unlockPdfOnServer(
  file: File,
  password: string
): Promise<Blob> {
  const form = new FormData();
  form.append("file", file);
  form.append("password", password);
  form.append("attestation", "true");
  return postFormDataBlob(
    API_ROUTES.unlock,
    form,
    "Could not unlock this PDF."
  );
}
