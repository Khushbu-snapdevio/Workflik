# Solution: surface the API's actual error message

**Fixed:** 2026-07-28

## What changed

`components/workspace/invite-members-modal.tsx` — on a failed invite request, now reads `error` from the response's JSON body (falling back to `HTTP <status>` if the body isn't JSON, or `"Network error"` if the request itself threw) and includes it in the shown message, instead of a fixed generic string.

## Why this fixes the root cause

The invite endpoint was already returning specific, correct error reasons — the bug was purely the client discarding them. Reading and displaying the real message requires no backend change.

## Verification

`npx tsc --noEmit` passes. Confirmed against a real local DB: queried `workspace_members` directly and found the specific failing case from the report (the invited email was already an active admin of that workspace), matching the 409 the API would return.
