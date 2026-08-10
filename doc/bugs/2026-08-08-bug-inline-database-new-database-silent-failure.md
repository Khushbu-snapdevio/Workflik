# Bug: "New database" button in an unlinked inline database does nothing on failure

**Reported:** 2026-08-08

## What's broken

An inline database block that has no database linked yet (`/database` was
inserted but "New database" was never clicked, or "Add a database" is
showing) offers "New database" and "Link existing". Clicking "New database"
sometimes produces no visible effect at all — no spinner, no error, the
card just sits there as if the click never registered.

## Reproduction

1. Insert an inline database (`/database`) without linking/creating one
   yet, so the "Add a database" setup card shows.
2. Click "New database".
3. If the underlying `POST /api/workspaces/{id}/databases` request fails
   for any reason (network hiccup, session expired, non-2xx response, or a
   thrown exception before the response is read), nothing on screen
   changes — no error message, no way to tell the click did anything.

## Root cause

`InlineDatabaseView.handleCreateNew` (`components/editor/extensions/reference-blocks.tsx`)
had no error handling at all:

```tsx
async function handleCreateNew() {
  if (!workspaceId || creating) return;
  setCreating(true);
  const res = await fetch(...);
  if (res.ok) { ...updateAttributes(...) }
  setCreating(false);
}
```

Two problems:

1. **A failed request (`res.ok === false`) is silently ignored.** The
   `if (res.ok)` block is simply skipped — no toast, no inline message,
   nothing. This violates this codebase's own rule that every API error
   must surface a recovery UI (`doc/CLAUDE.md` UI Rule 16) — the setup
   card just looks broken instead.
2. **Any thrown exception (network failure, `res.json()` failing to
   parse) skips `setCreating(false)` entirely**, since it wasn't in a
   `finally`. That leaves `creating` stuck `true` forever for that node
   view instance, which means the *next* click is silently swallowed too
   by the `if (!workspaceId || creating) return;` guard at the top — so a
   single transient failure can make the button look permanently dead
   until the page is reloaded.

## Fix

See the paired solution doc.
