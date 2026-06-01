import { MAX_SERVER_UPLOAD_BYTES } from "@/lib/constants";
import type { ProcessingOperation, RoutingContext, RoutingDecision } from "./types";

const EXOTIC_IMAGE_PATTERN = /heic|tiff|avif/i;

function hasExoticImageMime(mimeTypes: string[]): boolean {
  return mimeTypes.some((mime) => EXOTIC_IMAGE_PATTERN.test(mime));
}

function isLowMemoryDevice(deviceMemoryGb?: number): boolean {
  return deviceMemoryGb !== undefined && deviceMemoryGb < 4;
}

/** Route a job to local or server processing. Implements HYBRID_PROCESSING_SPRINT §4. */
export function decide(context: RoutingContext): RoutingDecision {
  const { operation, totalBytes, mimeTypes, isMobile, deviceMemoryGb } =
    context;
  const overServerLimit = totalBytes > MAX_SERVER_UPLOAD_BYTES;
  const serverEligible = !overServerLimit;

  if (operation === "pdf-to-image") {
    return {
      mode: "local",
      reason: "PDF export always runs on your device",
      serverEligible: false,
    };
  }

  if (operation === "merge-page-edit") {
    return {
      mode: "local",
      reason: "Page editing runs on your device",
      serverEligible: false,
    };
  }

  if (overServerLimit) {
    return {
      mode: "local",
      reason: "Total size exceeds 6 MB server limit",
      serverEligible: false,
    };
  }

  if (operation === "image-to-pdf") {
    if (hasExoticImageMime(mimeTypes)) {
      return {
        mode: "server",
        reason: "HEIC, TIFF, and AVIF use server processing when under 6 MB",
        serverEligible: true,
      };
    }
    if (isLowMemoryDevice(deviceMemoryGb)) {
      return {
        mode: "server",
        reason: "Low device memory: prefer server",
        serverEligible: true,
      };
    }
    return {
      mode: "local",
      reason: "Images convert locally when under server limit",
      serverEligible: true,
    };
  }

  if (operation === "compress") {
    if (isLowMemoryDevice(deviceMemoryGb)) {
      return {
        mode: "server",
        reason: "Low device memory: prefer server",
        serverEligible: true,
      };
    }
    if (isMobile) {
      return {
        mode: "server",
        reason: "Compress prefers server on mobile",
        serverEligible: true,
      };
    }
    return {
      mode: "server",
      reason: "Compress uses server when under limit",
      serverEligible: true,
    };
  }

  if (operation === "merge") {
    if (isLowMemoryDevice(deviceMemoryGb)) {
      return {
        mode: "server",
        reason: "Low device memory: prefer server",
        serverEligible: true,
      };
    }
    return {
      mode: "local",
      reason: "Merge runs locally when under server limit",
      serverEligible: true,
    };
  }

  return {
    mode: "local",
    reason: "Default to local processing",
    serverEligible,
  };
}

/** Build a routing context from file metadata and environment hints. */
export function buildRoutingContext(
  operation: ProcessingOperation,
  files: File[],
  hints: Pick<RoutingContext, "isMobile" | "deviceMemoryGb">,
  extra?: Pick<RoutingContext, "pageCount">
): RoutingContext {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const mimeTypes = [
    ...new Set(files.map((file) => file.type || "application/octet-stream")),
  ];

  return {
    operation,
    totalBytes,
    fileCount: files.length,
    mimeTypes,
    isMobile: hints.isMobile,
    deviceMemoryGb: hints.deviceMemoryGb,
    pageCount: extra?.pageCount,
  };
}
