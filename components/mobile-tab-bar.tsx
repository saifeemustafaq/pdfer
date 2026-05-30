"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Combine, Minimize2, Images, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOOL_ROUTES } from "@/lib/constants";

const tabs = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  {
    href: TOOL_ROUTES.merge,
    label: "Merge",
    icon: Combine,
    match: (p: string) => p.startsWith(TOOL_ROUTES.merge),
  },
  {
    href: TOOL_ROUTES.compress,
    label: "Compress",
    icon: Minimize2,
    match: (p: string) => p.startsWith(TOOL_ROUTES.compress),
  },
  {
    href: TOOL_ROUTES.convert,
    label: "Convert",
    icon: Images,
    match: (p: string) =>
      p === TOOL_ROUTES.convert ||
      p.startsWith(TOOL_ROUTES.imageToPdf) ||
      p.startsWith(TOOL_ROUTES.pdfToImage),
  },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 h-16 border-t border-border bg-background/90 backdrop-blur-sm flex items-center justify-around px-2"
      aria-label="Main navigation"
    >
      {tabs.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] px-3 rounded-lg text-xs font-medium transition-colors",
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
