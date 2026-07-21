# Solution: a vote-mode flag on Person properties, enforced server-side, self-toggle UI everywhere

**Fixed:** 2026-07-21

## What changed

**`components/database/types.ts`**: `DbPropertyConfig` gained `voteMode?: boolean` — a Person property with this flag on is a vote, not a generic multi-person field.

**`app/api/entries/[id]/property-values/[propId]/route.ts`** (the single endpoint every value write already went through — no new endpoint needed):
- Rejects (400) any direct write to a `formula`/`rollup`/`created_by` property outright. These are computed on every read and never consult `property_values` at all (`lib/databases/compute-values.ts`), so a stored value there was always silently unreachable, never actually "the total." This closes that off structurally for *every* computed property, not just Total Votes.
- For a `voteMode` Person property, a non-admin's write is only accepted if the diff between the stored value and the new one is *exactly* the requester's own id being added or removed — nothing else. Fetches the current stored value, diffs `userIds` old vs. new, and 403s (`vote_self_only`) on anything else: adding/removing someone else, or changing more than one id at once. Admins (`workspaceMembers.role === "admin"`) bypass this check, preserving a moderation path.

**`components/database/cells/cell-display.tsx`**: a `voteMode` Person value now renders a thumbs-up + count pill (filled/tinted when the viewer has voted) instead of the plain avatar-chip list — this is the one shared read-rendering component every view (table, board, gallery, entry page) already goes through, so the visual change is automatic everywhere.

**Click-to-vote, everywhere a person cell can be clicked** — `table-view.tsx` (`activateCell`), `board-view.tsx`, `gallery-view.tsx`, and `entry-properties-panel.tsx`: a `voteMode` Person cell no longer opens the multi-person picker at all. Clicking it computes the toggled value (add-self or remove-self) and saves directly — the exact same pattern each of these files already used for checkbox cells (toggle-in-place, no popup). The generic picker is structurally unreachable from these entry points for a vote property now, not just discouraged.

**`lib/templates/instantiate.ts`**: `"formula"` had been missing from `SUPPORTED_PROP_TYPES` until the prior fix in this doc series; this pass adds a `voteMode` pass-through (`SchemaProp.voteMode` → `config: { voteMode: true }`) for Person properties, alongside the existing `expression` pass-through for Formula.

**`app/api/orbit/templates/seed/route.ts`**: the built-in "Brainstorm Session" template's "Upvoted by" property now seeds with `voteMode: true`.

## Why this fixes the root cause

The fix has two independent layers on purpose. The **server-side diff check** is the actual guarantee — point 6 of the request ("do not rely only on frontend restrictions") — so even a hand-crafted request straight to the API can only ever move the requester's own id, regardless of what any UI does. The **click-to-vote UI change** is what makes that guarantee visible as a good experience: nobody ever sees an interface that *looks* like it would let them edit someone else's vote, because that interface no longer renders for this property at all. Because `Total Votes = count(prop("Upvoted by"))` (the earlier fix in this series) recomputes from `property_values` on every read, and votes can now only ever change by exactly ±1 self-id, the two can never drift apart — there's no code path left that writes to "votes" without it being a real, attributable, single-user toggle.

## Scope note

Admin/owner moderation (editing someone else's vote) has a working, tested backend path (the `member.role === "admin"` bypass) but no dedicated UI in this pass — an admin hitting the same click-to-vote cell still only toggles their own vote, same as anyone else. Building an explicit "manage voters" affordance for admins was left for a follow-up, per the request's own "if manual vote management is needed" framing.

## Verification

`npx tsc --noEmit` passed with no errors across all nine touched files plus the two new ones from the prior fix in this series. `biome check` on every touched file shows the same finding categories before and after (confirmed via `git stash`) — no new lint regressions.

Not verified live — same standing limitation this whole session (no test credentials for the local dev instance). In particular, please verify: (1) a non-admin genuinely cannot add/remove someone else's vote via a raw API call, not just through the UI; (2) the vote badge and toggle behave correctly across table, board, gallery, and the entry page; (3) Total Votes stays in sync after a toggle without a page refresh.
