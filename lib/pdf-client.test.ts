import { describe, expect, it } from "vitest";
import { exportEditedPdf } from "./pdf-client";

describe("exportEditedPdf", () => {
  it("applies rotation metadata when specified", async () => {
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    doc.addPage([200, 300]);
    const bytes = await doc.save();

    const blob = await exportEditedPdf(
      new Blob([bytes], { type: "application/pdf" }),
      {
        pageIndicesInOrder: [0],
        rotations: { 0: 90 },
      }
    );

    const out = await PDFDocument.load(await blob.arrayBuffer());
    expect(out.getPageCount()).toBe(1);
    expect(out.getPage(0).getRotation().angle).toBe(90);
  });

  it("reorders pages in the output document", async () => {
    const { PDFDocument, rgb } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    const pageA = doc.addPage([100, 100]);
    pageA.drawText("A", { x: 10, y: 50, size: 12, color: rgb(0, 0, 0) });
    doc.addPage([100, 100]);
    const bytes = await doc.save();

    const blob = await exportEditedPdf(
      new Blob([bytes], { type: "application/pdf" }),
      { pageIndicesInOrder: [1, 0] }
    );

    const out = await PDFDocument.load(await blob.arrayBuffer());
    expect(out.getPageCount()).toBe(2);
  });
});
