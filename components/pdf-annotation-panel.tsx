"use client";

import { useCallback, useState } from "react";
import { Upload, PenLine, Type, Square, Circle, Slash, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SecondaryActionButton } from "@/components/app-button";
import { FilePickerButton } from "@/components/file-picker-button";
import { SignaturePadField } from "@/components/signature-pad-field";
import { SignatureBackgroundRemovalDialog } from "@/components/signature-background-removal-dialog";
import { cn } from "@/lib/utils";
import { DEFAULT_SIGNATURE_INK_COLOR } from "@/lib/constants";
import { decodeImageToCanvas } from "@/lib/signature-image";
import type { AnnotationType } from "@/lib/pdf-annotations";

type PdfAnnotationPanelProps = {
  signatureEnabled: boolean;
  onSignatureEnabledChange: (enabled: boolean) => void;
  signaturePng: Uint8Array | null;
  onSignatureChange: (pngBytes: Uint8Array | null) => void;
  onAddSignature: () => void;
  onRemoveSignatures: () => void;
  pageHasSignature: boolean;
  onAddElement: (type: Exclude<AnnotationType, "signature">) => void;
  activePageIndex: number;
};

const ELEMENT_BUTTONS: {
  type: Exclude<AnnotationType, "signature">;
  label: string;
  Icon: typeof Type;
}[] = [
  { type: "text", label: "Text", Icon: Type },
  { type: "rect", label: "Rectangle", Icon: Square },
  { type: "ellipse", label: "Circle", Icon: Circle },
  { type: "line", label: "Line", Icon: Slash },
];

export function PdfAnnotationPanel({
  signatureEnabled,
  onSignatureEnabledChange,
  signaturePng,
  onSignatureChange,
  onAddSignature,
  onRemoveSignatures,
  pageHasSignature,
  onAddElement,
  activePageIndex,
}: PdfAnnotationPanelProps) {
  const [inkColor, setInkColor] = useState<string>(DEFAULT_SIGNATURE_INK_COLOR);
  const [uploadSource, setUploadSource] = useState<HTMLCanvasElement | null>(
    null
  );
  const [uploadNonce, setUploadNonce] = useState(0);

  const hasSignature = !!signaturePng?.length;
  const pageLabel = `page ${activePageIndex + 1}`;

  const handleUploadDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    try {
      const source = await decodeImageToCanvas(file);
      setUploadSource(source);
      setUploadNonce((n) => n + 1);
    } catch (err) {
      console.error("signature upload failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Could not load signature image."
      );
    }
  }, []);

  const handleRemovalConfirm = useCallback(
    (png: Uint8Array) => {
      onSignatureChange(png);
      setUploadSource(null);
      toast.success("Signature image loaded.");
    },
    [onSignatureChange]
  );

  return (
    <div className="flex flex-col gap-5">
      <section className="space-y-4">
        <label className="flex items-start gap-2 rounded-lg border border-border px-3 py-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={signatureEnabled}
            onChange={(e) => onSignatureEnabledChange(e.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium">Signature</span>
            <span className="block text-xs text-muted-foreground">
              Draw or upload a signature, then stamp it anywhere. Image overlay
              only, not a certified digital signature.
            </span>
          </span>
        </label>

        <fieldset
          disabled={!signatureEnabled}
          className={cn(
            "space-y-3 border-0 p-0 m-0",
            !signatureEnabled && "opacity-50"
          )}
        >
          <SignaturePadField
            value={signaturePng}
            onChange={onSignatureChange}
            inkColor={inkColor}
            onInkColorChange={setInkColor}
            disabled={!signatureEnabled}
          />

          <FilePickerButton
            onDrop={handleUploadDrop}
            accept={{
              "image/png": [".png"],
              "image/jpeg": [".jpg", ".jpeg"],
              "image/webp": [".webp"],
            }}
            multiple={false}
            disabled={!signatureEnabled}
          >
            {({ open, disabled: pickerDisabled }) => (
              <SecondaryActionButton
                type="button"
                className="w-full"
                disabled={pickerDisabled}
                onClick={open}
              >
                <Upload className="size-4" />
                Upload signature image
              </SecondaryActionButton>
            )}
          </FilePickerButton>

          <div className="grid grid-cols-2 gap-2">
            <SecondaryActionButton
              type="button"
              disabled={!signatureEnabled || !hasSignature}
              onClick={onAddSignature}
            >
              <PenLine className="size-4" />
              Add sign
            </SecondaryActionButton>
            <SecondaryActionButton
              type="button"
              disabled={!signatureEnabled || !pageHasSignature}
              onClick={onRemoveSignatures}
            >
              <Trash2 className="size-4" />
              Remove sign
            </SecondaryActionButton>
          </div>

          <p className="text-xs text-muted-foreground">
            {hasSignature
              ? `"Add sign" drops a copy on ${pageLabel}. Click again for more; "Remove sign" clears every signature on this page.`
              : "Draw or upload a signature to enable placement."}
          </p>
        </fieldset>
      </section>

      <section className="space-y-3 border-t border-border pt-4">
        <p className="text-sm font-medium">Add to {pageLabel}</p>
        <div className="grid grid-cols-2 gap-2">
          {ELEMENT_BUTTONS.map(({ type, label, Icon }) => (
            <SecondaryActionButton
              key={type}
              type="button"
              onClick={() => onAddElement(type)}
            >
              <Icon className="size-4" />
              {label}
            </SecondaryActionButton>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Each item is added to the current page. Select it on the preview to
          move, resize, restyle, or delete it.
        </p>
      </section>

      <SignatureBackgroundRemovalDialog
        key={uploadNonce}
        open={uploadSource !== null}
        source={uploadSource}
        onConfirm={handleRemovalConfirm}
        onCancel={() => setUploadSource(null)}
      />
    </div>
  );
}
