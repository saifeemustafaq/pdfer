"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

type ProcessOptions = {
  endpoint: string;
  formData: FormData;
  errorFallback?: string;
};

type ProcessSuccess = {
  blob: Blob;
  headers: Headers;
};

/**
 * Generic hook: manages in-flight API state and standard fetch + error handling.
 */
export function useFileProcessor() {
  const [loading, setLoading] = useState(false);

  const process = useCallback(
    async ({
      endpoint,
      formData,
      errorFallback = "Processing failed. Please try again.",
    }: ProcessOptions): Promise<ProcessSuccess | null> => {
      setLoading(true);
      try {
        const res = await fetch(endpoint, { method: "POST", body: formData });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: errorFallback }));
          toast.error(body.error ?? errorFallback);
          return null;
        }

        const blob = await res.blob();
        return { blob, headers: res.headers };
      } catch (err) {
        console.error(`POST ${endpoint} failed:`, err);
        toast.error(errorFallback);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, process };
}
