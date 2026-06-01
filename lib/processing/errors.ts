/** Typed error when local processing fails. Used for server fallback UX. */

export class LocalProcessingError extends Error {
  readonly canFallbackToServer: boolean;

  constructor(message: string, canFallbackToServer: boolean) {
    super(message);
    this.name = "LocalProcessingError";
    this.canFallbackToServer = canFallbackToServer;
  }
}

/** Typed error when server processing fails. Used for local fallback UX. */
export class ServerProcessingError extends Error {
  readonly canFallbackToLocal: boolean;

  constructor(message: string, canFallbackToLocal: boolean) {
    super(message);
    this.name = "ServerProcessingError";
    this.canFallbackToLocal = canFallbackToLocal;
  }
}

export type ProcessingFallbackVariant =
  | "try-server"
  | "try-local"
  | "split-files";

export function isLocalProcessingError(
  err: unknown
): err is LocalProcessingError {
  return err instanceof LocalProcessingError;
}

export function isServerProcessingError(
  err: unknown
): err is ServerProcessingError {
  return err instanceof ServerProcessingError;
}

export function isOomError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  return (
    message.includes("out of memory") ||
    message.includes("allocation failed") ||
    message.includes("oom")
  );
}

/** Map a processing error to an actionable fallback variant, if any. */
export function getFallbackVariant(
  err: unknown
): ProcessingFallbackVariant | null {
  if (isLocalProcessingError(err)) {
    return err.canFallbackToServer ? "try-server" : "split-files";
  }

  if (isServerProcessingError(err)) {
    return err.canFallbackToLocal ? "try-local" : null;
  }

  return null;
}

/** User-facing toast message when no fallback UI is shown. */
export function getProcessingErrorMessage(err: unknown): string {
  if (isLocalProcessingError(err)) {
    return err.canFallbackToServer
      ? "Processing on your device failed. Try on the server?"
      : "This file is too large for your browser. Try fewer or smaller files.";
  }

  if (isServerProcessingError(err)) {
    return err.canFallbackToLocal
      ? "Server processing failed. Try on your device?"
      : "Processing failed. Please try again.";
  }

  if (err instanceof Error && err.message) {
    return err.message;
  }

  return "Processing failed. Please try again.";
}
