"use client";

import { useEffect, useState } from "react";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type ProcessingProgressProps = {
  active: boolean;
  success?: boolean;
  className?: string;
};

export function ProcessingProgress({
  active,
  success = false,
  className,
}: ProcessingProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      setProgress((v) => {
        if (v === 0) return 8;
        if (v >= 90) return v;
        return v + 7;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [active]);

  if (!active && !success) return null;

  const value = success ? 100 : active ? Math.max(progress, 8) : 0;

  return (
    <Progress
      value={value}
      className={cn("w-full", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <ProgressTrack className="h-2">
        <ProgressIndicator
          className={cn("h-full", success && "bg-success")}
        />
      </ProgressTrack>
    </Progress>
  );
}
