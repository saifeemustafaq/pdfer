"use client";

import { ToolError } from "@/components/tool-error";

export default function PdfToImageError({
  reset,
}: {
  reset: () => void;
}) {
  return <ToolError reset={reset} />;
}
