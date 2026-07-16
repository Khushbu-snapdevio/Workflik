# Solution: raise the filter dropdown's z-index above the Search dialog

**Fixed:** 2026-07-15

## What changed

**`components/search/search-dialog.tsx`** — `FilterChip`'s portaled menu class changed from `fixed z-50 ...` to `fixed z-[820] ...`, placing it above the Search dialog's own panel (`z-[810]`) and backdrop (`z-[800]`).

## Why this fixes the root cause

The dropdown's state, click handling, and option-selection logic were already correct — the only problem was that the menu rendered *behind* the modal that spawned it, so it was invisible and unclickable. Raising its z-index above the dialog's stacking tier makes it render on top, matching the precedent already established for `components/ui/select.tsx` (portals need to out-rank whichever modal/sidebar tier they're triggered from, not just the base page).

## Verification

`tsc --noEmit` passes. Not verified in a live browser in this session — worth confirming: open Search (Ctrl+K), click "Any type", check the option list appears above the dialog and is clickable; repeat for "Any time".
