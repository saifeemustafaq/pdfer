import { describe, expect, it } from "vitest";
import {
  dimensionKey,
  hasUnevenPageDimensions,
} from "./merge-dimension-preflight";

describe("dimensionKey", () => {
  it("treats portrait and landscape of the same size as equal", () => {
    expect(dimensionKey(595, 842)).toBe(dimensionKey(842, 595));
  });

  it("rounds fractional point sizes", () => {
    expect(dimensionKey(595.28, 841.89)).toBe("595x842");
  });
});

describe("hasUnevenPageDimensions", () => {
  it("returns false for empty or single dimension", () => {
    expect(hasUnevenPageDimensions([])).toBe(false);
    expect(hasUnevenPageDimensions([{ width: 612, height: 792 }])).toBe(false);
  });

  it("returns false when all pages share the same size", () => {
    expect(
      hasUnevenPageDimensions([
        { width: 595, height: 842 },
        { width: 842, height: 595 },
      ])
    ).toBe(false);
  });

  it("returns true when page sizes differ", () => {
    expect(
      hasUnevenPageDimensions([
        { width: 595, height: 842 },
        { width: 612, height: 792 },
      ])
    ).toBe(true);
  });
});
