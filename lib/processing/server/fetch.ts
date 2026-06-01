/** Browser-only fetch helpers for POST /api/* routes. */

const DEFAULT_ERROR = "Processing failed. Please try again.";

export async function postFormData(
  url: string,
  form: FormData,
  defaultError = DEFAULT_ERROR
): Promise<Response> {
  const res = await fetch(url, { method: "POST", body: form });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(
      typeof body.error === "string" ? body.error : defaultError
    );
  }

  return res;
}

export async function postFormDataBlob(
  url: string,
  form: FormData,
  defaultError = DEFAULT_ERROR
): Promise<Blob> {
  const res = await postFormData(url, form, defaultError);
  return res.blob();
}
