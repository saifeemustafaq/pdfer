import { type LucideIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type ToolShellProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
  /** Settings, downloads, and actions — desktop right sidebar only */
  rightSidebar?: React.ReactNode;
  /** Mobile bottom panel (e.g. merge export) — shown above tab bar */
  mobileActions?: React.ReactNode;
  className?: string;
};

export function ToolShell({
  icon: Icon,
  title,
  description,
  children,
  rightSidebar,
  mobileActions,
  className,
}: ToolShellProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <header
        className={cn(
          "sticky top-0 z-30 shrink-0 border-b border-border",
          "bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/80",
          "px-4 md:px-6 lg:px-8 py-5"
        )}
      >
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight">{title}</h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            "min-w-0 flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-6",
            mobileActions && "max-lg:pb-4"
          )}
        >
          {children}
        </div>

        {rightSidebar && (
          <Sidebar
            side="right"
            collapsible="none"
            className="hidden h-auto min-h-0 w-[min(100%,280px)] shrink-0 border-l border-sidebar-border lg:flex"
          >
            <SidebarContent className="gap-4 overflow-y-auto p-4">
              {rightSidebar}
            </SidebarContent>
          </Sidebar>
        )}
      </div>

      {mobileActions && (
        <aside
          aria-label="Tool actions"
          className={cn(
            "lg:hidden fixed inset-x-0 z-40 bottom-mobile-nav",
            "border-t border-border bg-background/95 backdrop-blur-sm",
            "px-4 py-3 shadow-[0_-4px_20px_oklch(0_0_0/0.06)]",
            "max-h-[min(70dvh,520px)] overflow-y-auto"
          )}
        >
          {mobileActions}
        </aside>
      )}
    </div>
  );
}
