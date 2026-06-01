import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  applySignaturePreset,
  detectFormFields,
  fillFormFields,
  SIGNATURE_PLACEMENT_PRESETS,
} from "./pdf-form-sign";

async function createFormPdf(): Promise<Blob> {
  const doc = await PDFDocument.create();
  doc.addPage([400, 400]);
  const form = doc.getForm();
  const field = form.createTextField("applicant.name");
  field.setText("Original");
  field.addToPage(doc.getPage(0), { x: 50, y: 300, width: 200, height: 20 });
  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

describe("detectFormFields", () => {
  it("finds text fields in a PDF form", async () => {
    const blob = await createFormPdf();
    const fields = await detectFormFields(blob);
    expect(fields.some((field) => field.name === "applicant.name")).toBe(true);
  });
});

describe("fillFormFields", () => {
  it("updates text field values", async () => {
    const blob = await createFormPdf();
    const fields = await detectFormFields(blob);
    const filled = await fillFormFields(blob, { "applicant.name": "Updated" }, fields);
    const doc = await PDFDocument.load(await filled.arrayBuffer());
    expect(doc.getForm().getTextField("applicant.name").getText()).toBe("Updated");
  });
});

describe("applySignaturePreset", () => {
  it("keeps page index while updating placement", () => {
    const next = applySignaturePreset(
      { pageIndex: 2, x: 0.1, y: 0.1, width: 0.2 },
      "bottom-center"
    );
    expect(next.pageIndex).toBe(2);
    expect(next.x).toBe(SIGNATURE_PLACEMENT_PRESETS["bottom-center"].x);
    expect(next.y).toBe(SIGNATURE_PLACEMENT_PRESETS["bottom-center"].y);
  });
});
