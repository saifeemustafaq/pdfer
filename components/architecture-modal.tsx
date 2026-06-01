"use client";

import {
  ArrowDown,
  ArrowRight,
  Boxes,
  GitBranch,
  Laptop,
} from "lucide-react";
import { SecondaryActionButton } from "@/components/app-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FlowNodeProps = {
  title: string;
  subtitle?: string;
  className?: string;
  variant?: "default" | "server" | "client" | "edge" | "router";
};

function FlowNode({
  title,
  subtitle,
  className,
  variant = "default",
}: FlowNodeProps) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-center",
        variant === "server" && "border-info/40 bg-info/10",
        variant === "client" && "border-success/40 bg-success/10",
        variant === "edge" && "border-warning/40 bg-warning/10",
        variant === "router" && "border-primary/40 bg-primary/10",
        variant === "default" && "border-border bg-card",
        className
      )}
    >
      <p className="text-xs font-semibold leading-tight">{title}</p>
      {subtitle && (
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function FlowArrow({
  direction = "down",
  className,
}: {
  direction?: "down" | "right";
  className?: string;
}) {
  const Icon = direction === "down" ? ArrowDown : ArrowRight;
  return (
    <div
      className={cn(
        "flex items-center justify-center text-muted-foreground shrink-0",
        direction === "down" ? "py-1" : "px-1",
        className
      )}
      aria-hidden
    >
      <Icon className="w-4 h-4" />
    </div>
  );
}

/** Vertical line segment for flowchart connectors. */
function FlowLine({ className }: { className?: string }) {
  return (
    <div
      className={cn("w-px bg-border shrink-0", className)}
      aria-hidden
    />
  );
}

function FlowBranchSplit({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative w-full max-w-md h-5 shrink-0", className)}
      aria-hidden
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2">
        <FlowLine className="h-2.5" />
      </div>
      <div className="absolute top-2.5 left-[25%] right-[25%] h-px bg-border" />
      <div className="absolute top-2.5 left-1/4 -translate-x-1/2">
        <FlowLine className="h-2.5" />
      </div>
      <div className="absolute top-2.5 right-1/4 translate-x-1/2">
        <FlowLine className="h-2.5" />
      </div>
    </div>
  );
}

function FlowBranchMerge({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative w-full max-w-md h-5 shrink-0", className)}
      aria-hidden
    >
      <div className="absolute bottom-2.5 left-1/4 -translate-x-1/2">
        <FlowLine className="h-2.5" />
      </div>
      <div className="absolute bottom-2.5 right-1/4 translate-x-1/2">
        <FlowLine className="h-2.5" />
      </div>
      <div className="absolute bottom-2.5 left-[25%] right-[25%] h-px bg-border" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <FlowLine className="h-2.5" />
      </div>
    </div>
  );
}

function HybridRoutingDiagram() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-muted/40 px-3 py-4 sm:px-4">
      <FlowNode
        title="User picks files"
        subtitle="→ orchestrator"
        className="w-full max-w-xs"
      />
      <FlowArrow />
      <FlowNode
        variant="router"
        title="lib/processing/router.ts"
        className="w-full max-w-xs"
      />
      <FlowArrow className="sm:hidden" />
      <FlowBranchSplit className="hidden sm:block" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
        <div className="flex flex-col items-center gap-2">
          <div className="text-center space-y-0.5 px-1">
            <p className="text-xs font-semibold">Total &gt; 6 MB</p>
            <p className="text-[11px] text-muted-foreground">Local only</p>
          </div>
          <FlowArrow />
          <FlowNode
            variant="client"
            title="Web Worker"
            subtitle="120s timeout"
            className="w-full"
          />
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="text-center space-y-0.5 px-1">
            <p className="text-xs font-semibold">Total ≤ 6 MB</p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Merge/image: device-first
              <br />
              Compress: server-first
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <FlowNode
              variant="client"
              title="Device path"
              subtitle="Web Worker"
              className="w-full"
            />
            <FlowNode
              variant="server"
              title="Server path"
              subtitle="POST /api/*"
              className="w-full"
            />
          </div>
        </div>
      </div>

      <FlowBranchMerge className="hidden sm:block" />
      <FlowArrow />
      <FlowNode
        title="Badge + blob download"
        className="w-full max-w-xs"
      />
      <FlowArrow />
      <FlowNode
        title="On failure (≤ 6 MB only)"
        subtitle="processing-fallback.tsx · Try on server / Try on device"
        className="w-full max-w-sm"
      />
    </div>
  );
}

function ServerRequestFlowDiagram() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-muted/40 px-3 py-4 sm:px-4">
      <FlowNode
        variant="server"
        title="FormData POST /api/*"
        className="w-full max-w-xs"
      />
      <FlowArrow />
      <FlowNode
        variant="edge"
        title="proxy.ts"
        subtitle="≤ 6 MB · 413 if over limit"
        className="w-full max-w-xs"
      />
      <FlowArrow />
      <FlowNode
        title="route.ts"
        subtitle="Validates MIME + size"
        className="w-full max-w-xs"
      />
      <FlowArrow />
      <FlowNode
        variant="server"
        title="lib/services/*.ts"
        subtitle="pdf-lib + sharp, Buffer in/out"
        className="w-full max-w-xs"
      />
      <FlowArrow />
      <FlowNode
        title="NextResponse (PDF bytes)"
        subtitle="Client blob → download"
        className="w-full max-w-xs"
      />
    </div>
  );
}

