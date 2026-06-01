import { MAX_SERVER_UPLOAD_BYTES } from "@/lib/constants";
import type { ProcessingOperation, RoutingContext, RoutingDecision } from "./types";

const HEIC_IMAGE_PATTERN = /heic|heif/i;
const SERVER_ONLY_IMAGE_PATTERN = /tiff|avif/i;

function hasHeicImageMime(mimeTypes: string[]): boolean {
  return mimeTypes.some((mime) => HEIC_IMAGE_PATTERN.test(mime));
}

function hasServerOnlyImageMime(mimeTypes: string[]): boolean {
  return mimeTypes.some((mime) => SERVER_ONLY_IMAGE_PATTERN.test(mime));
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

  if (operation === "split") {
    return {
      mode: "local",
      reason: "Split runs on your device",
      serverEligible: false,
    };
  }

  if (operation === "unlock") {
    return {
      mode: "server",
      reason: "Unlock runs on the server",
      serverEligible: serverEligible,
    };
  }

  if (overServerLimit) {
    return {
      mode: "local",
      reason: "Total size exceeds 6 MB server limit",
      serverEligible: false,
    };
  }

  if (operation === "image-to-pdf" || operation === "merge") {
    if (hasServerOnlyImageMime(mimeTypes)) {
      if (overServerLimit) {
        return {
          mode: "local",
          reason: "Total size exceeds 6 MB server limit",
          serverEligible: false,
        };
      }
      return {
        mode: "server",
        reason: "TIFF and AVIF use server processing when under 6 MB",
        serverEligible: true,
      };
    }

    if (hasHeicImageMime(mimeTypes)) {
      if (overServerLimit) {
        return {
          mode: "local",
          reason: "HEIC converts on your device when over 6 MB",
          serverEligible: false,
        };
      }
      return {
        mode: "server",
        reason: "HEIC uses server processing when under 6 MB",
        serverEligible: true,
      };
    }
  }

  if (operation === "image-to-pdf") {
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
