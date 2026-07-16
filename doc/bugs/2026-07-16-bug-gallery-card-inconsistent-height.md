# Bug: Gallery view cards without a comment show a dead empty gap instead of matching height cleanly

**Reported:** 2026-07-16

## Symptom

In Gallery view, a card with no comments and no filled card-display properties looks visibly shorter/leaves an unstyled blank gap at the bottom, compared to a card in the same row that does have a comment count badge. Notion's own Gallery cards look uniform — every card in a row reads as the same height by design, not by accident.

## Reproduce

1. Open a Gallery view where at least one entry has a comment and at least one doesn't (and neither has any card-display properties filled in).
2. Compare card heights in the row.
3. Expected: all cards look uniformly composed, matching height with no obvious dead space. Actual: the card with a comment is taller (title + comment badge); cards without one show a bare gap below the title where the grid still stretches them to match the row's height.

## Root cause

The properties/comment-count block only rendered at all when `filledProps.length > 0 || commentCount` was true. A card with neither skipped that whole block, so its title sat directly above a stretched, empty `flex-1` region — the *card* was already forced to equal height via CSS Grid's default `align-items: stretch` + `h-full`, but the unused leftover space had no content or styling of its own, reading as an obviously blank gap rather than an intentional part of the layout.
