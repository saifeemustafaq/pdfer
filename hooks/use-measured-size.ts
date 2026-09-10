"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MeasuredSize = {
  width: number;
  height: number;
};

const EMPTY: MeasuredSize = { width: 0, height: 0 };

/**
 * Track an element's content-box size. Measuring the content box (rather than
 * the rendered children) keeps the result independent of whatever is placed
 * inside, so it is safe to size that content from the measurement.
 */
export function useMeasuredSize<T extends HTMLElement>() {
  const [size, setSize] = useState<MeasuredSize>(EMPTY);
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;

    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    // ResizeObserver delivers an initial observation on observe(), so there is
    // no need to seed the size synchronously.
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return { ref, size };
}

/** Current viewport height in CSS pixels, kept in sync with window resizes. */
export function useViewportHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    function update() {
      setHeight(window.innerHeight);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return height;
}
