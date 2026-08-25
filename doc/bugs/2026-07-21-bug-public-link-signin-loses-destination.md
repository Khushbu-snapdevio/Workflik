# Bug: signing in from a public page link drops the visitor into a random new workspace

**Reported:** 2026-07-21

## Symptom

Opening a public share link (`/p/{token}`, "Share to web") shows the read-only page, but the mentioned person's name renders as a bare "@" instead of a resolved name/chip. Clicking "Sign in to Pagevo" and completing sign-in doesn't return the visitor to the page they were viewing — instead they land inside a brand-new, unrelated "My Workspace," with no path back to the page that was shared with them.

## Root cause

Two independent bugs compound into one bad first impression:

1. **No redirect destination was ever captured.** `app/p/[token]/page.tsx`'s "Sign in to Pagevo" links (both the normal header CTA and the disabled/private-link CTA) were plain `href="/auth/login"` with no `next` query param. `app/auth/_components/auth-form.tsx` already reads `searchParams.get("next")` to build its post-login `callbackURL` (line 68) and correctly threads it through magic link, password, and Google sign-in — but with no `next` ever supplied, it always fell back to `/platform/post-auth`. A second, narrower instance of the same bug: `auth-form.tsx`'s "already signed in" effect hard-coded `router.replace("/platform/post-auth")` instead of using `callbackURL`, so even a visitor who already had a session on another tab would get bounced the same way.
2. **`/platform/post-auth` has no concept of "a specific destination was intended."** It's a fixed-fallback router: accept any pending workspace invite → else finish onboarding → else go to the last-active workspace → else the first membership → else (final fallback) `redirect("/app/workspaces/new")`. A public share link intentionally grants no workspace membership at all (`publicLinks` is a pure anonymous, token-gated view — see `lib/db/schema/sharing.ts` — completely separate from the `guestInvitations` mechanism that does grant access to a specific page). So a first-time signer-up from a public link has no invite and no membership, falls through every branch, and lands on "create a new workspace" — which is exactly the observed "My Workspace" screen.

Separately: the "@" rendering bug is `app/p/[token]/public-viewer.tsx`'s TipTap extension list not registering `MentionNode` at all. Since the schema has no `mention` node type, `@tiptap/core`'s `nodeFromJSON` throws on the first mention it finds anywhere on the page and silently falls back to blank content for the **entire document** (not just the block containing the mention) — the visible "@" in the screenshot is what's left after that failure, not a partial mention render.
