import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  applyAnnotations,
  clampAnnotationBox,
  countOnPage,
  createAnnotation,
  deleteAnnotation,
  fontVariant,
  hexToRgb,
  pageHasSignature,
  removeSignaturesOnPage,
  updateAnnotation,
  wrapText,
  type Annotation,
  type TextAnnotation,
} from "./pdf-annotations";

async function createMultiPagePdf(pages: number): Promise<Blob> {
  const doc = await PDFDocument.create();
  for (let index = 0; index < pages; index++) {
    doc.addPage([400, 500]);
  }
  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

/** Minimal valid 1x1 PNG. */
function tinyPng(): Uint8Array {
  return Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
    0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
    0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44,
    0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d,
    0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
    0x60, 0x82,
  ]);
}

describe("hexToRgb", () => {
  it("parses 6-digit hex", () => {
    const c = hexToRgb("#ff8000");
    expect(c.red).toBeCloseTo(1, 3);
    expect(c.green).toBeCloseTo(128 / 255, 3);
    expect(c.blue).toBeCloseTo(0, 3);
  });

  it("expands 3-digit hex", () => {
    const c = hexToRgb("#f00");
    expect(c.red).toBeCloseTo(1, 3);
    expect(c.green).toBeCloseTo(0, 3);
  });

  it("falls back to black on invalid input", () => {
    const c = hexToRgb("nope");
    expect(c.red).toBe(0);
    expect(c.green).toBe(0);
    expect(c.blue).toBe(0);
  });
});

describe("fontVariant", () => {
  it("selects bold-italic variants per family", () => {
    expect(fontVariant("helvetica", true, true)).toBe(
      StandardFonts.HelveticaBoldOblique
    );
    expect(fontVariant("times", true, false)).toBe(
      StandardFonts.TimesRomanBold
    );
    expect(fontVariant("courier", false, true)).toBe(
      StandardFonts.CourierOblique
    );
    expect(fontVariant("helvetica", false, false)).toBe(
      StandardFonts.Helvetica
    );
  });
});

describe("wrapText", () => {
  it("wraps long text to the box width", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const lines = wrapText(
      "the quick brown fox jumps over the lazy dog",
      font,
      12,
      60
    );
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 12)).toBeLessThanOrEqual(60.5);
    }
  });

  it("honors explicit newlines", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const lines = wrapText("a\nb", font, 12, 500);
    expect(lines).toEqual(["a", "b"]);
  });
});

describe("annotation collection helpers", () => {
  const list: Annotation[] = [
    createAnnotation({ type: "signature", pageIndex: 0 }),
    createAnnotation({ type: "text", pageIndex: 0 }),
    createAnnotation({ type: "rect", pageIndex: 1 }),
  ];

  it("counts annotations per page", () => {
    expect(countOnPage(list, 0)).toBe(2);
    expect(countOnPage(list, 1)).toBe(1);
  });

  it("detects and removes signatures per page", () => {
    expect(pageHasSignature(list, 0)).toBe(true);
    const cleared = removeSignaturesOnPage(list, 0);
    expect(pageHasSignature(cleared, 0)).toBe(false);
    expect(cleared.length).toBe(2);
  });

  it("updates and deletes by id", () => {
    const target = list[1];
    const updated = updateAnnotation(list, target.id, {
      text: "Hello",
    } as Partial<TextAnnotation>);
    const found = updated.find((a) => a.id === target.id) as TextAnnotation;
    expect(found.text).toBe("Hello");
    expect(deleteAnnotation(list, target.id).length).toBe(2);
  });
});

describe("clampAnnotationBox", () => {
  it("keeps the box inside page bounds", () => {
    const a = createAnnotation({ type: "rect", pageIndex: 0 });
    const clamped = clampAnnotationBox({ ...a, x: 0.95, y: 0.95 });
    expect(clamped.x).toBeLessThanOrEqual(1 - clamped.width);
    expect(clamped.y).toBeLessThanOrEqual(1 - clamped.height);
  });
});

describe("applyAnnotations", () => {
  it("returns the same blob when there are no annotations", async () => {
    const pdf = await createMultiPagePdf(1);
    const out = await applyAnnotations(pdf, [], null);
    expect(out).toBe(pdf);
  });

  it("draws text and shapes onto pages", async () => {
    const pdf = await createMultiPagePdf(2);
    const textAnnotation = createAnnotation({
      type: "text",
      pageIndex: 0,
    }) as TextAnnotation;
    const annotations: Annotation[] = [
      { ...textAnnotation, text: "Signed" },
      createAnnotation({ type: "rect", pageIndex: 0 }),
      createAnnotation({ type: "ellipse", pageIndex: 1 }),
      createAnnotation({ type: "line", pageIndex: 1 }),
    ];
    const out = await applyAnnotations(pdf, annotations, null);
    expect(out.size).toBeGreaterThan(pdf.size);
  });

  it("embeds the signature png for signature annotations", async () => {
    const pdf = await createMultiPagePdf(1);
    const annotations: Annotation[] = [
      createAnnotation({ type: "signature", pageIndex: 0 }),
    ];
    const out = await applyAnnotations(pdf, annotations, tinyPng());
    expect(out.size).toBeGreaterThan(pdf.size);
  });

  it("draws rotated annotations without error", async () => {
    const pdf = await createMultiPagePdf(1);
    const text = createAnnotation({ type: "text", pageIndex: 0 }) as TextAnnotation;
    const annotations: Annotation[] = [
      { ...text, text: "Angled", rotation: 45 },
      { ...createAnnotation({ type: "rect", pageIndex: 0 }), rotation: 30 },
      { ...createAnnotation({ type: "line", pageIndex: 0 }), rotation: 90 },
    ];
    const out = await applyAnnotations(pdf, annotations, null);
    expect(out.size).toBeGreaterThan(pdf.size);
  });

  it("defaults rotation to zero for new annotations", () => {
    expect(createAnnotation({ type: "text", pageIndex: 0 }).rotation).toBe(0);
  });

  it("defaults text alignment to left and draws aligned text", async () => {
    const text = createAnnotation({ type: "text", pageIndex: 0 }) as TextAnnotation;
    expect(text.align).toBe("left");

    const pdf = await createMultiPagePdf(1);
    const annotations: Annotation[] = [
      { ...text, text: "Centered here", align: "center" },
      { ...text, text: "Right here", align: "right" },
    ];
    const out = await applyAnnotations(pdf, annotations, null);
    expect(out.size).toBeGreaterThan(pdf.size);
  });

  it("ignores annotations on out-of-range pages", async () => {
    const pdf = await createMultiPagePdf(1);
    const annotations: Annotation[] = [
      createAnnotation({ type: "rect", pageIndex: 5 }),
    ];
    const out = await applyAnnotations(pdf, annotations, null);
    // Nothing valid to draw, but a fresh save still succeeds.
    expect(out.size).toBeGreaterThan(0);
  });
});
