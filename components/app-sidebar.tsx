"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Combine } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { TOOL_NAV_ITEMS, isToolNavActive } from "@/lib/tool-nav";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="none"
      className="fixed inset-y-0 left-0 z-30 hidden h-svh w-(--sidebar-width) border-r border-sidebar-border md:flex"
    >
      <SidebarHeader className="border-b border-sidebar-border">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Combine className="size-5 text-primary" />
          <span className="font-semibold text-base tracking-tight">Pdfer</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {TOOL_NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={isToolNavActive(pathname, href)}
                    render={<Link href={href} />}
                    className="data-active:bg-primary data-active:font-medium data-active:text-primary-foreground data-active:hover:bg-primary data-active:hover:text-primary-foreground data-active:[&_svg]:text-primary-foreground"
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarSeparator className="mx-0" />
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs text-sidebar-foreground/70">Theme</span>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
