# Solution: always reserve the comment-badge slot, even at zero comments

**Fixed:** 2026-07-16

## What changed

In both **`components/database/gallery-view.tsx`** and **`components/templates/views/template-gallery-view.tsx`**:
- The properties/comment-count wrapper `div` is now always rendered (removed the `{(filledProps.length > 0 || !!commentCount) && (...)}` gate).
- The comment-count button is now always rendered too, but gets an `invisible` class (not `hidden`) plus `aria-hidden`/`tabIndex={-1}` when `commentCount` is falsy — so it still occupies its exact height, just without being visible or focusable.

## Why this fixes the root cause

`invisible` keeps the element in normal layout flow (unlike `hidden`, which removes it entirely), so every card's content now has the same natural height by construction — title plus a reserved comment-slot — regardless of whether that particular entry has a comment. The card no longer relies on CSS Grid's stretch behavior to *paper over* a height difference with dead space; the height difference doesn't exist in the first place.

## Verification

`tsc --noEmit` passes for both touched files. Not manually verified in a live browser in this session — worth confirming visually: a Gallery view mixing entries with and without comments should show every card in a row at the same height, with no visible empty gap under the shorter ones.
