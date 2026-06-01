"use client";

import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { getDeviceHints } from "@/lib/processing/device-context";
import { buildRoutingContext, decide } from "@/lib/processing/router";
import type { ProcessingOperation } from "@/lib/processing/types";
import { SizeWarning } from "@/components/size-warning";

type UploadSizeNoticeProps = {
  operation: ProcessingOperation;
  files: File[];
  showWarn: boolean;
};

/** Size warning with hybrid routing context for merge, image-to-PDF, and compress. */
export function UploadSizeNotice({
  operation,
  files,
  showWarn,
}: UploadSizeNoticeProps) {
  if (!showWarn) return null;

  const context = buildRoutingContext(operation, files, getDeviceHints());
  const overLimit = context.totalBytes > MAX_UPLOAD_BYTES;
  const { serverEligible } = decide(context);

  return (
    <SizeWarning
      overLimit={overLimit}
      runsOnDevice={overLimit && !serverEligible}
    />
  );
}
