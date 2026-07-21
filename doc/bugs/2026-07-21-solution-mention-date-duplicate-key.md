# Solution: dedupe date suggestions by resolved date before assigning ids

**Fixed:** 2026-07-21

## What changed

**`components/editor/extensions/mention-extension.ts`**: `generateDateItems` now tracks resolved dates it has already emitted (`seenDates`, a `Set<string>` of `YYYY-MM-DD` strings) and drops any later candidate whose date collides with an earlier one, before assigning `id`s. Candidates are still generated and query-filtered in the original order (Today, Tomorrow, Yesterday, then Next Monday/Wednesday/Friday), so when a collision happens the earlier, more literal label (e.g. "Tomorrow") wins and the redundant "Next \_\_\_" entry is simply omitted from the list that day.

## Why this fixes the root cause

The crash was a symptom, not the actual defect — `id`s were never guaranteed unique in the first place because two of these six fixed labels can legitimately resolve to the same calendar date depending on what day "today" is. Deduplicating the candidate list itself (rather than, say, making the `id` incorporate the label to force uniqueness) fixes both problems at once: the React key really is unique now, and the suggestion list stops ever showing two differently-labeled options that would insert the identical date.

## Verification

`npx tsc --noEmit` passed with no new errors.
