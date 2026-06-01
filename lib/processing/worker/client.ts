/** Browser only */

import type { QualityPreset } from "@/lib/constants";

const WORKER_URL = "/workers/merge.worker.mjs";
const WORKER_TIMEOUT_MS = 120_000;

type FileWorkerJobType = "merge" | "image-to-pdf";

type FileWorkerRequest = {
  type: FileWorkerJobType;
  files: Array<{ bytes: ArrayBuffer; mimeType: string }>;
};

type CompressWorkerRequest = {
  type: "compress";
  pdf: ArrayBuffer;
  quality: QualityPreset;
};

type WorkerRequest = FileWorkerRequest | CompressWorkerRequest;

type WorkerResponse =
  | { type: "progress"; done: number; total: number }
  | { type: "done"; pdf: ArrayBuffer }
  | { type: "error"; message: string };

export type WorkerJobProgress = (done: number, total: number) => void;

function runWorkerRequest(
  request: WorkerRequest,
  onProgress?: WorkerJobProgress
): Promise<Uint8Array> {
  const worker = new Worker(WORKER_URL, { type: "module" });

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      worker.terminate();
      reject(new Error("Processing timed out after 120 seconds"));
    }, WORKER_TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data;

      if (data.type === "progress") {
        onProgress?.(data.done, data.total);
        return;
      }

      window.clearTimeout(timeoutId);
      worker.terminate();

      if (data.type === "done") {
        resolve(new Uint8Array(data.pdf));
        return;
      }

      reject(new Error(data.message));
    };

    worker.onerror = (err) => {
      window.clearTimeout(timeoutId);
      worker.terminate();
      console.error("processing worker error:", err);
      reject(err);
    };

    worker.postMessage(request);
  });
}

async function runFileJobInWorker(
  type: FileWorkerJobType,
  files: File[],
  onProgress?: WorkerJobProgress
): Promise<Uint8Array> {
  const filePayload = await Promise.all(
    files.map(async (file) => ({
      bytes: await file.arrayBuffer(),
      mimeType: file.type || "application/octet-stream",
    }))
  );

  return runWorkerRequest({ type, files: filePayload }, onProgress);
}

export function runMergeInWorker(
  files: File[],
  onProgress?: WorkerJobProgress
): Promise<Uint8Array> {
  return runFileJobInWorker("merge", files, onProgress);
}

export function runImageToPdfInWorker(
  files: File[],
  onProgress?: WorkerJobProgress
): Promise<Uint8Array> {
  return runFileJobInWorker("image-to-pdf", files, onProgress);
}

export async function runCompressInWorker(
  file: File,
  quality: QualityPreset,
  onProgress?: WorkerJobProgress
): Promise<Uint8Array> {
  const pdf = await file.arrayBuffer();
  return runWorkerRequest({ type: "compress", pdf, quality }, onProgress);
}
