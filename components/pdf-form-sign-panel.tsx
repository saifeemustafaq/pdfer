"use client";

import { PdfFormFillPanel } from "@/components/pdf-form-fill-panel";
import { PdfSignatureOptionsPanel } from "@/components/pdf-signature-options-panel";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SIGNATURE_SPEC,
  type FormFieldMeta,
  type SignatureSpec,
} from "@/lib/pdf-form-sign";

type PdfFormSignPanelProps = {
  fields: FormFieldMeta[];
  formFillEnabled: boolean;
  onFormFillEnabledChange: (enabled: boolean) => void;
  values: Record<string, string | boolean>;
  onValuesChange: (values: Record<string, string | boolean>) => void;
  signatureEnabled: boolean;
  onSignatureEnabledChange: (enabled: boolean) => void;
  signatureSpec: SignatureSpec;
  onSignatureSpecChange: (spec: SignatureSpec) => void;
  onSignatureChange: (pngBytes: Uint8Array | null) => void;
  signaturePng?: Uint8Array | null;
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
  signatureSpec,
  onSignatureSpecChange,
  onSignatureChange,
  signaturePng,
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
        spec={signatureSpec}
        onSpecChange={onSignatureSpecChange}
        onSignatureChange={onSignatureChange}
        signaturePng={signaturePng}
        pageCount={pageCount}
      />
    </div>
  );
}

export { DEFAULT_SIGNATURE_SPEC };
