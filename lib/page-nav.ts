/**
 * Page navigation helpers shared by the Edit PDF preview tabs. When pages are
 * marked for removal in the Pages tab, the other tabs must never land on one of
 * those pages, so navigation "jumps over" removed pages.
 */

/**
 * Resolve a requested 0-based page index to the nearest kept page, preferring
 * the direction of travel (from -> target). Falls back to the opposite
 * direction, then to the target itself when every page is removed.
 */
export function resolveKeptPage(
  target: number,
  from: number,
  removedPages: Set<number>,
  pageCount: number
): number {
  if (pageCount <= 0) return 0;
  const clamped = Math.max(0, Math.min(pageCount - 1, target));
  if (!removedPages.has(clamped)) return clamped;

  const forward = clamped >= from ? 1 : -1;
  for (let i = clamped; i >= 0 && i < pageCount; i += forward) {
    if (!removedPages.has(i)) return i;
  }
  for (let i = clamped; i >= 0 && i < pageCount; i -= forward) {
    if (!removedPages.has(i)) return i;
  }
  return clamped;
}

/** Number of pages that survive the current page edit. */
export function keptPageCount(
  removedPages: Set<number>,
  pageCount: number
): number {
  return Math.max(0, pageCount - removedPages.size);
}
