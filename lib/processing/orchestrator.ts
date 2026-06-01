/** Browser only */

import {
  MAX_SERVER_UPLOAD_BYTES,
  type QualityPreset,
} from "@/lib/constants";
import { getDeviceHints } from "./device-context";
import {
  LocalProcessingError,
  ServerProcessingError,
} from "./errors";
import { compressPdfLocal } from "./local/compress";
import { buildPdfFromImagesLocal } from "./local/image-to-pdf";
import { mergeFilesLocal } from "./local/merge";
import { buildRoutingContext, decide } from "./router";
import { compressPdfOnServer } from "./server/compress";
import { buildPdfFromImagesOnServer } from "./server/image-to-pdf";
import { mergeFilesOnServer } from "./server/merge";
import type { ProcessingMode, RoutingDecision } from "./types";
import {
  runCompressInWorker,
  runImageToPdfInWorker,
  runMergeInWorker,
  type WorkerJobProgress,
} from "./worker/client";

export type ProcessOutput = {
  blob: Blob;
  mode: ProcessingMode;
  reason: string;
};

export type CompressProcessOutput = ProcessOutput & {
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
};

export type ProcessForceOptions = {
  forceMode?: ProcessingMode;
};

function resolveDecision(
  context: ReturnType<typeof buildRoutingContext>,
  options?: ProcessForceOptions
): RoutingDecision {
  if (options?.forceMode === "local") {
    return {
      mode: "local",
      reason: "Retrying on your device",
      serverEligible: context.totalBytes <= MAX_SERVER_UPLOAD_BYTES,
    };
  }

  if (options?.forceMode === "server") {
    if (context.totalBytes > MAX_SERVER_UPLOAD_BYTES) {
      throw new Error("File too large for server processing");
    }
    return {
      mode: "server",
      reason: "Retrying on the server",
      serverEligible: true,
    };
  }

  return decide(context);
}

function wrapLocalError(err: unknown, totalBytes: number): never {
  console.error("local processing failed:", err);
  const message =
    err instanceof Error ? err.message : "Processing failed. Please try again.";
  const canFallback = totalBytes <= MAX_SERVER_UPLOAD_BYTES;
  throw new LocalProcessingError(message, canFallback);
}

function wrapServerError(err: unknown, totalBytes: number): never {
  console.error("server processing failed:", err);
  const message =
    err instanceof Error ? err.message : "Processing failed. Please try again.";
  const canFallback = totalBytes <= MAX_SERVER_UPLOAD_BYTES;
  throw new ServerProcessingError(message, canFallback);
}

async function runLocalMerge(
  files: File[],
  onProgress?: WorkerJobProgress
): Promise<Blob> {
  const pdf = await runMergeInWorker(files, onProgress);
  return new Blob([new Uint8Array(pdf)], { type: "application/pdf" });
}

async function runLocalImageToPdf(
  files: File[],
  onProgress?: WorkerJobProgress
): Promise<Blob> {
  const pdf = await runImageToPdfInWorker(files, onProgress);
  return new Blob([new Uint8Array(pdf)], { type: "application/pdf" });
}

async function runLocalCompress(
  file: File,
  quality: QualityPreset,
  onProgress?: WorkerJobProgress
): Promise<Blob> {
  const pdf = await runCompressInWorker(file, quality, onProgress);
  return new Blob([new Uint8Array(pdf)], { type: "application/pdf" });
}

function toSavingsPercent(originalSize: number, compressedSize: number): number {
  if (originalSize <= 0) return 0;
  return Math.round((1 - compressedSize / originalSize) * 100);
}

/** Merge PDFs and images via local worker or server API. */
export async function processMerge(
  files: File[],
  onProgress?: WorkerJobProgress,
  options?: ProcessForceOptions
): Promise<ProcessOutput> {
  const context = buildRoutingContext("merge", files, getDeviceHints());
  const decision = resolveDecision(context, options);

  if (decision.mode === "server") {
    try {
      const blob = await mergeFilesOnServer(files);
      return { blob, mode: "server", reason: decision.reason };
    } catch (err) {
      if (err instanceof ServerProcessingError) throw err;
      wrapServerError(err, context.totalBytes);
    }
  }

  try {
    const blob = await runLocalMerge(files, onProgress);
    return { blob, mode: "local", reason: decision.reason };
  } catch (err) {
    if (err instanceof LocalProcessingError) throw err;
    wrapLocalError(err, context.totalBytes);
  }
}

/** Convert images to PDF via local worker or server API. */
export async function processImageToPdf(
  files: File[],
  onProgress?: WorkerJobProgress,
  options?: ProcessForceOptions
): Promise<ProcessOutput> {
  const context = buildRoutingContext("image-to-pdf", files, getDeviceHints());
  const decision = resolveDecision(context, options);

  if (decision.mode === "server") {
    try {
      const blob = await buildPdfFromImagesOnServer(files);
      return { blob, mode: "server", reason: decision.reason };
    } catch (err) {
      if (err instanceof ServerProcessingError) throw err;
      wrapServerError(err, context.totalBytes);
    }
  }

  try {
    const blob = await runLocalImageToPdf(files, onProgress);
    return { blob, mode: "local", reason: decision.reason };
  } catch (err) {
    if (err instanceof LocalProcessingError) throw err;
    wrapLocalError(err, context.totalBytes);
  }
}

/** Compress a PDF via local worker or server API. */
export async function processCompress(
  file: File,
  quality: QualityPreset,
  onProgress?: WorkerJobProgress,
  options?: ProcessForceOptions
): Promise<CompressProcessOutput> {
  const context = buildRoutingContext("compress", [file], getDeviceHints());
  const decision = resolveDecision(context, options);

  if (decision.mode === "server") {
    try {
      const result = await compressPdfOnServer(file, quality);
      return {
        blob: result.blob,
        mode: "server",
        reason: decision.reason,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        savingsPercent: toSavingsPercent(
          result.originalSize,
          result.compressedSize
        ),
      };
    } catch (err) {
      if (err instanceof ServerProcessingError) throw err;
      wrapServerError(err, context.totalBytes);
    }
  }

  try {
    const blob = await runLocalCompress(file, quality, onProgress);
    const compressedSize = blob.size;
    return {
      blob,
      mode: "local",
      reason: decision.reason,
      originalSize: file.size,
      compressedSize,
      savingsPercent: toSavingsPercent(file.size, compressedSize),
    };
  } catch (err) {
    if (err instanceof LocalProcessingError) throw err;
    wrapLocalError(err, context.totalBytes);
  }
}

/** Exposed for tests and dev tooling. */
export { mergeFilesLocal, buildPdfFromImagesLocal, compressPdfLocal };
