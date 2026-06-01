import { Monitor, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProcessingMode } from "@/lib/processing/types";
import { cn } from "@/lib/utils";

type ProcessingBadgeProps = {
  mode: ProcessingMode;
  reason?: string;
  className?: string;
};

export function ProcessingBadge({
  mode,
  reason,
  className,
}: ProcessingBadgeProps) {
  const label = mode === "local" ? "On your device" : "On server";
  const Icon = mode === "local" ? Monitor : Server;

  return (
    <div className={cn("space-y-1", className)}>
      <Badge variant="outline" className="gap-1.5">
        <Icon aria-hidden="true" />
        {label}
      </Badge>
      {reason && (
        <p className="text-xs text-muted-foreground">{reason}</p>
      )}
    </div>
  );
}
