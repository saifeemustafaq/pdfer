import { AlertCircle } from "lucide-react";
import { SecondaryActionButton } from "@/components/app-button";
import type { ProcessingFallbackVariant } from "@/lib/processing/errors";
import { cn } from "@/lib/utils";

type ProcessingFallbackProps = {
  variant: ProcessingFallbackVariant;
  onAction?: () => void;
  className?: string;
};

const FALLBACK_COPY: Record<
  ProcessingFallbackVariant,
  { message: string; action?: string }
> = {
  "try-server": {
    message: "Processing on your device failed.",
    action: "Try on the server",
  },
  "try-local": {
    message: "Server processing failed.",
    action: "Try on your device",
  },
  "split-files": {
    message:
      "This file is too large for your browser. Try fewer or smaller files.",
  },
};

export function ProcessingFallback({
  variant,
  onAction,
  className,
}: ProcessingFallbackProps) {
  const copy = FALLBACK_COPY[variant];

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3",
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <AlertCircle
          className="w-4 h-4 shrink-0 mt-0.5 text-destructive"
          aria-hidden
        />
        <p className="text-sm text-foreground">{copy.message}</p>
      </div>
      {copy.action && onAction && (
        <SecondaryActionButton type="button" onClick={onAction} className="w-fit">
          {copy.action}
        </SecondaryActionButton>
      )}
    </div>
  );
}
