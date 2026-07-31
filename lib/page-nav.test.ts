import { describe, expect, it } from "vitest";
import { keptPageCount, resolveKeptPage } from "./page-nav";

describe("resolveKeptPage", () => {
  const removed = new Set([1, 2]); // pages 2 and 3 (1-based) removed of 5

  it("returns the target when it is kept", () => {
    expect(resolveKeptPage(0, 0, removed, 5)).toBe(0);
    expect(resolveKeptPage(3, 0, removed, 5)).toBe(3);
  });

  it("skips forward when moving forward onto a removed page", () => {
    // From page 0 stepping to 1 (removed) -> next kept is 3.
    expect(resolveKeptPage(1, 0, removed, 5)).toBe(3);
  });

  it("skips backward when moving backward onto a removed page", () => {
    // From page 3 stepping to 2 (removed) -> previous kept is 0.
    expect(resolveKeptPage(2, 3, removed, 5)).toBe(0);
  });

  it("falls back to the opposite direction at the edge", () => {
    // Everything after index 2 removed; forward search fails, go back to 1.
    const trailingRemoved = new Set([2, 3, 4]);
    expect(resolveKeptPage(2, 2, trailingRemoved, 5)).toBe(1);
  });

  it("clamps out-of-range targets", () => {
    expect(resolveKeptPage(99, 0, new Set(), 5)).toBe(4);
    expect(resolveKeptPage(-3, 0, new Set(), 5)).toBe(0);
  });
});

describe("keptPageCount", () => {
  it("subtracts removed pages", () => {
    expect(keptPageCount(new Set([0, 2]), 5)).toBe(3);
    expect(keptPageCount(new Set(), 5)).toBe(5);
  });
});
