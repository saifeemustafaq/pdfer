"use client";

import {
  ArrowDown,
  ArrowRight,
  Boxes,
  Cloud,
  Laptop,
  Server,
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
  variant?: "default" | "server" | "client" | "edge";
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

function FlowArrow({ direction = "down" }: { direction?: "down" | "right" }) {
  const Icon = direction === "down" ? ArrowDown : ArrowRight;
  return (
    <div
      className={cn(
        "flex items-center justify-center text-muted-foreground shrink-0",
        direction === "down" ? "py-1" : "px-1"
      )}
      aria-hidden
    >
      <Icon className="w-4 h-4" />
    </div>
  );
}

const processingMatrix = [
  {
    tool: "Merge (combine files)",
    where: "Server",
    route: "POST /api/merge",
    libs: "pdf-lib, sharp",
  },
  {
    tool: "Merge (reorder / remove pages)",
    where: "Browser",
    route: "No API",
    libs: "pdf-lib (pdf-client.ts)",
  },
  {
    tool: "Compress PDF",
    where: "Server",
    route: "POST /api/compress",
    libs: "pdf-lib, sharp",
  },
  {
    tool: "Image to PDF",
    where: "Server",
    route: "POST /api/image-to-pdf",
    libs: "pdf-lib, sharp",
  },
  {
    tool: "PDF to image (ZIP)",
    where: "Browser",
    route: "No API",
    libs: "pdfjs-dist, jszip",
  },
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
            Stateless Next.js app on Netlify. Most PDF work runs on the server
            in memory; merge page editing and PDF-to-image export run entirely
            in the browser. No database, no stored files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* System overview */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">System overview</h3>
            <div className="flex flex-col items-center">
              <FlowNode
                title="Browser (React client components)"
                subtitle="Tool pages, FileDropzone, progress UI"
                className="w-full max-w-md"
              />
              <FlowArrow />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-info mb-2">
                    <Server className="w-3.5 h-3.5" />
                    Server path
                  </div>
                  <FlowNode
                    variant="server"
                    title="Next.js API routes"
                    subtitle="POST /api/merge · compress · image-to-pdf"
                    className="w-full"
                  />
                  <FlowArrow />
                  <FlowNode
                    variant="server"
                    title="proxy.ts"
                    subtitle="Rejects uploads over 6 MB"
                    className="w-full"
                  />
                  <FlowArrow />
                  <FlowNode
                    variant="server"
                    title="lib/services/*"
                    subtitle="pdf-lib + sharp in RAM"
                    className="w-full"
                  />
                  <FlowArrow />
                  <FlowNode
                    variant="server"
                    title="PDF binary response"
                    subtitle="fetch → blob → download"
                    className="w-full"
                  />
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-success mb-2">
                    <Laptop className="w-3.5 h-3.5" />
                    Browser path
                  </div>
                  <FlowNode
                    variant="client"
                    title="Client libraries"
                    subtitle="pdf-client.ts · pdf-export.ts"
                    className="w-full"
                  />
                  <FlowArrow />
                  <FlowNode
                    variant="client"
                    title="pdfjs worker + canvas"
                    subtitle="Page thumbnails & raster export"
                    className="w-full"
                  />
                  <FlowArrow />
                  <FlowNode
                    variant="client"
                    title="Blob / ZIP in memory"
                    subtitle="File never uploaded"
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

          {/* ASCII diagram for quick reference */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Request flow (server tools)</h3>
            <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-[11px] leading-relaxed font-mono text-foreground">
{`User picks files in browser
        │
        ▼
  FormData POST /api/*
        │
        ▼
  proxy.ts (<= 6 MB) --413--> { error: "File too large: 6 MB limit" }
        │
        ▼
  route.ts validates MIME + size
        │
        ▼
  lib/services/*.ts  (pdf-lib + sharp, pure Buffer in/out)
        │
        ▼
  NextResponse(PDF bytes)  ->  client blob  ->  anchor download`}
            </pre>
          </section>

          {/* Processing matrix */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Where each tool runs</h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 font-semibold">Tool</th>
                    <th className="px-3 py-2 font-semibold">Runtime</th>
                    <th className="px-3 py-2 font-semibold hidden sm:table-cell">
                      Entry
                    </th>
                    <th className="px-3 py-2 font-semibold hidden md:table-cell">
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
                            row.where === "Server"
                              ? "bg-info/10 text-info"
                              : "bg-success/10 text-success"
                          )}
                        >
                          {row.where === "Server" ? (
                            <Cloud className="w-3 h-3" />
                          ) : (
                            <Laptop className="w-3 h-3" />
                          )}
                          {row.where}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground hidden sm:table-cell">
                        {row.route}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">
                        {row.libs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
