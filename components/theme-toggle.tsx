"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

/**
 * Cycles explicit light/dark overrides. Default is system (browser/device)
 * until the user picks a mode — stored in localStorage by next-themes.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("relative h-9 w-9", className)}
        aria-label="Theme"
        disabled
      />
    );
  }

  function handleClick() {
    if (theme === "system") {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
      return;
    }
    if (theme === "light") {
      setTheme("dark");
      return;
    }
    if (theme === "dark") {
      setTheme("system");
      return;
    }
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  const label =
    theme === "system"
      ? "Theme: system (click for light)"
      : theme === "light"
        ? "Theme: light (click for dark)"
        : "Theme: dark (click for system)";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("relative h-9 w-9", className)}
      aria-label={label}
      title={label}
      onClick={handleClick}
    >
      {theme === "system" ? (
        <Monitor className="h-4 w-4 text-muted-foreground" />
      ) : (
        <>
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:scale-0 dark:opacity-0" />
          <Moon className="absolute h-4 w-4 scale-0 opacity-0 transition-all dark:scale-100 dark:opacity-100" />
        </>
      )}
    </Button>
  );
}
