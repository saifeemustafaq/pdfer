"use client";

import { ToolError } from "@/components/tool-error";

export default function SplitError({ reset }: { reset: () => void }) {
  return <ToolError reset={reset} />;
}
