# Solution: wrap the create-database request in try/catch/finally and surface failures with a toast

**Fixed:** 2026-08-08

## What changed

**`components/editor/extensions/reference-blocks.tsx`** — `handleCreateNew`
now wraps the fetch in `try`/`catch`/`finally`:

- A non-OK response now calls `toast.error("Failed to create database — try again")`
  and returns, instead of silently falling through.
- Any thrown exception (network failure, JSON parse failure) is caught and
  shows the same toast, instead of propagating unhandled.
- `setCreating(false)` moved into `finally`, so it always runs — success,
  handled failure, or thrown exception — instead of only on the
  success/no-throw path.

Added `import { toast } from "sonner"` (the toast library already used
throughout the app, e.g. `components/editor/extensions/synced-block.tsx`).

## Why this fixes the root cause

The bug wasn't that the click didn't register — it's that a failed request
had zero observable effect, which reads identically to "the button is
broken." Per this codebase's own mutation-loading-state and error-recovery
rules (`doc/CLAUDE.md` UI Rules 16 & 18: every mutation shows in-flight
state and every API error surfaces recovery UI), any failure here should
have been visible and retryable. Now it is: the toast tells the user what
happened, and moving `setCreating(false)` to `finally` guarantees the
button becomes clickable again immediately — no more permanently-stuck
"first failure kills all future clicks" state from the missing `finally`.

The companion search-existing-databases fetch
(`InlineDatabaseView`'s other `useEffect`) was deliberately left alone: its
`catch` only resets a loading flag on `AbortError`, which fires constantly
and expectedly as the user types (each keystroke aborts the previous
in-flight request) — toasting there would be noisy and wrong, unlike
"New database," which is a single explicit user action that deserves
explicit feedback on failure.

## Verification

`npx tsc --noEmit -p .` is clean for this file. `pnpm lint` shows no new
findings in the changed file.

Traced by hand: with the fix, a `res.ok === false` response takes the new
early-return branch (toast shown, `creating` reset via `finally`); a thrown
exception before any state changes reaches the `catch` (toast shown,
`creating` reset via `finally`); the success path is unchanged (`res.ok`
true → parses JSON → `updateAttributes` → `creating` reset via `finally`
instead of the old trailing statement — same effective behavior when
nothing throws).

Not verified with an interactive browser session — see the sibling
`2026-08-08-solution-inline-database-toolbar-dropdowns-blink-closed.md` for
why (no test credentials available for this dev instance's real workspace
data). Recommend a manual check: force a failure (e.g. disconnect network
briefly) while clicking "New database" and confirm a toast appears and the
button is clickable again immediately after.
