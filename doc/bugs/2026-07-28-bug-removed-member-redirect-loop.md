# Bug: removed workspace member gets stuck on a blank-page redirect loop

**Reported:** 2026-07-28

## Symptom

A user removed from their only workspace saw a blank white page on next login, with the URL bouncing between `/platform/post-auth` and `/auth/login` — never landing on real UI, not even the "create a workspace" onboarding screen.

## Root cause

Removing a member (`app/api/workspaces/[id]/members/[userId]/route.ts` `DELETE`) only deleted the `workspaceMembers` row — it never cleared that user's `userPreferences.lastWorkspaceId`, which still pointed at the workspace they'd just lost access to.

On next login, `app/platform/post-auth/page.tsx` redirected to `lastWorkspaceId` after checking only that the *workspace row* still existed — not that the user still had *active membership* in it. That sent them into `app/app/[workspace]/layout.tsx`, which correctly detected they were no longer a member and redirected to `/auth/login` — but with no `?next=` param. The login page's `AuthForm`, seeing a still-valid session, immediately bounced back to `/platform/post-auth` by default. Repeat forever.

There is no `middleware.ts` in this project — the loop is produced entirely by these three route files bouncing off each other.
