import { describe, expect, it } from "vitest";
import { MAX_SERVER_UPLOAD_BYTES } from "@/lib/constants";
import { decide } from "./router";
import type { RoutingContext } from "./types";

const MB = 1024 * 1024;

function ctx(overrides: Partial<RoutingContext>): RoutingContext {
  return {
    operation: "merge",
    totalBytes: 3 * MB,
    fileCount: 2,
    mimeTypes: ["application/pdf"],
    isMobile: false,
    ...overrides,
  };
}

describe("decide", () => {
  it("returns local-only for 10 MB merge", () => {
    const decision = decide(ctx({ totalBytes: 10 * MB }));

    expect(decision.mode).toBe("local");
    expect(decision.serverEligible).toBe(false);
    expect(decision.reason).toMatch(/6 MB server limit/i);
  });

  it("returns local-first for 3 MB merge on desktop", () => {
    const decision = decide(
      ctx({ totalBytes: 3 * MB, isMobile: false, deviceMemoryGb: 8 })
    );

    expect(decision.mode).toBe("local");
    expect(decision.serverEligible).toBe(true);
  });

  it("returns local-only for 7 MB total", () => {
    const decision = decide(ctx({ totalBytes: 7 * MB }));

    expect(decision.mode).toBe("local");
    expect(decision.serverEligible).toBe(false);
  });

  it("prefers server for 3 MB merge on low-memory device", () => {
    const decision = decide(
      ctx({ totalBytes: 3 * MB, deviceMemoryGb: 2 })
    );

    expect(decision.mode).toBe("server");
    expect(decision.serverEligible).toBe(true);
  });

  it("uses server-first for compress under limit", () => {
    const decision = decide(
      ctx({
        operation: "compress",
        totalBytes: 2 * MB,
        fileCount: 1,
        deviceMemoryGb: 8,
      })
    );

    expect(decision.mode).toBe("server");
    expect(decision.serverEligible).toBe(true);
  });

  it("treats exactly 6 MB as server-eligible", () => {
    const decision = decide(ctx({ totalBytes: MAX_SERVER_UPLOAD_BYTES }));

    expect(decision.serverEligible).toBe(true);
  });

  it("treats 6 MB + 1 byte as server-ineligible", () => {
    const decision = decide(ctx({ totalBytes: MAX_SERVER_UPLOAD_BYTES + 1 }));

    expect(decision.mode).toBe("local");
    expect(decision.serverEligible).toBe(false);
  });

  it("always routes pdf-to-image locally", () => {
    const decision = decide(
      ctx({ operation: "pdf-to-image", totalBytes: 20 * MB })
    );

    expect(decision.mode).toBe("local");
    expect(decision.serverEligible).toBe(false);
  });
});
