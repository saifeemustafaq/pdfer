import { describe, expect, it } from "vitest";
import {
  computeImageDrawRect,
  MARGIN_PT,
  resolvePageDimensions,
} from "./image-pdf-layout";

describe("resolvePageDimensions", () => {
  it("returns portrait A4 by default", () => {
    const dims = resolvePageDimensions("a4", "portrait");
    expect(dims.width).toBeCloseTo(595.28, 1);
    expect(dims.height).toBeCloseTo(841.89, 1);
  });

  it("swaps dimensions for landscape", () => {
    const dims = resolvePageDimensions("letter", "landscape");
    expect(dims.width).toBe(792);
    expect(dims.height).toBe(612);
  });
});

describe("computeImageDrawRect", () => {
  it("centers a wide image with contain scaling", () => {
    const pageW = 600;
    const pageH = 800;
    const rect = computeImageDrawRect(pageW, pageH, 1200, 600, MARGIN_PT.narrow);

    expect(rect.width).toBeLessThanOrEqual(pageW - MARGIN_PT.narrow * 2);
    expect(rect.height).toBeLessThanOrEqual(pageH - MARGIN_PT.narrow * 2);
    expect(rect.x).toBeGreaterThanOrEqual(MARGIN_PT.narrow);
    expect(rect.y).toBeGreaterThanOrEqual(MARGIN_PT.narrow);
  });
});
