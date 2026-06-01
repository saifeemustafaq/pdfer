"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { SecondaryActionButton } from "@/components/app-button";
import { sendResultByEmail } from "@/lib/email-client";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { formatBytes } from "@/lib/file-utils";
import { cn } from "@/lib/utils";

type EmailDeliveryFormProps = {
  /** Static blob when already available. */
  blob?: Blob | null;
  /** Resolve blob on send (e.g. merge export or compress pipeline). */
  getBlob?: () => Promise<Blob | null>;
  filename: string;
  toolLabel: string;
  disabled?: boolean;
  className?: string;
  inputId?: string;
};

export function EmailDeliveryForm({
  blob,
  getBlob,
  filename,
  toolLabel,
  disabled = false,
  className,
  inputId = "email-delivery",
}: EmailDeliveryFormProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const previewBlob = blob ?? null;
  const overLimit = previewBlob ? previewBlob.size > MAX_UPLOAD_BYTES : false;
  const busy = disabled || sending;

  async function handleSend() {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter your email address.");
      return;
    }

    setSending(true);
    try {
      const fileBlob = previewBlob ?? (getBlob ? await getBlob() : null);
      if (!fileBlob) return;

      if (fileBlob.size > MAX_UPLOAD_BYTES) {
        toast.error("File too large for email: 6 MB limit. Download instead.");
        return;
      }

      await sendResultByEmail({
        blob: fileBlob,
        filename,
        email: trimmed,
        toolLabel,
      });
      toast.success("Sent. Check your inbox.");
    } catch (err) {
      console.error("sendResultByEmail failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Could not send email. Please try again."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={cn("space-y-2 pt-3 border-t border-border", className)}>
      <label htmlFor={inputId} className="text-xs font-medium block">
        Email delivery{" "}
        <span className="font-normal text-muted-foreground">
          (only for files under 6 MB)
        </span>
      </label>
      <input
        id={inputId}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={busy}
        className={cn(
          "w-full min-h-12 rounded-md border border-border bg-background",
          "px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      />
      {overLimit && previewBlob && (
        <p className="text-xs text-muted-foreground">
          {formatBytes(previewBlob.size)} exceeds the 6 MB email limit. Download
          instead.
        </p>
      )}
      <SecondaryActionButton
        type="button"
        onClick={handleSend}
        disabled={busy || (overLimit && !getBlob)}
        className="w-full"
      >
        {sending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Mail className="w-4 h-4" />
        )}
        {sending ? "Sending…" : "Send to my email"}
      </SecondaryActionButton>
    </div>
  );
}
