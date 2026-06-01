"use client";

import { ToolError } from "@/components/tool-error";

export default function EditPdfError({
  reset,
}: {
  reset: () => void;
}) {
  return <ToolError reset={reset} />;
}
