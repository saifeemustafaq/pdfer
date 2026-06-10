"use client";

import { useEffect } from "react";
import { extractImagesFromDataTransfer } from "@/lib/clipboard-image";

/**
 * Listen for Cmd/Ctrl+V image pastes on the document and forward image files.
 * Pastes targeting text fields are ignored so normal typing is unaffected.
 *
 * `onImages` is expected to be stable (e.g. wrapped in useCallback); it is a
 * dependency so the listener always calls the latest handler.
 */
export function useImagePaste(
  onImages: (files: File[]) => void,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;

    function handlePaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA")
      ) {
        return;
      }

      const files = extractImagesFromDataTransfer(event.clipboardData);
      if (files.length > 0) {
        event.preventDefault();
        onImages(files);
      }
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [enabled, onImages]);
}
