"use client";

import { useState } from "react";
import { PrimaryActionButton } from "@/components/app-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignatureInkColorPicker } from "@/components/signature-ink-color-picker";
import { SignaturePad } from "@/components/signature-pad";

type SignaturePadFieldProps = {
  value?: Uint8Array | null;
  onChange: (pngBytes: Uint8Array | null) => void;
  inkColor: string;
  onInkColorChange: (color: string) => void;
  disabled?: boolean;
};

/** Compact signature pad with ink picker and optional larger modal pad. */
export function SignaturePadField({
  value = null,
  onChange,
  inkColor,
  onInkColorChange,
  disabled = false,
}: SignaturePadFieldProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [compactPadKey, setCompactPadKey] = useState(0);

  function handleModalOpenChange(open: boolean) {
    setModalOpen(open);
    if (!open) setCompactPadKey((key) => key + 1);
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <SignatureInkColorPicker
          value={inkColor}
          onChange={onInkColorChange}
          disabled={disabled}
        />

        <SignaturePad
          key={compactPadKey}
          onChange={onChange}
          inkColor={inkColor}
          disabled={disabled}
          size="compact"
          initialPng={value}
          showExpandButton
          onExpandClick={() => setModalOpen(true)}
        />
      </div>

      <Dialog open={modalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="gap-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Draw signature</DialogTitle>
            <DialogDescription>
              Use the larger area for a more natural signature.
            </DialogDescription>
          </DialogHeader>

          <SignatureInkColorPicker
            value={inkColor}
            onChange={onInkColorChange}
            disabled={disabled}
          />

          {modalOpen && (
            <SignaturePad
              onChange={onChange}
              inkColor={inkColor}
              disabled={disabled}
              size="large"
              initialPng={value}
            />
          )}

          <DialogFooter className="-mx-4 -mb-4 border-t bg-muted/50 p-4 sm:justify-end">
            <PrimaryActionButton
              type="button"
              className="w-full sm:w-auto"
              onClick={() => handleModalOpenChange(false)}
            >
              Done
            </PrimaryActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
