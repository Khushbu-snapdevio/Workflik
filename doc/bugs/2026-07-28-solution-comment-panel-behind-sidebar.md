# Solution: measure the sidebar's real width and match the modal z-index tier

**Fixed:** 2026-07-28

## What changed

**`components/layout/workspace-shell.tsx`** — gave the sidebar wrapper `id="workspace-sidebar"` so its rendered bounds can be measured from elsewhere.

**`components/editor/editor.tsx`** — comment-card placement:
- `spaceLeft` and the left-fallback clamp now subtract `document.getElementById("workspace-sidebar")?.getBoundingClientRect().right` from the available space, so the card's `left` is never allowed to start before the sidebar's actual right edge, whatever the sidebar's current width (it's user-resizable and collapsible).
- Raised the card's z-index from `399`/`400` to `580`/`590` — the app's existing "full-screen modal" tier (same as `alert-dialog.tsx` and `invite-members-modal.tsx`), consistent with the card already rendering its own full-viewport backdrop and functioning like a modal rather than a lightweight contextual popover.

## Why this fixes the root cause

The position fix removes the overlap in the common case (measuring the sidebar directly instead of assuming a fixed offset, so it stays correct across resizing/collapsing). The z-index bump is defense-in-depth for the rest: since the card already behaves like a modal (full backdrop, blocks interaction with the rest of the page), putting it in the modal stacking tier is the correct category for it, not the general in-page-popover tier (`z-[400]`/`z-[500]`) that's documented as intentionally sitting below the sidebar.

## Verification

`npx tsc --noEmit` passes. Not verified in a live browser (no interactive browser session available in this environment) — worth confirming visually: open a comment on a narrow/resized viewport where the card previously fell back to the left side, and check it now clears the sidebar entirely.
