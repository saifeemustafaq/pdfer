import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { applyTextWatermark, DEFAULT_WATERMARK_SPEC, computeWatermarkLayout } from "./pdf-watermark";

async function createTestPdf(pageCount: number): Promise<Blob> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([300, 400]);
  }
  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

describe("applyTextWatermark", () => {
  it("keeps page count unchanged", async () => {
    const blob = await createTestPdf(3);
    const result = await applyTextWatermark(blob, DEFAULT_WATERMARK_SPEC);
    const doc = await PDFDocument.load(await result.arrayBuffer());
    expect(doc.getPageCount()).toBe(3);
  });

  it("throws when text is empty", async () => {
    const blob = await createTestPdf(1);
    await expect(
      applyTextWatermark(blob, { ...DEFAULT_WATERMARK_SPEC, text: "   " })
    ).rejects.toThrow(/Watermark text is required/);
  });
});

describe("computeWatermarkLayout", () => {
  it("centers diagonal text on the page", () => {
    const layout = computeWatermarkLayout(600, 800, 120, {
      ...DEFAULT_WATERMARK_SPEC,
      position: "diagonal",
      rotationDegrees: 45,
    });
    expect(layout.x).toBeGreaterThan(200);
    expect(layout.x).toBeLessThan(400);
    expect(layout.y).toBeGreaterThan(300);
    expect(layout.y).toBeLessThan(500);
  });
});
