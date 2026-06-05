"use client";

import { useState } from "react";
import { Download, Loader2, Mail, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  PrimaryActionButton,
  SecondaryActionButton,
} from "@/components/app-button";
import { EmailDeliveryForm } from "@/components/email-delivery-form";
import { triggerBlobDownload } from "@/lib/download-client";
import { buildCompressedFilename } from "@/lib/file-utils";

type EmailMode = "none" | "plain" | "compressed";
type DownloadKind = "none" | "plain" | "compressed";

type MobileOutputDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ready blob when available. */
  blob?: Blob | null;
  /** Lazy re-export when the result is rebuilt on demand. */
  getBlob?: () => Promise<Blob | null>;
  filename: string;
  toolLabel: string;
  supportsCompression?: boolean;
  getCompressedBlob?: () => Promise<Blob | null>;
};

/**
 * Mobile-only action sheet opened by MobileDownloadFab. Surfaces Download and
 * Email (plus compressed variants when supported) without scrolling. Email
 * reuses EmailDeliveryForm so send / size / validation logic stays in one place.
 */
export function MobileOutputDrawer({
  open,
  onOpenChange,
  blob,
  getBlob,
  filename,
  toolLabel,
  supportsCompression = false,
  getCompressedBlob,
}: MobileOutputDrawerProps) {
  const [emailMode, setEmailMode] = useState<EmailMode>("none");
  const [downloading, setDownloading] = useState<DownloadKind>("none");

  const compressedFilename = buildCompressedFilename(filename);
  const busy = downloading !== "none";

  async function resolvePlainBlob(): Promise<Blob | null> {
    if (blob) return blob;
    return getBlob ? getBlob() : null;
  }

  async function handleDownload(kind: "plain" | "compressed") {
    setDownloading(kind);
    try {
      const resolved =
        kind === "compressed"
          ? getCompressedBlob
            ? await getCompressedBlob()
            : null
          : await resolvePlainBlob();
      if (!resolved) return;

      triggerBlobDownload(
        resolved,
        kind === "compressed" ? compressedFilename : filename
      );
      toast.success("Done. Downloading…");
      onOpenChange(false);
    } catch (err) {
      console.error("mobile drawer download failed:", err);
      toast.error("Could not prepare the file. Please try again.");
    } finally {
      setDownloading("none");
    }
  }

  function toggleEmail(mode: "plain" | "compressed") {
    setEmailMode((current) => (current === mode ? "none" : mode));
  }

  function handleOpenChange(next: boolean) {
    if (!next) setEmailMode("none");
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="gap-0 rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom,0px))] md:hidden"
      >
        <div
          aria-hidden
          className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-border"
        />
        <SheetHeader>
          <SheetTitle>Ready to download</SheetTitle>
          <SheetDescription className="truncate">{filename}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 pb-2">
          <div className="grid grid-cols-2 gap-2">
            <PrimaryActionButton
              onClick={() => handleDownload("plain")}
              disabled={busy}
              className="w-full"
            >
              {downloading === "plain" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download
            </PrimaryActionButton>
            <SecondaryActionButton
              onClick={() => toggleEmail("plain")}
              disabled={busy}
              className="w-full"
            >
              <Mail className="size-4" />
              Email
            </SecondaryActionButton>

            {supportsCompression && (
              <>
                <SecondaryActionButton
                  onClick={() => handleDownload("compressed")}
                  disabled={busy}
                  className="w-full"
                >
                  {downloading === "compressed" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Minimize2 className="size-4" />
                  )}
                  Download compressed
                </SecondaryActionButton>
                <SecondaryActionButton
                  onClick={() => toggleEmail("compressed")}
                  disabled={busy}
                  className="w-full"
                >
                  <Mail className="size-4" />
                  Email compressed
                </SecondaryActionButton>
              </>
            )}
          </div>

          {emailMode === "plain" && (
            <EmailDeliveryForm
              key="email-plain"
              inputId="mobile-email-plain"
              blob={blob}
              getBlob={getBlob}
              filename={filename}
              toolLabel={toolLabel}
            />
          )}
          {emailMode === "compressed" && (
            <EmailDeliveryForm
              key="email-compressed"
              inputId="mobile-email-compressed"
              getBlob={getCompressedBlob}
              filename={compressedFilename}
              toolLabel={toolLabel}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
