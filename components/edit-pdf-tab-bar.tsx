"use client";

import { cn } from "@/lib/utils";

export type EditPdfTab = "pages" | "watermark" | "sign";

type EditPdfTabBarProps = {
  active: EditPdfTab;
  onChange: (tab: EditPdfTab) => void;
  className?: string;
};

const TABS: { id: EditPdfTab; label: string }[] = [
  { id: "pages", label: "Pages" },
  { id: "watermark", label: "Watermark" },
  { id: "sign", label: "Sign & fill" },
];

export function EditPdfTabBar({
  active,
  onChange,
  className,
}: EditPdfTabBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 border-b border-border pb-3",
        className
      )}
      role="tablist"
      aria-label="Edit PDF sections"
    >
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          onClick={() => onChange(id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            active === id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
