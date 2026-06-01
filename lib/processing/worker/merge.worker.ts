/** Browser / Worker only */

/// <reference lib="webworker" />

import { compressPdfLocal } from "../local/compress";
import { buildPdfFromImagesLocal } from "../local/image-to-pdf";
import { mergeFilesLocal } from "../local/merge";
import type { QualityPreset } from "../../constants";
import {
  DEFAULT_IMAGE_PDF_LAYOUT,
  type ImagePdfLayoutOptions,
} from "../../image-pdf-layout";

type WorkerFilePayload = Array<{ bytes: ArrayBuffer; mimeType: string }>;

type WorkerRequest =
  | { type: "merge"; files: WorkerFilePayload; layout?: ImagePdfLayoutOptions }
  | {
      type: "image-to-pdf";
      files: WorkerFilePayload;
      layout?: ImagePdfLayoutOptions;
    }
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

    if (data.type === "image-to-pdf") {
      const layout = data.layout ?? DEFAULT_IMAGE_PDF_LAYOUT;
      const pdf = await buildPdfFromImagesLocal(
        inputs,
        layout,
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

    const mergeLayout = data.layout ?? DEFAULT_IMAGE_PDF_LAYOUT;
    const pdf = await mergeFilesLocal(inputs, mergeLayout, (done, total) => {
      const progress: WorkerResponse = { type: "progress", done, total };
      self.postMessage(progress);
    });

    const doneResponse: WorkerResponse = {
      type: "done",
      pdf: pdf.buffer.slice(
        pdf.byteOffset,
        pdf.byteOffset + pdf.byteLength
      ) as ArrayBuffer,
    };
    self.postMessage(doneResponse, [doneResponse.pdf]);
  } catch (err) {
    console.error(`${data.type} worker failed:`, err);
    const message = err instanceof Error ? err.message : "Processing failed";
    const response: WorkerResponse = { type: "error", message };
    self.postMessage(response);
  }
};

export {};
