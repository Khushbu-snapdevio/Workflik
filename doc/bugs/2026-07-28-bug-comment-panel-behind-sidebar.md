# Bug: floating comment card renders partially behind the sidebar

**Reported:** 2026-07-28

## Symptom

Opening a comment (from the block gutter icon, a text-selection "Comment" action, or the page-level comment shortcut) could position the floating comment card so its left portion sat underneath the left nav sidebar, hiding part of the card — most reproducible on a narrower viewport, where the card falls back to opening on the editor's left instead of its right.

## Root cause

Two compounding issues in the comment-card placement logic in `components/editor/editor.tsx`:

1. The left-margin fallback computed available space as `editorRect.left` measured from `x=0` — treating the entire span between the viewport edge and the editor as free space, without subtracting the sidebar's own rendered width. So the fallback could place the card starting underneath the sidebar.
2. The card is portaled to `document.body` (a sibling of the sidebar wrapper under `<body>`, same structural situation as `2026-07-14-bug-sidebar-popup-z-index.md`), but its z-index (`399`/`400`) was below the sidebar wrapper's `md:z-[550]` (`components/layout/workspace-shell.tsx`). Wherever the two did overlap, the sidebar painted on top.

This is the same category of bug as `2026-07-14-bug-sidebar-popup-z-index.md` — a body-portaled element using a z-index that doesn't account for the sidebar's documented `z-[550]` stacking tier — just with an added positioning bug on top (the earlier bug was pure z-index; this one also mis-measured its coordinates).
