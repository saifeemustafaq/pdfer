import { describe, expect, it } from "vitest";
import {
  pageEditOrderMap,
  remapAnnotationsForPageEdit,
  remapSignatureSpecForPageEdit,
} from "./pdf-edit-export";
import { createAnnotation, type Annotation } from "./pdf-annotations";
import { DEFAULT_SIGNATURE_SPEC, type SignatureSpec } from "./pdf-form-sign";
import type { PageEditSpec } from "./pdf-client";

describe("pageEditOrderMap", () => {
  it("returns null when there is no page edit", () => {
    expect(pageEditOrderMap(null)).toBeNull();
    expect(pageEditOrderMap({ pageIndicesInOrder: [] })).toBeNull();
  });

  it("maps source indices to output positions", () => {
    // Keep pages 0, 2, 3 (drop 1) with 3 moved before 2.
    const spec: PageEditSpec = { pageIndicesInOrder: [0, 3, 2] };
    const map = pageEditOrderMap(spec);
    expect(map?.get(0)).toBe(0);
    expect(map?.get(3)).toBe(1);
    expect(map?.get(2)).toBe(2);
    expect(map?.has(1)).toBe(false);
  });
});

describe("remapAnnotationsForPageEdit", () => {
  const annotations: Annotation[] = [
    { ...createAnnotation({ type: "text", pageIndex: 0 }) },
    { ...createAnnotation({ type: "rect", pageIndex: 1 }) },
    { ...createAnnotation({ type: "line", pageIndex: 3 }) },
  ];

  it("keeps annotations unchanged without a page edit", () => {
    expect(remapAnnotationsForPageEdit(annotations, null)).toEqual(annotations);
  });

  it("drops annotations on removed pages and remaps survivors", () => {
    const spec: PageEditSpec = { pageIndicesInOrder: [0, 3, 2] };
    const result = remapAnnotationsForPageEdit(annotations, spec);
    // Page 1's rect is removed; page 0 stays at 0; page 3 moves to output 1.
    expect(result).toHaveLength(2);
    expect(result.find((a) => a.type === "text")?.pageIndex).toBe(0);
    expect(result.find((a) => a.type === "line")?.pageIndex).toBe(1);
    expect(result.find((a) => a.type === "rect")).toBeUndefined();
  });
});

describe("remapSignatureSpecForPageEdit", () => {
  it("remaps 'all' scope to the surviving output pages", () => {
    const spec: SignatureSpec = { ...DEFAULT_SIGNATURE_SPEC, pageScope: "all" };
    const edit: PageEditSpec = { pageIndicesInOrder: [0, 3, 2] };
    const result = remapSignatureSpecForPageEdit(spec, 4, edit);
    expect(result.pageScope).toBe("selected");
    // Original pages 0,1,2,3 -> kept 0,2,3 -> output positions 0,2,1 -> sorted.
    expect(result.selectedPages).toEqual([0, 1, 2]);
  });

  it("drops removed pages from a selected scope", () => {
    const spec: SignatureSpec = {
      ...DEFAULT_SIGNATURE_SPEC,
      pageScope: "selected",
      selectedPages: [1, 3],
    };
    const edit: PageEditSpec = { pageIndicesInOrder: [0, 3, 2] };
    const result = remapSignatureSpecForPageEdit(spec, 4, edit);
    // Page 1 removed; page 3 -> output 1.
    expect(result.selectedPages).toEqual([1]);
  });

  it("returns the spec untouched without a page edit", () => {
    const spec: SignatureSpec = { ...DEFAULT_SIGNATURE_SPEC };
    expect(remapSignatureSpecForPageEdit(spec, 4, null)).toBe(spec);
  });
});
