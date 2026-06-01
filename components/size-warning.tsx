import { AlertCircle } from "lucide-react";

type SizeWarningProps = {
  overLimit: boolean;
  /** When true, over-limit jobs will run locally instead of being blocked. */
  runsOnDevice?: boolean;
};

export function SizeWarning({ overLimit, runsOnDevice = false }: SizeWarningProps) {
  let message: string;

  if (overLimit && runsOnDevice) {
    message = "Over 6 MB server limit. This job will run on your device.";
  } else if (overLimit) {
    message = "File too large: 6 MB limit";
  } else {
    message = "Approaching 6 MB limit. Consider removing files.";
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-warning" />
      <span>{message}</span>
    </div>
  );
}
