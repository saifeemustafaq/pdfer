"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function AppShell({ children, className }: AppShellProps) {
  return (
    <SidebarProvider defaultOpen className="h-svh overflow-hidden">
      <div className="relative flex h-svh w-full overflow-hidden">
        <AppSidebar />
        <SidebarInset
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto",
            "pb-mobile-nav md:pb-0 md:pl-(--sidebar-width)",
            className
          )}
        >
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
