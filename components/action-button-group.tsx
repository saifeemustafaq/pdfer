import { cn } from "@/lib/utils";

type ActionButtonGroupProps = {
  children: React.ReactNode;
  className?: string;
};

/** Primary + secondary actions in a horizontal row with consistent gap (DESIGN_GUIDE §2.1). */
export function ActionButtonGroup({ children, className }: ActionButtonGroupProps) {
  return (
    <div
      className={cn(
        "flex flex-row flex-wrap items-center gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}
