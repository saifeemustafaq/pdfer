import { Combine, Minimize2, Images, FileImage, LayoutGrid, Scissors, LockKeyhole } from "lucide-react";
import { ToolCard } from "@/components/tool-card";
import { LandingTrustSection } from "@/components/landing-trust-section";
import { ArchitectureModal } from "@/components/architecture-modal";
import { GitHubRepoLink } from "@/components/github-repo-link";
import { TOOL_ROUTES } from "@/lib/constants";

const tools = [
  {
    href: TOOL_ROUTES.merge,
    icon: Combine,
    jobLabel: "Make one file",
    title: "Merge PDFs",
    description: "Combine PDFs and images. Reorder files, remove pages.",
    actionLabel: "Combine files",
  },
  {
    href: TOOL_ROUTES.split,
    icon: Scissors,
    jobLabel: "Pull pages out",
    title: "Split PDF",
    description: "Extract a page range, split every N pages, or pick pages.",
    actionLabel: "Split PDF",
  },
  {
    href: TOOL_ROUTES.compress,
    icon: Minimize2,
    jobLabel: "Shrink for email",
    title: "Compress PDF",
    description: "Reduce file size with three quality presets.",
    actionLabel: "Compress PDF",
  },
  {
    href: TOOL_ROUTES.editPdf,
    icon: LayoutGrid,
    jobLabel: "Edit PDF",
    title: "Edit PDF",
    description: "Reorder pages, watermark, fill forms, or sign.",
    actionLabel: "Edit PDF",
  },
  {
    href: TOOL_ROUTES.imageToPdf,
    icon: Images,
    jobLabel: "Photos to PDF",
    title: "Image to PDF",
    description: "Turn images into a printable multi-page PDF.",
    actionLabel: "Convert images",
  },
  {
    href: TOOL_ROUTES.pdfToImage,
    icon: FileImage,
    jobLabel: "PDF to pictures",
    title: "PDF to image",
    description: "Export each page as JPEG or PNG in a ZIP.",
    actionLabel: "Export pages",
  },
  {
    href: TOOL_ROUTES.unlock,
    icon: LockKeyhole,
    jobLabel: "Remove password",
    title: "Unlock PDF",
    description: "Remove a password from a PDF you own.",
    actionLabel: "Unlock PDF",
  },
] as const;

export default function Home() {
  return (
    <div className="flex flex-col min-h-dvh pt-12 md:pt-0">
      <div className="flex flex-1 flex-col px-4 md:px-6 lg:px-8 py-8 md:py-10 max-w-5xl mx-auto w-full gap-8 md:gap-10">
        {/* Hero */}
        <section className="flex flex-col items-center gap-3 text-center md:flex-row md:items-start md:gap-4 md:text-left md:shrink-0">
          <div className="flex items-center justify-center w-11 h-11 md:w-10 md:h-10 rounded-xl bg-primary/10 text-primary shrink-0 md:mt-0.5">
            <Combine className="w-6 h-6 md:w-5 md:h-5" />
          </div>
          <div className="space-y-2 md:flex-1 max-w-2xl md:max-w-none">
            <h1 className="text-2xl font-bold tracking-tight leading-tight">
              PDF tools that work for you
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Private PDF utilities for real tasks: combine, shrink, split, and
              convert. Mostly on your device, never in our database.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              No account, no paywall. Your files are processed for the job and
              not kept afterward.
            </p>
          </div>
        </section>

        {/* Tool cards */}
        <section
          aria-label="PDF tools"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-3"
        >
          {tools.map((tool) => (
            <ToolCard key={tool.href} {...tool} compact />
          ))}
        </section>

        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
          <ArchitectureModal />
          <GitHubRepoLink />
        </div>

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
