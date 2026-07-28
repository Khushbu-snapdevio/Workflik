# Solution: check active membership before trusting the last-workspace pointer, and break the bounce

**Fixed:** 2026-07-28

## What changed

- **`app/platform/post-auth/page.tsx`** — the `lastWorkspaceId` redirect now joins against active `workspaceMembers` for the current user, not just workspace existence (matching the pattern already used a few lines below for the `firstMembership` fallback).
- **`app/app/[workspace]/layout.tsx`** — a non-member now redirects to `/platform/post-auth` (which re-resolves correctly with the above fix) instead of `/auth/login`, removing the bounce target that fed the loop.
- **`app/api/workspaces/[id]/members/[userId]/route.ts`** `DELETE` — now clears the removed user's `lastWorkspaceId` in the same transaction if it pointed at the workspace they were just removed from, so the stale pointer can't cause this for future removals.
- Cleaned up the already-stale `lastWorkspaceId` row for the specific test account from the report, directly in the local dev DB.

## Why this fixes the root cause

Three independent layers, each closing a different part of the loop: the redirect that was wrong in the first place (post-auth trusting a workspace's existence instead of the user's membership), the escape hatch that turned one bad redirect into an infinite loop (`/auth/login`'s unconditional bounce-back), and the data hygiene that let the stale pointer exist at all (removal never clearing it). Any one alone would stop this specific loop; fixing all three prevents the same class of bug from a different entry point.

## Verification

`npx tsc --noEmit` passes on all three files. Verified directly against the local dev DB: confirmed the reported test account (`satasiyasmit28@gmail.com`) had zero active memberships anywhere but a `lastWorkspaceId` still pointing at the "just" workspace, matching the exact loop condition, then confirmed the query fix excludes it.
