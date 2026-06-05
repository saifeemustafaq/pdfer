/** Browser-only fetch helper for POST /api/unlock. */
import { API_ROUTES } from "@/lib/constants";
import type { UnlockErrorCode } from "@/types";

/** Carries the server's error code so the UI can react (e.g. focus password). */
export class UnlockClientError extends Error {
  readonly code?: UnlockErrorCode;

  constructor(message: string, code?: UnlockErrorCode) {
    super(message);
    this.name = "UnlockClientError";
    this.code = code;
  }
}

export function isPasswordError(err: unknown): boolean {
  return (
    err instanceof UnlockClientError &&
    (err.code === "PASSWORD_REQUIRED" || err.code === "INCORRECT_PASSWORD")
  );
}

export async function unlockPdfOnServer(
  file: File,
  password: string
): Promise<Blob> {
  const form = new FormData();
  form.append("file", file);
  form.append("password", password);
  form.append("attestation", "true");

  const res = await fetch(API_ROUTES.unlock, { method: "POST", body: form });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: UnlockErrorCode;
    };
    throw new UnlockClientError(
      body.error ?? "Could not unlock this PDF.",
      body.code
    );
  }

  return res.blob();
}
