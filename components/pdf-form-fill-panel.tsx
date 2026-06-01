"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FormFieldMeta } from "@/lib/pdf-form-sign";

type PdfFormFillPanelProps = {
  fields: FormFieldMeta[];
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  values: Record<string, string | boolean>;
  onValuesChange: (values: Record<string, string | boolean>) => void;
};

export function PdfFormFillPanel({
  fields,
  enabled,
  onEnabledChange,
  values,
  onValuesChange,
}: PdfFormFillPanelProps) {
  function setFieldValue(name: string, value: string | boolean) {
    onValuesChange({ ...values, [name]: value });
  }

  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No fillable form fields in this PDF. You can still add a signature
        below.
      </p>
    );
  }

  return (
    <>
      <label className="flex items-start gap-2 rounded-lg border border-border px-3 py-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        <span>
          <span className="block text-sm font-medium">Fill form fields</span>
          <span className="block text-xs text-muted-foreground">
            Off by default. Applies your entries on export when checked.
          </span>
        </span>
      </label>

      <fieldset
        disabled={!enabled}
        className={cn("space-y-3 border-0 p-0 m-0", !enabled && "opacity-50")}
      >
        <p className="text-sm font-medium">Form fields</p>
        {fields.map((field) => (
          <label key={field.name} className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {field.name}
            </span>
            {field.kind === "checkbox" ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={values[field.name] === true}
                  onChange={(e) => setFieldValue(field.name, e.target.checked)}
                  disabled={!enabled}
                />
                Checked
              </label>
            ) : field.kind === "dropdown" || field.kind === "radio" ? (
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                value={String(values[field.name] ?? "")}
                onChange={(e) => setFieldValue(field.name, e.target.value)}
                disabled={!enabled}
              >
                <option value="">Select…</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={String(values[field.name] ?? "")}
                onChange={(e) => setFieldValue(field.name, e.target.value)}
                disabled={!enabled}
              />
            )}
          </label>
        ))}
      </fieldset>
    </>
  );
}
