"use client";

import { Download } from "lucide-react";
import { PrimaryActionButton } from "@/components/app-button";
import { cn } from "@/lib/utils";

type MobileDownloadFabProps = {
  blob: Blob | null;
  onClick: () => void;
};

/**
 * Mobile-only floating "Download" pill. Sits above the bottom tab bar so the
 * result is reachable without scrolling to the in-page footer. Hidden on
 * desktop (md+), where the right sidebar already exposes the same actions.
 */
export function MobileDownloadFab({ blob, onClick }: MobileDownloadFabProps) {
  if (!blob) return null;

  return (
    <PrimaryActionButton
      type="button"
      onClick={onClick}
      aria-label="Open download options"
      className={cn(
        "bottom-mobile-nav fixed right-4 z-40 mb-3 rounded-full px-5 shadow-lg",
        "md:hidden"
      )}
    >
      <Download className="size-4" />
      Download
    </PrimaryActionButton>
  );
}
