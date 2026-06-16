// Full implementation in Phase 12.
// All permission checks across the app must go through these functions — never inline.

export type WorkspaceRole = "admin" | "editor" | "viewer";
export type AccessLevel = "full_access" | "can_edit" | "can_comment" | "can_view";

export async function requireSession(_headers: Headers) {
  throw new Error("requireSession not yet implemented — Phase 12");
}

export async function requireWorkspaceMember(
  _db: unknown,
  _userId: string,
  _workspaceId: string,
  _minRole: WorkspaceRole
) {
  throw new Error("requireWorkspaceMember not yet implemented — Phase 12");
}

export async function requirePagePermission(
  _db: unknown,
  _userId: string,
  _pageId: string,
  _minLevel: AccessLevel
): Promise<{ effectiveLevel: AccessLevel }> {
  throw new Error("requirePagePermission not yet implemented — Phase 12");
}

export async function getEffectivePermission(
  _db: unknown,
  _userId: string,
  _pageId: string
): Promise<AccessLevel | null> {
  throw new Error("getEffectivePermission not yet implemented — Phase 12");
}
