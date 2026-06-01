"use client";

import { useMemo } from "react";
import { buildRoutingContext, decide } from "@/lib/processing/router";
import { getDeviceHints } from "@/lib/processing/device-context";
import type { ProcessingInfo, ProcessingOperation } from "@/lib/processing/types";

export function useRoutingBadge(
  operation: ProcessingOperation,
  files: File[],
  processingInfo: ProcessingInfo | null
) {
  const routingDecision = useMemo(() => {
    if (files.length === 0) return null;
    return decide(buildRoutingContext(operation, files, getDeviceHints()));
  }, [operation, files]);

  return processingInfo ?? routingDecision;
}
