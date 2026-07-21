# Solution: read the members endpoint's real field names, filter/limit client-side

**Fixed:** 2026-07-21

## What changed

**`components/editor/extensions/mention-extension.ts`**'s `fetchMentionItems()`:
- Reads `m.userId` / `m.userName` / `m.userEmail` / `m.userImage` — the endpoint's actual response shape — instead of the nonexistent `m.id` / `m.name` / `m.image`.
- Skips non-active members (`m.status !== "active"`) — invited-but-not-yet-joined rows shouldn't be mentionable.
- Resolves a display label via `resolveDisplayName(m.userName, m.userEmail)` (the same helper introduced in the earlier "Former Member" fix), falling back to the email's local part for a member who never set a display name, rather than silently dropping them.
- Since the endpoint doesn't support `q`/`limit` params (it always returns the full list), the query-match filter and the 5-item cap now happen in the loop itself instead of being sent as ignored query-string params.

## Why this fixes the root cause

The mention feature was never actually broken by network/permission issues — it successfully fetched the member list every time, but then discarded every row because it checked fields that don't exist on the endpoint's real response. Reading the fields the endpoint actually returns (matching every other consumer of this same endpoint) is the direct fix; filtering/capping client-side replaces the no-op server-side params with equivalent client-side behavior.

## Verification

`npx tsc --noEmit` passed. Verified live: created an isolated test page and workspace member, typed `@` in the editor, and confirmed the "People" section now lists all three real workspace members (by name, falling back to email-derived name where no display name was set) alongside the existing "Dates" section — previously only Dates ever appeared. Test page and fixture user removed afterward.
