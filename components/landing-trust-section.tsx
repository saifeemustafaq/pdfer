import {
  Shield,
  UserX,
  HardDrive,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Pillar = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const pillars: Pillar[] = [
  {
    icon: UserX,
    title: "No account, no profile",
    description:
      "There is no sign-up and no user database. Your files are never tied to an identity we could sell or leak.",
  },
  {
    icon: HardDrive,
    title: "Processed, not stored",
    description:
      "Each job runs in a stateless server function: your PDF is handled in memory, returned to you, and discarded. Nothing is written to disk for later.",
  },
  {
    icon: Lock,
    title: "HTTPS end to end",
    description:
      "Uploads and downloads travel over encrypted connections. We do not send your documents to third-party processing APIs.",
  },
  {
    icon: Shield,
    title: "Your file is not the product",
    description:
      "No ads gated behind exports, no “free” tier that harvests uploads. The tool exists to do the job — not to collect your documents.",
  },
];

const processingSteps = [
  {
    step: 1,
    title: "You pick files",
    description: "Files stay in your browser until you start a job.",
  },
  {
    step: 2,
    title: "One secure request",
    description: "When you click Merge, Compress, or Convert, files upload once over HTTPS.",
  },
  {
    step: 3,
    title: "In-memory engine",
    description:
      "pdf-lib and sharp rewrite your PDF on the server in RAM — merge pages, re-encode images, or build a new PDF.",
  },
  {
    step: 4,
    title: "Download and done",
    description:
      "You get the result immediately. The server keeps no copy; there is nothing to log in and retrieve later.",
  },
] as const;

export function LandingTrustSection() {
  return (
    <section
      aria-labelledby="trust-heading"
      className="rounded-2xl border border-border bg-muted/40 px-4 py-8 md:px-8 md:py-10"
    >
      <div className="mx-auto max-w-3xl text-center space-y-2 mb-8 md:mb-10">
        <h2
          id="trust-heading"
          className="text-lg md:text-xl font-semibold tracking-tight"
        >
          Why your files are safe here
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Simple PDF tools should not cost your privacy. Pdfer is built to be
          stateless — no accounts, no database, and no keeping your documents
          after the job finishes.
        </p>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 max-w-4xl mx-auto mb-10 md:mb-12">
        {pillars.map(({ icon: Icon, title, description }) => (
          <li
            key={title}
            className="flex gap-3 rounded-xl bg-card border border-border p-4 shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="text-sm font-semibold leading-tight">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="max-w-3xl mx-auto">
        <h3 className="text-sm font-semibold text-center mb-6">
          How processing works
        </h3>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {processingSteps.map(({ step, title, description }) => (
            <li
              key={step}
              className="flex flex-col items-center text-center sm:items-start sm:text-left"
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  "bg-primary text-primary-foreground text-sm font-semibold tabular-nums mb-3"
                )}
              >
                {step}
              </div>
              <p className="text-sm font-medium leading-tight">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
