"use client";

import { SecondaryActionButton } from "@/components/app-button";
import { ActionButtonGroup } from "@/components/action-button-group";
import { DownloadButton } from "@/components/download-button";
import { EmailDeliveryForm } from "@/components/email-delivery-form";

type ToolResultFooterProps = {
  blob?: Blob | null;
  getBlob?: () => Promise<Blob | null>;
  downloadFilename: string;
  downloadLabel?: string;
  secondaryLabel: string;
  onSecondary: () => void;
  emailInputId: string;
  toolLabel: string;
  emailDisabled?: boolean;
};

export function ToolResultFooter({
  blob,
  getBlob,
  downloadFilename,
  downloadLabel = "Download",
  secondaryLabel,
  onSecondary,
  emailInputId,
  toolLabel,
  emailDisabled = false,
}: ToolResultFooterProps) {
  return (
    <>
      <ActionButtonGroup>
        <DownloadButton
          blob={blob ?? new Blob()}
          filename={downloadFilename}
          label={downloadLabel}
        />
        <SecondaryActionButton type="button" onClick={onSecondary}>
          {secondaryLabel}
        </SecondaryActionButton>
      </ActionButtonGroup>

      <div className="rounded-xl border border-border bg-card p-4">
        <EmailDeliveryForm
          inputId={emailInputId}
          blob={blob}
          getBlob={getBlob}
          filename={downloadFilename}
          toolLabel={toolLabel}
          disabled={emailDisabled}
        />
      </div>
    </>
  );
}