const processingMatrix = [
  {
    tool: "Merge (combine files)",
    where: "Hybrid",
    defaultRoute: "Device (≤6 MB)",
    entry: "processMerge()",
    libs: "pdf-lib, canvas / sharp",
  },
  {
    tool: "Merge (reorder / remove pages)",
    where: "Browser",
    defaultRoute: "Always device",
    entry: "pdf-client.ts",
    libs: "pdf-lib",
  },
  {
    tool: "Compress PDF",
    where: "Hybrid",
    defaultRoute: "Server (≤6 MB)",
    entry: "processCompress()",
    libs: "pdf-lib, canvas / sharp",
  },
  {
    tool: "Image to PDF",
    where: "Hybrid",
    defaultRoute: "Device (≤6 MB)",
    entry: "processImageToPdf()",
    libs: "pdf-lib, canvas / sharp",
  },
  {
    tool: "PDF to image (ZIP)",
    where: "Browser",
    defaultRoute: "Always device",
    entry: "pdf-export.ts",
    libs: "pdfjs-dist, jszip",
  },
] as const;

const repoMap = [
  { path: "lib/processing/orchestrator.ts", role: "Tool entry: routes each job" },
  { path: "lib/processing/router.ts", role: "local vs server decision" },
  { path: "lib/processing/local/*", role: "Browser PDF ops (canvas)" },
  { path: "lib/processing/server/*", role: "fetch wrappers for /api/*" },
  { path: "lib/processing/worker/*", role: "Web Worker client + bundle source" },
  { path: "public/workers/merge.worker.mjs", role: "Bundled worker (pdf-lib)" },
  { path: "lib/services/*", role: "Server PDF ops (pdf-lib + sharp)" },
  { path: "proxy.ts", role: "Rejects API uploads over 6 MB" },
] as const;

export function ArchitectureModal() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <SecondaryActionButton type="button" className="gap-2">
            <Boxes className="w-4 h-4" />
            App architecture
          </SecondaryActionButton>
        }
      />
      <DialogContent className="sm:max-w-3xl max-h-[min(90dvh,800px)] overflow-y-auto p-5 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            How Pdfer is built
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Stateless Next.js on Netlify. Merge, compress, and image-to-PDF use a
            hybrid router: jobs over 6 MB always run in a browser Web Worker;
            smaller jobs may use the server or your device. PDF-to-image and
            merge page editing always stay local. No database, no stored files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">System overview</h3>
            <div className="flex flex-col items-center">
              <FlowNode
                title="Browser (React client components)"
                subtitle="Tool pages, badges, fallback retry UI"
                className="w-full max-w-md"
              />
              <FlowArrow />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-2">
                    <GitBranch className="w-3.5 h-3.5" />
                    Hybrid tools
                  </div>
                  <FlowNode
                    variant="router"
                    title="lib/processing/orchestrator.ts"
                    subtitle="merge · compress · image-to-PDF"
                    className="w-full"
                  />
                  <FlowArrow />
                  <div className="grid grid-cols-1 gap-2 w-full">
                    <FlowNode
                      variant="client"
                      title="Local: public/workers/*.mjs"
                      subtitle="Web Worker, pdf-lib + canvas"
                      className="w-full"
                    />
                    <FlowNode
                      variant="server"
                      title="Server: POST /api/*"
                      subtitle="proxy.ts (≤6 MB) → lib/services/*"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-success mb-2">
                    <Laptop className="w-3.5 h-3.5" />
                    Always-local tools
                  </div>
                  <FlowNode
                    variant="client"
                    title="lib/pdf-export.ts"
                    subtitle="PDF → image ZIP (pdfjs-dist)"
                    className="w-full"
                  />
                  <FlowArrow />
                  <FlowNode
                    variant="client"
                    title="lib/pdf-client.ts"
                    subtitle="Merge page reorder / remove"
                    className="w-full"
                  />
                  <FlowArrow />
                  <FlowNode
                    variant="client"
                    title="Blob in browser memory"
                    subtitle="No upload"
                    className="w-full"
                  />
                </div>
              </div>
              <FlowArrow />
              <div className="flex items-center gap-2 w-full max-w-md">
                <FlowNode
                  variant="edge"
                  title="Netlify (@netlify/plugin-nextjs)"
                  subtitle="API routes → Serverless Functions"
                  className="flex-1"
                />
                <FlowArrow direction="right" />
                <FlowNode
                  variant="default"
                  title="HTTPS only"
                  subtitle="No third-party file APIs"
                  className="flex-1"
                />
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Hybrid routing (v1)</h3>
            <HybridRoutingDiagram />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Server request flow</h3>
            <p className="text-xs text-muted-foreground">
              Only runs when the router picks the server path and total size is
              at or below 6 MB.
            </p>
            <ServerRequestFlowDiagram />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Where each tool runs</h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 font-semibold">Tool</th>
                    <th className="px-3 py-2 font-semibold">Runtime</th>
                    <th className="px-3 py-2 font-semibold hidden sm:table-cell">
                      Default (≤6 MB)
                    </th>
                    <th className="px-3 py-2 font-semibold hidden md:table-cell">
                      Entry
                    </th>
                    <th className="px-3 py-2 font-semibold hidden lg:table-cell">
                      Libraries
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {processingMatrix.map((row) => (
                    <tr
                      key={row.tool}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2 font-medium">{row.tool}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium",
                            row.where === "Hybrid"
                              ? "bg-primary/10 text-primary"
                              : "bg-success/10 text-success"
                          )}
                        >
                          {row.where === "Hybrid" ? (
                            <GitBranch className="w-3 h-3" />
                          ) : (
                            <Laptop className="w-3 h-3" />
                          )}
                          {row.where}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                        {row.defaultRoute}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground hidden md:table-cell">
                        {row.entry}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden lg:table-cell">
                        {row.libs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Jobs over 6 MB on hybrid tools always use the device path. Staging
              limit per file in the browser: 15 MB.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
