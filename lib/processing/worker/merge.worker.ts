/** Browser / Worker only */

/// <reference lib="webworker" />

import { compressPdfLocal } from "../local/compress";
import { buildPdfFromImagesLocal } from "../local/image-to-pdf";
import { mergeFilesLocal } from "../local/merge";
import type { QualityPreset } from "../../constants";

type WorkerFilePayload = Array<{ bytes: ArrayBuffer; mimeType: string }>;

type WorkerRequest =
  | { type: "merge"; files: WorkerFilePayload }
  | { type: "image-to-pdf"; files: WorkerFilePayload }
  | { type: "compress"; pdf: ArrayBuffer; quality: QualityPreset };

type WorkerResponse =
  | { type: "progress"; done: number; total: number }
  | { type: "done"; pdf: ArrayBuffer }
  | { type: "error"; message: string };

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const data = event.data;

  try {
    if (data.type === "compress") {
      const pdf = await compressPdfLocal(
        new Uint8Array(data.pdf),
        data.quality,
        (done, total) => {
          const progress: WorkerResponse = { type: "progress", done, total };
          self.postMessage(progress);
        }
      );

      const response: WorkerResponse = {
        type: "done",
        pdf: pdf.buffer.slice(
          pdf.byteOffset,
          pdf.byteOffset + pdf.byteLength
        ) as ArrayBuffer,
      };
      self.postMessage(response, [response.pdf]);
      return;
    }

    const inputs = data.files.map((file) => ({
      bytes: new Uint8Array(file.bytes),
      mimeType: file.mimeType,
    }));

    const run =
      data.type === "image-to-pdf" ? buildPdfFromImagesLocal : mergeFilesLocal;

    const pdf = await run(inputs, (done, total) => {
      const progress: WorkerResponse = { type: "progress", done, total };
      self.postMessage(progress);
    });

    const response: WorkerResponse = {
      type: "done",
      pdf: pdf.buffer.slice(
        pdf.byteOffset,
        pdf.byteOffset + pdf.byteLength
      ) as ArrayBuffer,
    };
    self.postMessage(response, [response.pdf]);
  } catch (err) {
    console.error(`${data.type} worker failed:`, err);
    const message = err instanceof Error ? err.message : "Processing failed";
    const response: WorkerResponse = { type: "error", message };
    self.postMessage(response);
  }
};

export {};
