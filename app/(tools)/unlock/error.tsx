"use client";

import { ToolError } from "@/components/tool-error";

export default function UnlockError({ reset }: { reset: () => void }) {
  return <ToolError reset={reset} />;
}
