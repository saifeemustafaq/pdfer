"use client";

import { useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { SecondaryActionButton } from "@/components/app-button";
import {
  isClipboardReadSupported,
  readImagesFromClipboard,
} from "@/lib/clipboard-image";

type PasteImageButtonProps = {
  onImages: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
};

/** Reads an image from the clipboard via the async Clipboard API (desktop + mobile). */
export function PasteImageButton({
  onImages,
  disabled = false,
  className,
  label = "Paste image",
}: PasteImageButtonProps) {
  const [busy, setBusy] = useState(false);

  async function handlePaste() {
    // Browsers without the async Clipboard API (e.g. Firefox) can still paste
    // via the keyboard, so point the user there instead of failing silently.
    if (!isClipboardReadSupported()) {
      toast.info("This browser can't paste from a button — use ⌘V / Ctrl+V instead.");
      return;
    }

    setBusy(true);
    try {
      const files = await readImagesFromClipboard();
      if (files.length === 0) {
        toast.info("No image on the clipboard. Copy an image first, then paste.");
        return;
      }
      onImages(files);
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError") {
        toast.error("Clipboard access was blocked. Allow clipboard permission and try again.");
      } else {
        toast.error("Couldn't read an image from the clipboard.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SecondaryActionButton
      type="button"
      onClick={handlePaste}
      disabled={disabled || busy}
      className={className}
    >
      <ClipboardPaste className="size-4" />
      {busy ? "Pasting…" : label}
    </SecondaryActionButton>
  );
}
