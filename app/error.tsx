"use client";

import { ToolError } from "@/components/tool-error";

export default function RootError({
  reset,
}: {
  reset: () => void;
}) {
  return <ToolError reset={reset} />;
}
