# Solution: carry `next` through sign-in, and register the mention node in the public viewer

**Fixed:** 2026-07-21

## What changed

**`app/p/[token]/page.tsx`**:
- Both "Sign in to Pagevo" links now point to `` `/auth/login?next=${encodeURIComponent(`/p/${token}`)}` `` instead of a bare `/auth/login` — the visitor's original destination is now explicit.
- `NotPublicScreen` takes a `token` prop (both call sites updated) so its own sign-in CTA can carry the same `next` value.

**`app/auth/_components/auth-form.tsx`**:
- The "already have a session" effect now does `router.replace(callbackURL)` instead of a hard-coded `router.replace("/platform/post-auth")`, so a visitor who's already signed in when they follow a `/auth/login?next=...` link is also sent to the right place, not just a fresh sign-in.

No change to `/platform/post-auth` itself — it remains the correct fallback for sign-ins with no specific destination (invite acceptance, onboarding, last-active workspace); the fix is that a public-link visit no longer reaches it in the first place, since `next` now points straight back at `/p/{token}`.

**`app/p/[token]/public-viewer.tsx`**:
- Registered `MentionNode` (imported from `components/editor/extensions/mention-node`) in `PublicPageViewer`'s TipTap extensions array, alongside the other read-only content extensions. No `workspaceSlug` is configured — an anonymous public viewer can't open a page mention's `/app/{slug}/...` link anyway, so it renders as resolved text (`@name`, `📄 Page Title`, `📅 date`) rather than a link, matching `mention-node.ts`'s own fallback behavior when no workspace context is given.

## Why this fixes the root cause

The sign-in flow's redirect plumbing (`callbackURL` threaded through magic link / password / Google) already worked correctly — it just never received a `next` value from the one entry point (public share links) that needed to preserve one. Passing `next=/p/{token}` uses that existing mechanism instead of adding a new one. Since "Share to web" intentionally never grants workspace membership, sending the visitor back to the same public view (now merely "signed in" rather than "signed in AND placed inside some workspace") is the behavior consistent with how the two sharing mechanisms are documented to differ.

The mention fix addresses why a single mention node was blanking the entire page: the public viewer's TipTap schema had no `mention` node type registered at all, so `nodeFromJSON` failed on the whole document, not just that node. Registering the same extension the authenticated editor already uses removes the unknown-node-type condition entirely.

## Verification

`npx tsc --noEmit` passed with no errors across all three changed files.
