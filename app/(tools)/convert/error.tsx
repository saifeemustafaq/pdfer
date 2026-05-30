"use client";

import { ToolError } from "@/components/tool-error";

export default function ConvertError({
  reset,
}: {
  reset: () => void;
}) {
  return <ToolError reset={reset} />;
}
