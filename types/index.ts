import type { QualityPreset } from "@/lib/constants";

export type { QualityPreset };

export type FileEntry = {
  buffer: Buffer;
  mimetype: string;
};

export type ProcessResult = {
  buffer: Buffer;
  originalSize?: number;
  compressedSize?: number;
};

export type StagedFileItem = {
  id: string;
  file: File;
};

/** Shared between the unlock service (server) and its fetch helper (client). */
export type UnlockErrorCode =
  | "PASSWORD_REQUIRED"
  | "INCORRECT_PASSWORD"
  | "INVALID_PDF"
  | "SERVICE_ERROR";
