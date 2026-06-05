import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/app-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { PwaRegister } from "@/components/pwa-register";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pdfer | PDF tools that respect your privacy",
    template: "%s | Pdfer",
  },
  description:
    "Free PDF tools with no sign-up or paywall. Files are processed in memory and never stored. Merge, compress, and convert between PDFs and images.",
  metadataBase: new URL("https://pdfer.netlify.app"),
  applicationName: "Pdfer",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pdfer",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "Pdfer",
    title: "Pdfer | PDF tools that respect your privacy",
    description:
      "Free PDF tools with no sign-up or paywall. Files are processed in memory and never stored.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#C15F3C" },
    { media: "(prefers-color-scheme: dark)", color: "#C15F3C" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <Providers>
          <div className="md:hidden fixed top-3 right-3 z-[100]">
            <ThemeToggle />
          </div>
          <AppShell>{children}</AppShell>
          <MobileTabBar />
          <Toaster richColors position="top-center" />
          <PwaRegister />
        </Providers>
      </body>
    </html>
  );
}
