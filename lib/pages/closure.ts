// Full implementation in Phase 4.
// ALL parent_id mutations must go through these functions — never update parent_id directly.
// Skipping this corrupts the entire page hierarchy and all permission checks that depend on it.

export async function insertPageWithClosure(
  _tx: unknown,
  _pageId: string,
  _parentId: string | null
): Promise<void> {
  throw new Error("insertPageWithClosure not yet implemented — Phase 4");
}

export async function movePageWithClosure(
  _tx: unknown,
  _pageId: string,
  _newParentId: string | null
): Promise<void> {
  throw new Error("movePageWithClosure not yet implemented — Phase 4");
}

export async function deletePageClosure(
  _tx: unknown,
  _pageId: string
): Promise<void> {
  throw new Error("deletePageClosure not yet implemented — Phase 4");
}
