import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  applySignaturePreset,
  applySignatures,
  clampSignaturePosition,
  detectFormFields,
  fillFormFields,
  getSignedPageIndices,
  getPlacementForPage,
  setActivePlacement,
  SIGNATURE_PLACEMENT_PRESETS,
  type SignatureSpec,
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

async function createMultiPagePdf(pages: number): Promise<Blob> {
  const doc = await PDFDocument.create();
  for (let index = 0; index < pages; index++) {
    doc.addPage([400, 400]);
  }
  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

async function createTinyPng(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([100, 100]);
  const bytes = await doc.save();
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  void blob;
  // Minimal valid 1x1 PNG
  return Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
    0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
    0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44,
    0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d,
    0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
    0x60, 0x82,
  ]);
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
  it("updates x/y/width from preset", () => {
    const next = applySignaturePreset(
      { x: 0.1, y: 0.1, width: 0.2 },
      "bottom-center"
    );
    expect(next.x).toBe(SIGNATURE_PLACEMENT_PRESETS["bottom-center"].x);
    expect(next.y).toBe(SIGNATURE_PLACEMENT_PRESETS["bottom-center"].y);
  });
});

describe("getSignedPageIndices", () => {
  const base: SignatureSpec = {
    pageScope: "all",
    selectedPages: [0],
    perPagePlacement: false,
    placement: { x: 0.1, y: 0.1, width: 0.3 },
    pagePlacements: {},
    activePageIndex: 0,
  };

  it("returns every page for all scope", () => {
    expect(getSignedPageIndices(base, 3)).toEqual([0, 1, 2]);
  });

  it("returns inclusive range for range scope", () => {
    expect(
      getSignedPageIndices(
        { ...base, pageScope: "range", rangeStart: 2, rangeEnd: 3 },
        4
      )
    ).toEqual([1, 2]);
  });

  it("returns selected pages only", () => {
    expect(
      getSignedPageIndices(
        { ...base, pageScope: "selected", selectedPages: [0, 2] },
        3
      )
    ).toEqual([0, 2]);
  });
});

describe("clampSignaturePosition", () => {
  it("keeps signature inside page bounds", () => {
    const clamped = clampSignaturePosition(
      { x: 0.95, y: 0.95, width: 0.5 },
      0.5,
      1
    );
    expect(clamped.x).toBeLessThanOrEqual(0.5);
    expect(clamped.y).toBeLessThanOrEqual(1 - clamped.width * 0.5);
  });
});

describe("per-page placement", () => {
  it("stores active page override when perPagePlacement is enabled", () => {
    const spec: SignatureSpec = {
      pageScope: "selected",
      selectedPages: [0, 1],
      perPagePlacement: true,
      placement: { x: 0.1, y: 0.1, width: 0.3 },
      pagePlacements: {},
      activePageIndex: 1,
    };
    const next = setActivePlacement(spec, { x: 0.5, y: 0.2, width: 0.25 });
    expect(getPlacementForPage(next, 1)).toEqual({ x: 0.5, y: 0.2, width: 0.25 });
    expect(getPlacementForPage(next, 0)).toEqual(spec.placement);
  });
});

describe("applySignatures", () => {
  it("draws on multiple selected pages", async () => {
    const pdf = await createMultiPagePdf(3);
    const png = await createTinyPng();
    const spec: SignatureSpec = {
      pageScope: "selected",
      selectedPages: [0, 2],
      perPagePlacement: false,
      placement: { x: 0.1, y: 0.1, width: 0.2 },
      pagePlacements: {},
      activePageIndex: 0,
    };

    const signed = await applySignatures(pdf, png, spec);
    expect(signed.size).toBeGreaterThan(pdf.size);
  });
});
