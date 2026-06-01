import {
  Combine,
  Minimize2,
  Images,
  FileImage,
  LayoutGrid,
  Scissors,
  LockKeyhole,
  type LucideIcon,
} from "lucide-react";
import { TOOL_ROUTES } from "@/lib/constants";

export type ToolNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const TOOL_NAV_ITEMS: ToolNavItem[] = [
  { href: TOOL_ROUTES.merge, label: "Merge PDFs", icon: Combine },
  { href: TOOL_ROUTES.split, label: "Split PDF", icon: Scissors },
  { href: TOOL_ROUTES.compress, label: "Compress PDF", icon: Minimize2 },
  { href: TOOL_ROUTES.editPdf, label: "Edit PDF", icon: LayoutGrid },
  { href: TOOL_ROUTES.imageToPdf, label: "Image to PDF", icon: Images },
  { href: TOOL_ROUTES.pdfToImage, label: "PDF to image", icon: FileImage },
  { href: TOOL_ROUTES.unlock, label: "Unlock PDF", icon: LockKeyhole },
];

export function isToolNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
