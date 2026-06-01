"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Combine, Minimize2, Images, FileImage, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { TOOL_ROUTES } from "@/lib/constants";

const toolLinks = [
  { href: TOOL_ROUTES.merge, label: "Merge", icon: Combine },
  { href: TOOL_ROUTES.compress, label: "Compress", icon: Minimize2 },
  { href: TOOL_ROUTES.editPdf, label: "Edit PDF", icon: LayoutGrid },
  { href: TOOL_ROUTES.imageToPdf, label: "Image to PDF", icon: Images },
  { href: TOOL_ROUTES.pdfToImage, label: "PDF to image", icon: FileImage },
] as const;

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="hidden md:flex fixed top-0 inset-x-0 z-50 h-14 border-b border-border bg-background/80 backdrop-blur-sm items-center px-6 lg:px-8">
      <Link href="/" className="flex items-center gap-2 mr-6 shrink-0">
        <Combine className="w-5 h-5 text-primary" />
        <span className="font-semibold text-base tracking-tight">Pdfer</span>
      </Link>
      <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
        {toolLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0",
              pathname === href || pathname.startsWith(`${href}/`)
                ? "text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>
      <ThemeToggle className="shrink-0" />
    </header>
  );
}
