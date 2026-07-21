# Solution: wire the Share popover to the real invite-link mechanism, end to end

**Fixed:** 2026-07-21

## What changed

**`components/workspace/workspace-share-button.tsx`** (+ its call site, `app/app/[workspace]/page.tsx`):
- Added a `workspaceId` prop (passed as `ws.id` from the page).
- `copyLink()` is now async: `GET /api/workspaces/{id}/invite-link` to read the current token/active state; if inactive or missing, `POST` to the same endpoint to generate one (same call `components/settings/workspace-general-section.tsx` already makes); then copies `${origin}/invite/{token}` instead of `window.location.href`.
- A `copying` loading state disables the button and swaps in a spinner while the request is in flight (mutation-loading convention); a 403 from the generate step (non-admin, no link enabled yet) or any other failure shows a `toast.error` instead of silently doing nothing.

**`lib/workspaces/invites.ts`**:
- Added `joinWorkspaceViaLinkTx(tx, { workspaceId, userId, role })` — parallel to the existing `acceptWorkspaceInviteTx`, but for the shareable-link path: no pre-created `workspaceMembers` row, no single inviter to notify. Reuses an existing non-active row for that user (e.g. a pending email invite to the same account) if one exists — the unique `(workspaceId, userId)` index forbids a second row — otherwise inserts a fresh active row at the link's configured role.

**`app/api/invite/[token]/accept/route.ts`**:
- When no `workspaceMembers.inviteToken` match is found, falls back to `acceptViaShareLink(token, session)`: looks up `workspaces.inviteLinkToken` (requiring `inviteLinkActive`), no-ops if already an active member, otherwise runs `joinWorkspaceViaLinkTx` in a transaction and writes the same `member.joined` audit log entry the email-invite path already writes.

**`app/invite/[token]/page.tsx`**:
- Same fallback shape on the render side: `renderShareLinkInvite(token)` resolves the workspace by `inviteLinkToken`, redirects to login if signed out (`/auth/login?next=/invite/{token}`, matching the email-invite flow), redirects to `/platform/post-auth` if already an active member, and otherwise renders the existing `AcceptInviteClient` — the exact same "Join {workspace}" UI email invitees see, just without an `invitedEmail` restriction.

## Why this fixes the root cause

The button now copies a link that actually resolves to something joinable (`/invite/{token}` built from the real invite-link API), and the invite-acceptance page/API — which previously had no code path for `workspaces.inviteLinkToken` at all — now recognize and accept it, reusing the existing `AcceptInviteClient` UI and audit-logging pattern rather than introducing a parallel one.

## Verification

`npx tsc --noEmit` passed with no errors across all four changed files.
