# Bug: "Save preferences" button stays enabled with no changes made

**Reported:** 2026-07-28

## Symptom

On Settings → Notifications, the "Save preferences" button is always clickable, even immediately after the page loads with no edits made — it only ever disables while a save request is in flight.

## Root cause

`app/app/[workspace]/settings/notifications/page.tsx` gated the button on `disabled={saving}` only — there was no tracking of whether the current form values differ from what was last loaded/saved. This violates CLAUDE.md Hard Rule 18 ("Disable submit until valid and dirty, for edit forms").
