export interface OrderedPage {
  id: string;
  parentId: string | null;
  orderIndex: number;
}

// Deleting a root-level page/database lands the user on the nearest other
// top-level item — the one before it in sidebar order, or the one after if
// it was first — rather than always bouncing to Library. Private and shared
// root pages share one `orderIndex` axis (there's no separate ordering for
// the Private section), so they're treated as one combined list here,
// matching how they'd appear if the sidebar rendered them as a single stack.
export function findRootFallback<T extends OrderedPage>(pages: T[], deletedId: string): T | null {
  const idSet = new Set(pages.map((p) => p.id));
  const roots = pages
    .filter((p) => !p.parentId || !idSet.has(p.parentId))
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const idx = roots.findIndex((p) => p.id === deletedId);
  if (idx === -1) return null;
  return roots[idx - 1] ?? roots[idx + 1] ?? null;
}
