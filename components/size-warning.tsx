import { AlertCircle } from "lucide-react";

type SizeWarningProps = {
  overLimit: boolean;
};

export function SizeWarning({ overLimit }: SizeWarningProps) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-warning" />
      <span>
        {overLimit
          ? "File too large — 6 MB limit"
          : "Approaching 6 MB limit — consider removing files."}
      </span>
    </div>
  );
}
