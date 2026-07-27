# Bug: "Delete workspace" doesn't go through an `<AlertDialog>` confirmation

**Reported:** 2026-07-27

## Symptom

Clicking "Delete workspace…" in Workspace Settings → General → Danger Zone revealed an inline, in-place form (type-the-workspace-name input + Cancel/Delete buttons rendered directly in the page) instead of a modal confirmation dialog.

## Root cause

`components/settings/workspace-general-section.tsx` implemented the delete-confirmation flow as a `deleteOpen` state toggle that expanded an inline `<div>` block within the Danger Zone card, rather than routing through `<AlertDialog>`. This is a direct deviation from Hard Rule 23 ("Delete confirmation is mandatory everywhere. Every delete action must route through an `<AlertDialog>` before executing... Never bypass with a direct onClick handler on a destructive operation") and UI Rule 8 (destructive confirmations must use `<AlertDialog>`, never a plain inline reveal). Every other destructive action in this same file (e.g. "Regenerate the invite link?") already used the shared `ConfirmDialog`/`AlertDialog` pattern — only workspace deletion, the most consequential action on the page, didn't.
