"use client";

import { PdfFormFillPanel } from "@/components/pdf-form-fill-panel";
import { PdfSignatureOptionsPanel } from "@/components/pdf-signature-options-panel";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SIGNATURE_PLACEMENT,
  type FormFieldMeta,
  type SignaturePlacement,
} from "@/lib/pdf-form-sign";

type PdfFormSignPanelProps = {
  fields: FormFieldMeta[];
  formFillEnabled: boolean;
  onFormFillEnabledChange: (enabled: boolean) => void;
  values: Record<string, string | boolean>;
  onValuesChange: (values: Record<string, string | boolean>) => void;
  signatureEnabled: boolean;
  onSignatureEnabledChange: (enabled: boolean) => void;
  signaturePlacement: SignaturePlacement;
  onSignaturePlacementChange: (placement: SignaturePlacement) => void;
  onSignatureChange: (pngBytes: Uint8Array | null) => void;
  pageCount: number;
  className?: string;
};

export function PdfFormSignPanel({
  fields,
  formFillEnabled,
  onFormFillEnabledChange,
  values,
  onValuesChange,
  signatureEnabled,
  onSignatureEnabledChange,
  signaturePlacement,
  onSignaturePlacementChange,
  onSignatureChange,
  pageCount,
  className,
}: PdfFormSignPanelProps) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <PdfFormFillPanel
        fields={fields}
        enabled={formFillEnabled}
        onEnabledChange={onFormFillEnabledChange}
        values={values}
        onValuesChange={onValuesChange}
      />

      <PdfSignatureOptionsPanel
        enabled={signatureEnabled}
        onEnabledChange={onSignatureEnabledChange}
        placement={signaturePlacement}
        onPlacementChange={onSignaturePlacementChange}
        onSignatureChange={onSignatureChange}
        pageCount={pageCount}
      />
    </div>
  );
}

export { DEFAULT_SIGNATURE_PLACEMENT };
