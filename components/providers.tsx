"use client";

import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="pdfer-theme"
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
