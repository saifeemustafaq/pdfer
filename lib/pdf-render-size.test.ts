import { describe, expect, it } from "vitest";
import {
  MAX_CANVAS_AREA,
  MAX_CANVAS_SIDE,
  fitPageToBox,
  maxCssWidthForAspect,
  resolvePixelRatio,
} from "./pdf-render-size";

const LETTER_W = 612;
const LETTER_H = 792;
const LETTER_ASPECT = LETTER_H / LETTER_W;

/** Layout sizes a preview can realistically be asked to fill. */
const CSS_SIZES: Array<[number, number]> = [
  [240, 311],
  [420, 543],
  [1000, 1294],
  [2000, 2588],
  [6000, 7764],
];

describe("fitPageToBox", () => {
  it("fills the width budget when height is unconstrained", () => {
    const scale = fitPageToBox(LETTER_W, LETTER_H, 1000);
    expect(LETTER_W * scale).toBeCloseTo(1000);
  });

  it("uses the height budget when it binds first", () => {
    const scale = fitPageToBox(LETTER_W, LETTER_H, 1000, 600);
    expect(LETTER_H * scale).toBeCloseTo(600);
    expect(LETTER_W * scale).toBeLessThan(1000);
  });

  it("treats a zero height budget as unconstrained", () => {
    expect(fitPageToBox(LETTER_W, LETTER_H, 1000, 0)).toBeCloseTo(
      fitPageToBox(LETTER_W, LETTER_H, 1000)
    );
  });

  it("falls back to 1 for a degenerate page", () => {
    expect(fitPageToBox(0, 0, 1000)).toBe(1);
  });
});

describe("resolvePixelRatio", () => {
  it("renders above the layout size so previews stay sharp", () => {
    expect(resolvePixelRatio(1000, 1294)).toBeGreaterThanOrEqual(2);
  });

  it("keeps every canvas within the side and area budget", () => {
    for (const [width, height] of CSS_SIZES) {
      const ratio = resolvePixelRatio(width, height);
      const pixelWidth = width * ratio;
      const pixelHeight = height * ratio;

      expect(Math.max(pixelWidth, pixelHeight)).toBeLessThanOrEqual(
        MAX_CANVAS_SIDE + 1
      );
      expect(pixelWidth * pixelHeight).toBeLessThanOrEqual(MAX_CANVAS_AREA + 1);
    }
  });

  it("stays at or above one device pixel per css pixel while in budget", () => {
    const inBudget = CSS_SIZES.filter(
      ([width, height]) =>
        width * height <= MAX_CANVAS_AREA &&
        Math.max(width, height) <= MAX_CANVAS_SIDE
    );
    expect(inBudget.length).toBeGreaterThan(0);

    for (const [width, height] of inBudget) {
      expect(resolvePixelRatio(width, height)).toBeGreaterThanOrEqual(1);
    }
  });

  it("degrades below 1 rather than exceeding the budget", () => {
    // 6000x7764 css px is already past the area budget before any supersampling.
    expect(resolvePixelRatio(6000, 7764)).toBeLessThan(1);
    expect(resolvePixelRatio(6000, 7764)).toBeGreaterThan(0);
  });
});

describe("maxCssWidthForAspect", () => {
  it("returns a width whose canvas still fits the budget", () => {
    const maxCss = maxCssWidthForAspect(LETTER_ASPECT);
    const maxCssHeight = maxCss * LETTER_ASPECT;

    expect(maxCssHeight).toBeLessThanOrEqual(MAX_CANVAS_SIDE + 1);
    expect(maxCss * maxCssHeight).toBeLessThanOrEqual(MAX_CANVAS_AREA + 1);
  });

  it("leaves room to zoom well past a full-screen fit", () => {
    expect(maxCssWidthForAspect(LETTER_ASPECT)).toBeGreaterThan(3000);
  });
});
