import {
  Combine,
  Home,
  Images,
  LayoutGrid,
  LockKeyhole,
  Minimize2,
  Scissors,
  type LucideIcon,
} from "lucide-react";
import { TOOL_ROUTES } from "@/lib/constants";

export type MobileNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

export const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { href: "/", label: "Home", icon: Home, match: (p) => p === "/" },
  {
    href: TOOL_ROUTES.merge,
    label: "Merge",
    icon: Combine,
    match: (p) => p.startsWith(TOOL_ROUTES.merge),
  },
  {
    href: TOOL_ROUTES.split,
    label: "Split",
    icon: Scissors,
    match: (p) => p.startsWith(TOOL_ROUTES.split),
  },
  {
    href: TOOL_ROUTES.compress,
    label: "Compress",
    icon: Minimize2,
    match: (p) => p.startsWith(TOOL_ROUTES.compress),
  },
  {
    href: TOOL_ROUTES.editPdf,
    label: "Edit",
    icon: LayoutGrid,
    match: (p) => p.startsWith(TOOL_ROUTES.editPdf),
  },
  {
    href: TOOL_ROUTES.convert,
    label: "Convert",
    icon: Images,
    match: (p) =>
      p === TOOL_ROUTES.convert ||
      p.startsWith(TOOL_ROUTES.imageToPdf) ||
      p.startsWith(TOOL_ROUTES.pdfToImage),
  },
  {
    href: TOOL_ROUTES.unlock,
    label: "Unlock",
    icon: LockKeyhole,
    match: (p) => p.startsWith(TOOL_ROUTES.unlock),
  },
];

/** Index of the active mobile nav item, or 0 (Home) if none match. */
export function getMobileNavActiveIndex(pathname: string): number {
  const index = MOBILE_NAV_ITEMS.findIndex((item) => item.match(pathname));
  return index >= 0 ? index : 0;
}
