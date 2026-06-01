import { cn } from "@/lib/utils";

type ToolLandingProps = {
  children: React.ReactNode;
  className?: string;
};

/** Consistent empty-state container for all tool pages. */
export function ToolLanding({ children, className }: ToolLandingProps) {
  return (
    <div className={cn("mx-auto flex w-full max-w-2xl flex-col gap-4", className)}>
      {children}
    </div>
  );
}

type ToolWorkspaceProps = {
  children: React.ReactNode;
  className?: string;
  /** Wider max-width for page grids and multi-column layouts. */
  wide?: boolean;
};

/** Main working area after files are staged. */
export function ToolWorkspace({
  children,
  className,
  wide = false,
}: ToolWorkspaceProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        wide ? "max-w-6xl" : "max-w-4xl",
        className
      )}
    >
      {children}
    </div>
  );
}
