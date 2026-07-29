# Solution: sign-in redirect, correct URL, and a scoped guest-access bypass

**Fixed:** 2026-07-29

## What changed

- **`app/invite/guest/[token]/page.tsx`** — now uses `useSession()` (`lib/auth/client.ts`) and redirects unauthenticated visitors to `/auth/login?next=/invite/guest/{token}` before they can hit "Accept", mirroring the pattern already used by `app/invite/[token]/page.tsx`. The invitation-preview fetch is deferred until a session exists.
- **`app/api/invite/guest/[token]/route.ts`** `POST` — now also looks up the page's workspace `slug` and returns it as `workspaceSlug`; also sets `users.onboardingCompleted = true` for the accepting user in the same transaction, so the onboarding wizard never applies to page-only guests (matches `doc/CLAUDE.md`'s "Guest bypass" spec) even if they land on a route the layout can't shortcut.
- **`app/invite/guest/[token]/page.tsx`** `accept()` — redirects to `/app/{workspaceSlug}/{shortId}` (both segments) instead of the previous single-segment `/app/{shortId}`.
- **`lib/workspaces/auth.ts`** — added `hasWorkspaceGuestAccess(workspaceId, userId)`, checking for any `pagePermissions` row on a page within that workspace for the user.
- **`app/app/[workspace]/layout.tsx`** — when a user has no `workspaceMembers` row, it now checks `hasWorkspaceGuestAccess` before falling back to the old `/platform/post-auth` redirect. A page-only guest gets a minimal shell (`children` + `Toaster`, no `Sidebar`/`WorkspaceShell`) instead of the full member layout — the full layout's sidebar queries the entire workspace page tree, favorites, etc. unconditionally, which would leak workspace-wide navigation to someone who's only supposed to see one page.
- **`app/app/[workspace]/[pageId]/page.tsx`** — removed the redundant `if (!member) notFound()` gate; `getEffectivePermission` (already wired in for Hard Rule 3) is now the sole access check, since it already resolves both workspace-member and page-only-guest access correctly. `member` is now nullable for guests; `isAdmin` updated to `member?.role === "admin"`.
- **`app/app/[workspace]/page.tsx`** (workspace root/dashboard) — added its own `getWorkspaceMember` + `notFound()` guard. This route queries workspace-wide data (page counts, member counts, recent activity) unconditionally and previously relied solely on the layout's redirect to keep non-members out; now that the layout lets page-only guests through, this route needs to reject them itself.

Sibling routes (`library`, `trash`, `templates`, `settings/general`, `settings/members`, `new`, `new-database`, `t/[pageId]`) already had their own independent membership guards, so they continue to correctly block page-only guests without any change. `settings/profile`, `settings/sessions`, `settings/notifications`, and `search` are purely user-account-scoped or client-only and were already safe regardless of workspace membership.

## Why this fixes the root cause

Each of the three original bugs is fixed at its actual source rather than papered over: the client now establishes a session before ever calling the authenticated accept endpoint; the API now returns the data the client actually needs to build a correct URL; and the workspace layout's membership gate now defers to the permission resolver that already knew how to authorize page-only guests, instead of blocking them before that logic ever ran. The new dashboard guard closes the data-leak gap that opening the layout gate would otherwise have introduced, without touching any route that already gated itself correctly.

## Verification

`npx tsc --noEmit` passes with no errors across the full project. Traced the full flow by hand: unauthenticated guest → `/auth/login?next=/invite/guest/{token}` → back to invite page with a session → accept → API returns `{ shortId, workspaceSlug }` → client navigates to `/app/{workspaceSlug}/{shortId}` → `WorkspaceLayout` finds no `workspaceMembers` row but does find a `pagePermissions` row → renders the minimal guest shell → `[pageId]/page.tsx`'s `getEffectivePermission` resolves the guest's explicit grant and renders the page. Confirmed a guest hitting `/app/{workspaceSlug}` (dashboard) or other sibling routes still gets `notFound()`/redirected, not a data leak.
