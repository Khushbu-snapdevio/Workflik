# Bug: guest page-invite bypass flow is broken end-to-end

**Reported:** 2026-07-29 (from `doc/audit/2026-07-29-full-application-audit.md`)

## Symptom

A user invited as a guest to a single page (not as a workspace member) cannot actually reach that page:

1. If they aren't signed in yet when they open the invite link, clicking "Accept invitation" fails with a raw `Unauthorized` error instead of sending them to sign in.
2. Once signed in and accepted, the app tries to navigate them to a URL missing the workspace slug segment (e.g. `/app/{shortId}` instead of `/app/{workspaceSlug}/{shortId}`), which 404s.
3. Even with a correct URL, `WorkspaceLayout` (`app/app/[workspace]/layout.tsx`) unconditionally required a real `workspaceMembers` row and redirected anyone without one to `/platform/post-auth` — which, seeing `onboardingCompleted = false` for the guest's brand-new account, sent them into the mandatory onboarding wizard instead of their page. `doc/CLAUDE.md`'s Onboarding section states guests must skip onboarding entirely and land straight on the shared page.

## Root cause

Three independent bugs compounding on the same flow:

- **`app/invite/guest/[token]/page.tsx`** had no unauthenticated-visitor handling — unlike the working workspace-invite pattern in `app/invite/[token]/page.tsx:79,145`, which redirects through `/auth/login?next=...` before ever calling an authenticated endpoint.
- **`app/api/invite/guest/[token]/route.ts`**'s `POST` handler only ever selected `pages.shortId`, never the owning workspace's `slug`, so the client had no way to build a correct two-segment `/app/{workspaceSlug}/{shortId}` URL even if it tried.
- **`app/app/[workspace]/layout.tsx`** gated every route under it on `workspaceMembers` membership. Page-only guests never get a `workspaceMembers` row by design — their access lives entirely in `pagePermissions` — and `lib/permissions/resolver.ts`'s `getEffectivePermission` already had a working non-member fallback to that table (line 80-83), but it was never reachable because the layout (and `[pageId]/page.tsx`'s own redundant `if (!member) notFound()`) rejected them first.

A secondary gap surfaced while fixing this: several sibling routes under `[workspace]` (notably the workspace-root dashboard, `app/app/[workspace]/page.tsx`) had no membership check of their own — they relied entirely on the layout's redirect to keep non-members out. Once the layout was changed to let page-only guests through, those routes needed their own guard to avoid leaking workspace-wide data (page counts, member counts, recent activity) to a guest who should only ever see the one page they were invited to.
