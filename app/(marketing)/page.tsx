import { Combine, Minimize2, Images, FileImage } from "lucide-react";
import { ToolCard } from "@/components/tool-card";
import { LandingTrustSection } from "@/components/landing-trust-section";
import { TOOL_ROUTES } from "@/lib/constants";

const tools = [
  {
    href: TOOL_ROUTES.merge,
    icon: Combine,
    title: "Merge PDFs",
    description: "Combine PDFs and images. Reorder files, remove pages.",
    actionLabel: "Merge files",
  },
  {
    href: TOOL_ROUTES.compress,
    icon: Minimize2,
    title: "Compress PDF",
    description: "Reduce file size with three quality presets.",
    actionLabel: "Compress PDF",
  },
  {
    href: TOOL_ROUTES.imageToPdf,
    icon: Images,
    title: "Image to PDF",
    description: "Turn JPEG or PNG images into one multi-page PDF.",
    actionLabel: "Image to PDF",
  },
  {
    href: TOOL_ROUTES.pdfToImage,
    icon: FileImage,
    title: "PDF to image",
    description: "Export each page as JPEG or PNG in a ZIP.",
    actionLabel: "PDF to image",
  },
] as const;

export default function Home() {
  return (
    <div className="flex flex-col min-h-dvh pt-12 pb-16 md:pt-0 md:pb-0">
      <div className="flex flex-1 flex-col px-4 md:px-6 lg:px-8 py-8 md:py-10 max-w-6xl mx-auto w-full gap-8 md:gap-10">
        {/* Hero */}
        <section className="flex flex-col items-center gap-3 text-center md:flex-row md:items-start md:gap-4 md:text-left md:shrink-0">
          <div className="flex items-center justify-center w-11 h-11 md:w-10 md:h-10 rounded-xl bg-primary/10 text-primary shrink-0 md:mt-0.5">
            <Combine className="w-6 h-6 md:w-5 md:h-5" />
          </div>
          <div className="space-y-2 md:flex-1 max-w-2xl md:max-w-none">
            <h1 className="text-2xl md:text-[1.65rem] font-bold tracking-tight leading-tight">
              PDF tools that work for you
            </h1>
            <p className="text-sm md:text-[0.9375rem] text-muted-foreground leading-relaxed">
              Merge, compress, and convert — no account, no paywall.
            </p>
            <p className="text-sm md:text-[0.9375rem] text-muted-foreground/90 leading-relaxed">
              I built Pdfer because basic PDF tasks kept landing behind
              subscriptions, forced sign-ups, or “free” sites that treat your
              uploads as the product. Simple tools should stay simple — and
              leave your documents alone.
            </p>
          </div>
        </section>

        {/* Tool cards */}
        <section
          aria-label="PDF tools"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-3"
        >
          {tools.map((tool) => (
            <ToolCard key={tool.href} {...tool} compact />
          ))}
        </section>

        <LandingTrustSection />
      </div>

      <footer className="shrink-0 border-t border-border px-4 py-3 md:py-3.5 text-center">
        <p className="text-xs text-muted-foreground">
          No sign-up. Files are never stored.
        </p>
      </footer>
    </div>
  );
}
