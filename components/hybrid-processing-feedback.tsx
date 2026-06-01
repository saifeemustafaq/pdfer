"use client";

import { ProcessingBadge } from "@/components/processing-badge";
import { ProcessingFallback } from "@/components/processing-fallback";
import { ProcessingProgress } from "@/components/processing-progress";
import { UploadSizeNotice } from "@/components/upload-size-notice";
import type { ProcessingFallbackVariant } from "@/lib/processing/errors";
import type {
  ProcessingInfo,
  ProcessingOperation,
  RoutingDecision,
} from "@/lib/processing/types";

type HybridProcessingFeedbackProps = {
  operation: ProcessingOperation;
  files: File[];
  showWarn: boolean;
  processingInfo: ProcessingInfo | RoutingDecision | null;
  fallback: ProcessingFallbackVariant | null;
  active: boolean;
  onRetryServer?: () => void;
  onRetryLocal?: () => void;
  progressKey?: string;
};

export function HybridProcessingFeedback({
  operation,
  files,
  showWarn,
  processingInfo,
  fallback,
  active,
  onRetryServer,
  onRetryLocal,
  progressKey,
}: HybridProcessingFeedbackProps) {
  const showBadge = (active || processingInfo) && processingInfo;

  return (
    <>
      <UploadSizeNotice
        operation={operation}
        files={files}
        showWarn={showWarn}
      />

      {showBadge && (
        <ProcessingBadge
          mode={processingInfo.mode}
          reason={processingInfo.reason}
        />
      )}

      {fallback && (
        <ProcessingFallback
          variant={fallback}
          onAction={
            fallback === "try-server"
              ? onRetryServer
              : fallback === "try-local"
                ? onRetryLocal
                : undefined
          }
        />
      )}

      <ProcessingProgress key={progressKey ?? String(active)} active={active} />
    </>
  );
}
