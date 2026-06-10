import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Files, FileText } from "lucide-react";
import { ToolShell } from "@/components/tool-shell";
import { ToolWorkspace } from "@/components/tool-landing";
import {
  ACCEPTANCE_LABELS,
  isMultiFile,
  TOOL_SPEC_LIST,
  type AcceptanceKind,
} from "@/lib/tool-specs";
import { MAX_SERVER_UPLOAD_BYTES } from "@/lib/constants";
import { formatBytes } from "@/lib/file-utils";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "What each Pdfer tool accepts — how many files, which formats — and what it gives back.",
};

const ACCEPTANCE_HELP: Record<AcceptanceKind, string> = {
  "single-file": "Drop one file, in the one format listed.",
  "single-file-multi-format": "Drop one file, in any of the listed formats.",
  "multi-file-single-format": "Drop several files, all in the one format listed.",
  "multi-file-multi-format":
    "Drop several files, mixing any of the listed formats.",
};

export default function DocsPage() {
  return (
    <ToolShell
      icon={BookOpen}
      title="Docs"
      description="What each tool accepts — how many files and which formats — and what it hands back."
    >
      <ToolWorkspace>
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-base font-semibold">How to read this</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every tool states what it accepts right on its own page. The
              labels below describe the two things that matter: how many files
              you can add at once, and which file formats are allowed.
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(ACCEPTANCE_LABELS) as AcceptanceKind[]).map(
                (kind) => {
                  const Icon = isMultiFile(kind) ? Files : FileText;
                  return (
                    <div
                      key={kind}
                      className="rounded-lg border border-border bg-muted/40 p-3"
                    >
                      <dt className="flex items-center gap-2 text-sm font-medium">
                        <Icon
                          className="size-4 shrink-0 text-primary"
                          aria-hidden
                        />
                        {ACCEPTANCE_LABELS[kind]}
                      </dt>
                      <dd className="mt-1 text-xs text-muted-foreground">
                        {ACCEPTANCE_HELP[kind]}
                      </dd>
                    </div>
                  );
                }
              )}
            </dl>
          </section>

          <section className="space-y-4">
            <h2 className="text-base font-semibold">Tools</h2>
            <div className="space-y-4">
              {TOOL_SPEC_LIST.map((spec) => {
                const Icon = spec.icon;
                return (
                  <div
                    key={spec.key}
                    className="rounded-xl border border-border bg-card p-4 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="size-4.5" aria-hidden />
                        </div>
                        <div>
                          <h3 className="font-semibold leading-tight">
                            {spec.label}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {ACCEPTANCE_LABELS[spec.acceptance]}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={spec.route}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                      >
                        Open
                        <ArrowUpRight className="size-3.5" aria-hidden />
                      </Link>
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground">
                      {spec.inputSummary}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        Accepts
                      </span>
                      {spec.formats.map((format) => (
                        <span
                          key={format}
                          className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium"
                        >
                          {format}
                        </span>
                      ))}
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        You get:
                      </span>{" "}
                      {spec.output}
                    </p>
                    {spec.note ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {spec.note}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Limits &amp; privacy</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">
                  On-device first.
                </span>{" "}
                Most tools process files right in your browser — nothing leaves
                your device.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Server jobs are capped.
                </span>{" "}
                Tools that need the server (like Unlock) accept files up to{" "}
                {formatBytes(MAX_SERVER_UPLOAD_BYTES)}. Files are processed in
                memory and never stored.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  No sign-up, no paywall.
                </span>{" "}
                Every tool is free to use.
              </li>
            </ul>
          </section>
        </div>
      </ToolWorkspace>
    </ToolShell>
  );
}
