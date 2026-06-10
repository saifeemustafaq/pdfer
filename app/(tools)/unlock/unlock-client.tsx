"use client";

import { useState, useCallback, useRef } from "react";
import { LockKeyhole, Loader2, X, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  PrimaryActionButton,
  IconTouchButton,
} from "@/components/app-button";
import { ToolShell } from "@/components/tool-shell";
import { ToolLanding, ToolWorkspace } from "@/components/tool-landing";
import { FileDropzone } from "@/components/file-dropzone";
import { AcceptedFormats } from "@/components/accepted-formats";
import { TOOL_SPECS } from "@/lib/tool-specs";
import { ProcessingBadge } from "@/components/processing-badge";
import { ToolResultFooter } from "@/components/tool-result-footer";
import { MobileDownloadFab } from "@/components/mobile-download-fab";
import { MobileOutputDrawer } from "@/components/mobile-output-drawer";
import { Input } from "@/components/ui/input";
import {
  unlockPdfOnServer,
  isPasswordError,
} from "@/lib/processing/server/unlock";
import { triggerBlobDownload } from "@/lib/download-client";
import { processCompress } from "@/lib/processing/orchestrator";
import {
  LOCAL_SIZE_WARN_BYTES,
  MAX_SERVER_UPLOAD_BYTES,
  OUTPUT_FILENAMES,
} from "@/lib/constants";
import { formatBytes } from "@/lib/file-utils";
import type { ProcessingInfo } from "@/lib/processing/types";

const SERVER_PROCESSING: ProcessingInfo = {
  mode: "server",
  reason: "Unlock runs on the server",
};

export function UnlockClient() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [attestation, setAttestation] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((files: File[]) => {
    setFile(files[0] ?? null);
    setResultBlob(null);
    setPasswordError(null);
  }, []);

  function handleClear() {
    setFile(null);
    setPassword("");
    setAttestation(false);
    setResultBlob(null);
    setPasswordError(null);
  }

  const overServerLimit = file ? file.size > MAX_SERVER_UPLOAD_BYTES : false;

  async function buildUnlockedBlob(): Promise<Blob | null> {
    if (!file) return null;
    if (!attestation) {
      toast.error("Confirm you own this file or have permission to unlock it.");
      return null;
    }
    if (overServerLimit) {
      toast.error("File exceeds the 6 MB server limit for unlock.");
      return null;
    }
    return unlockPdfOnServer(file, password);
  }

  async function buildCompressedUnlockedBlob(): Promise<Blob | null> {
    const blob = await buildUnlockedBlob();
    if (!blob) return null;
    const source = new File([blob], OUTPUT_FILENAMES.unlock, {
      type: "application/pdf",
    });
    const output = await processCompress(source, "medium");
    return output.blob;
  }

  async function handleUnlock() {
    setProcessing(true);
    setPasswordError(null);
    try {
      const blob = await buildUnlockedBlob();
      if (!blob) return;
      setResultBlob(blob);
      toast.success("Done. Downloading…");
      triggerBlobDownload(blob, OUTPUT_FILENAMES.unlock, 300);
    } catch (err) {
      console.error("unlock failed:", err);
      const message =
        err instanceof Error ? err.message : "Could not unlock this PDF.";
      if (isPasswordError(err)) {
        setPasswordError(message);
        passwordInputRef.current?.focus();
      }
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  }

  const canUnlock =
    !!file && attestation && !processing && !overServerLimit;

  const rightSidebar = file ? (
    <div className="flex flex-col gap-4">
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          PDF password
        </span>
        <Input
          ref={passwordInputRef}
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) setPasswordError(null);
          }}
          placeholder="Enter the password"
          autoComplete="current-password"
          aria-invalid={passwordError ? true : undefined}
        />
        {passwordError && (
          <span className="text-xs text-destructive">{passwordError}</span>
        )}
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={attestation}
          onChange={(e) => setAttestation(e.target.checked)}
        />
        <span>
          I confirm I own this file or have permission to remove its password.
        </span>
      </label>

      <p className="text-xs text-muted-foreground">
        Only unlock PDFs you created or have legal rights to modify. Removing a
        password from someone else&apos;s document may violate copyright or
        contract law. Your password is used once in memory and never stored.
      </p>

      {overServerLimit && (
        <p className="text-sm text-destructive">
          This file exceeds the 6 MB server limit. Try a smaller export or
          unlock locally in another app.
        </p>
      )}

      <PrimaryActionButton
        onClick={handleUnlock}
        disabled={!canUnlock}
        className="w-full"
      >
        {processing && <Loader2 className="w-4 h-4 animate-spin" />}
        {processing ? "Unlocking…" : "Unlock PDF"}
      </PrimaryActionButton>

      {resultBlob && (
        <ToolResultFooter
          blob={resultBlob}
          getBlob={buildUnlockedBlob}
          downloadFilename={OUTPUT_FILENAMES.unlock}
          secondaryLabel="Unlock another PDF"
          onSecondary={handleClear}
          emailInputId="unlock-email"
          toolLabel="Unlock PDF"
        />
      )}
    </div>
  ) : undefined;

  return (
    <>
    <ToolShell
      icon={LockKeyhole}
      title="Unlock PDF"
      description="Remove a password from a PDF you own. Password is used once and never stored."
      rightSidebar={rightSidebar}
    >
      {!file ? (
        <ToolLanding>
          <FileDropzone
            onDrop={handleDrop}
            accept={{ "application/pdf": [".pdf"] }}
            multiple={false}
            maxSize={LOCAL_SIZE_WARN_BYTES}
            label="Drop a password-protected PDF here."
            hint={`Server unlock up to ${formatBytes(MAX_SERVER_UPLOAD_BYTES)}`}
          />
          <AcceptedFormats spec={TOOL_SPECS.unlock} />
        </ToolLanding>
      ) : (
        <ToolWorkspace>
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <FileText className="size-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  {formatBytes(file.size)}
                </p>
              </div>
              <IconTouchButton
                type="button"
                onClick={handleClear}
                aria-label="Remove file"
                disabled={processing}
              >
                <X className="size-5" />
              </IconTouchButton>
            </div>

            <ProcessingBadge
              mode={SERVER_PROCESSING.mode}
              reason={SERVER_PROCESSING.reason}
            />
          </div>
        </ToolWorkspace>
      )}
    </ToolShell>

    <MobileDownloadFab blob={resultBlob} onClick={() => setDrawerOpen(true)} />
    <MobileOutputDrawer
      open={drawerOpen}
      onOpenChange={setDrawerOpen}
      blob={resultBlob}
      getBlob={buildUnlockedBlob}
      filename={OUTPUT_FILENAMES.unlock}
      toolLabel="Unlock PDF"
      supportsCompression
      getCompressedBlob={buildCompressedUnlockedBlob}
    />
    </>
  );
}
