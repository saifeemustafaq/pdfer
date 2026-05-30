import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ToolShellProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
  wide?: boolean;
  className?: string;
};

export function ToolShell({
  icon: Icon,
  title,
  description,
  children,
  wide = false,
  className,
}: ToolShellProps) {
  return (
    <div
      className={cn(
        "flex flex-col flex-1 px-4 md:px-6 lg:px-8 py-8 mx-auto w-full gap-6",
        wide ? "max-w-3xl" : "max-w-2xl",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
