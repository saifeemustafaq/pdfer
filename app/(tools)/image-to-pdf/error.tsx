"use client";

import { ToolError } from "@/components/tool-error";

export default function ImageToPdfError({
  reset,
}: {
  reset: () => void;
}) {
  return <ToolError reset={reset} />;
}
