import { Files, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACCEPTANCE_LABELS,
  isMultiFile,
  type ToolSpec,
} from "@/lib/tool-specs";

type AcceptedFormatsProps = {
  spec: ToolSpec;
  className?: string;
};

/**
 * Compact callout that spells out, on a tool's own page, exactly what it
 * accepts (how many files, which formats) and what it returns.
 */
export function AcceptedFormats({ spec, className }: AcceptedFormatsProps) {
  const multi = isMultiFile(spec.acceptance);
  const Icon = multi ? Files : FileText;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted/40 p-4 text-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 font-medium">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden />
        <span>{ACCEPTANCE_LABELS[spec.acceptance]}</span>
      </div>
      <p className="mt-1 text-muted-foreground">{spec.inputSummary}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Accepts</span>
        {spec.formats.map((format) => (
          <span
            key={format}
            className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium"
          >
            {format}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">You get:</span>{" "}
        {spec.output}
      </p>
      {spec.note ? (
        <p className="mt-1 text-xs text-muted-foreground">{spec.note}</p>
      ) : null}
    </div>
  );
}
