"use client";

import { Input } from "@/components/ui/input";
import { SecondaryActionButton } from "@/components/app-button";
import { cn } from "@/lib/utils";
import {
  getSignedPageIndices,
  type SignaturePageScope,
  type SignatureSpec,
} from "@/lib/pdf-form-sign";

type SignaturePageScopePanelProps = {
  spec: SignatureSpec;
  onChange: (spec: SignatureSpec) => void;
  pageCount: number;
  disabled?: boolean;
};

export function SignaturePageScopePanel({
  spec,
  onChange,
  pageCount,
  disabled = false,
}: SignaturePageScopePanelProps) {
  function patch(partial: Partial<SignatureSpec>) {
    onChange({ ...spec, ...partial });
  }

  function setScope(scope: SignaturePageScope) {
    if (scope === "range") {
      patch({
        pageScope: scope,
        rangeStart: spec.rangeStart ?? 1,
        rangeEnd: spec.rangeEnd ?? pageCount,
      });
      return;
    }

    if (scope === "selected") {
      const selectedPages =
        spec.selectedPages.length > 0
          ? spec.selectedPages.filter((index) => index >= 0 && index < pageCount)
          : [Math.min(spec.activePageIndex, Math.max(0, pageCount - 1))];
      patch({
        pageScope: scope,
        selectedPages:
          selectedPages.length > 0 ? selectedPages : [0],
      });
      return;
    }

    patch({ pageScope: scope });
  }

  function toggleSelectedPage(pageIndex: number, checked: boolean) {
    const next = checked
      ? [...new Set([...spec.selectedPages, pageIndex])].sort((a, b) => a - b)
      : spec.selectedPages.filter((index) => index !== pageIndex);
    patch({ selectedPages: next });
  }

  function selectAllPages() {
    patch({
      selectedPages: Array.from({ length: pageCount }, (_, index) => index),
    });
  }

  function clearSelectedPages() {
    patch({ selectedPages: [spec.activePageIndex] });
  }

  const signedCount = getSignedPageIndices(spec, pageCount).length;

  return (
    <fieldset
      disabled={disabled}
      className={cn("space-y-3 border-0 p-0 m-0", disabled && "opacity-50")}
    >
      <legend className="text-xs font-medium text-muted-foreground">
        Apply signature to
      </legend>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={spec.pageScope === "all"}
            onChange={() => setScope("all")}
            disabled={disabled}
          />
          All pages
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={spec.pageScope === "range"}
            onChange={() => setScope("range")}
            disabled={disabled}
          />
          Page range
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={spec.pageScope === "selected"}
            onChange={() => setScope("selected")}
            disabled={disabled}
          />
          Pick pages
        </label>
      </div>

      {spec.pageScope === "range" && pageCount > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min={1}
            max={pageCount}
            value={spec.rangeStart ?? 1}
            onChange={(e) =>
              patch({
                rangeStart: Number.parseInt(e.target.value, 10) || 1,
              })
            }
            aria-label="Signature from page"
            disabled={disabled}
          />
          <Input
            type="number"
            min={1}
            max={pageCount}
            value={spec.rangeEnd ?? pageCount}
            onChange={(e) =>
              patch({
                rangeEnd: Number.parseInt(e.target.value, 10) || pageCount,
              })
            }
            aria-label="Signature to page"
            disabled={disabled}
          />
        </div>
      )}

      {spec.pageScope === "selected" && pageCount > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <SecondaryActionButton
              type="button"
              className="h-8 px-2 text-xs"
              disabled={disabled}
              onClick={selectAllPages}
            >
              Select all
            </SecondaryActionButton>
            <SecondaryActionButton
              type="button"
              className="h-8 px-2 text-xs"
              disabled={disabled}
              onClick={clearSelectedPages}
            >
              Clear
            </SecondaryActionButton>
          </div>
          <div className="max-h-32 overflow-y-auto rounded-md border border-border p-2">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: pageCount }, (_, pageIndex) => {
                const checked = spec.selectedPages.includes(pageIndex);
                return (
                  <label
                    key={pageIndex}
                    className={cn(
                      "flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
                      checked
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={(e) =>
                        toggleSelectedPage(pageIndex, e.target.checked)
                      }
                      disabled={disabled}
                    />
                    {pageIndex + 1}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {signedCount} page{signedCount !== 1 ? "s" : ""} will be signed on export.
      </p>

      <label className="flex items-start gap-2 rounded-lg border border-border px-3 py-2.5">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={spec.perPagePlacement}
          onChange={(e) => patch({ perPagePlacement: e.target.checked })}
          disabled={disabled}
        />
        <span>
          <span className="block text-sm font-medium">
            Different position per page
          </span>
          <span className="block text-xs text-muted-foreground">
            Off: one placement for every signed page. On: edit each page
            separately in the preview.
          </span>
        </span>
      </label>
    </fieldset>
  );
}
