# Solution: move the delete-workspace confirmation into an `<AlertDialog>` modal

**Fixed:** 2026-07-27

## What changed

**`components/settings/workspace-general-section.tsx`** — replaced the inline reveal-in-place form with an `AlertDialog` modal (title, permanent-deletion warning, type-the-workspace-name input, Cancel/destructive Delete actions), following the same "type name to confirm" pattern already used in Orbit Admin's `ForceDeleteWorkspaceButton` (`components/orbit/orbit-admin-actions.tsx`). The confirm button stays disabled until the typed name matches exactly; the dialog can't be dismissed while a delete request is in flight; on failure it stays open with the error shown inline so the user can retry.

## Why this fixes the root cause

This brings workspace deletion in line with Hard Rule 23 and every other destructive action in the same file, instead of being the one exception that bypassed the mandatory `<AlertDialog>` confirmation pattern. No backend/API changes were needed — this was purely a presentation change to an already-correct delete flow.

## Verification

Verified live via a scripted browser session against the running dev server: the modal opens on "Delete workspace…", the confirm button is disabled on open and while the typed name doesn't match, becomes enabled only on an exact match, and Cancel closes the dialog and clears the input without deleting anything.
