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
