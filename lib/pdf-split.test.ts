import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  extractPageRange,
  extractPages,
  pageNumbersToRange,
  previewSplitEveryN,
  splitEveryN,
} from "./pdf-split";

async function createTestPdf(pageCount: number): Promise<Blob> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([200, 200]);
    page.drawText(`Page ${i + 1}`, { x: 50, y: 100, size: 12 });
  }
  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

describe("pageNumbersToRange", () => {
  it("converts 1-based page numbers to zero-based indices", () => {
    expect(pageNumbersToRange(3, 7, 10)).toEqual({ start: 2, end: 6 });
  });

  it("throws when end page exceeds document length", () => {
    expect(() => pageNumbersToRange(1, 5, 4)).toThrow(/exceeds document length/);
  });
});

describe("previewSplitEveryN", () => {
  it("computes file count and last file size", () => {
    expect(previewSplitEveryN(12, 4)).toEqual({
      fileCount: 3,
      lastFilePages: 4,
    });
    expect(previewSplitEveryN(10, 4)).toEqual({
      fileCount: 3,
      lastFilePages: 2,
    });
  });
});

describe("splitEveryN", () => {
  it("splits a PDF into equal chunks", async () => {
    const blob = await createTestPdf(5);
    const parts = await splitEveryN(blob, 2);
    expect(parts).toHaveLength(3);

    for (const part of parts) {
      const doc = await PDFDocument.load(await part.arrayBuffer());
      expect(doc.getPageCount()).toBeGreaterThan(0);
    }
  });
});

describe("extractPages", () => {
  it("extracts selected zero-based indices", async () => {
    const blob = await createTestPdf(4);
    const extracted = await extractPages(blob, [0, 2]);
    const doc = await PDFDocument.load(await extracted.arrayBuffer());
    expect(doc.getPageCount()).toBe(2);
  });
});

describe("extractPageRange", () => {
  it("extracts a contiguous range", async () => {
    const blob = await createTestPdf(6);
    const range = pageNumbersToRange(2, 4, 6);
    const extracted = await extractPageRange(blob, range);
    const doc = await PDFDocument.load(await extracted.arrayBuffer());
    expect(doc.getPageCount()).toBe(3);
  });
});
