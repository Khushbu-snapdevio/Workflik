# Bug: custom entry icons render as raw text instead of an actual icon, across every real database view

**Reported:** 2026-07-16

## Symptom

An entry with a custom icon set (a JSON value like `{"type":"icon","name":"Star","color":"#22c55e"}`, as opposed to a plain emoji) doesn't show that icon in Table, Board, Gallery, Calendar, or Gantt view — instead of a rendered icon, the raw icon value was pushed into a `<span>` as literal text.

## Reproduce

1. Give a database entry a custom (non-emoji) icon via the icon picker.
2. Open that database in Table, Board, Gallery, Calendar, or Gantt view.
3. Expected: the entry's chosen icon renders next to its title, same as it does in the template-preview versions of these same views. Actual: broken/garbled text instead of an icon (verified directly against the DB — e.g. "Revamp new hire onboarding" had `icon = {"type":"icon","name":"Star","color":"#22c55e"}`).

## Root cause

`components/pages/page-icon.tsx` exports `PageIcon`, which is the single place that knows how to parse an icon value (plain emoji vs. a JSON-encoded `{type, name, color}` icon vs. an uploaded image) and render the right thing. Every one of this app's **template-preview** views (`template-gallery-view.tsx`, `template-board-view.tsx`, `template-calendar-view.tsx`, `template-gantt-view.tsx`) already rendered entry icons through `PageIcon`. The **real** database views never got the same treatment — `table-view.tsx`, `board-view.tsx`, `gallery-view.tsx`, `calendar-view.tsx`, `gantt-view.tsx`, and the (currently unused) `entry-side-panel.tsx` all rendered `entry.icon` directly as raw text (`<span>{entry.icon}</span>`), which only ever worked by coincidence for plain-emoji icons and broke for the JSON-encoded custom-icon format.

A follow-on symptom from fixing this: the icon+title row in `gallery-view.tsx`/`board-view.tsx` (and their template counterparts) used a manually-guessed `mt-0.5` top margin to visually line up the old plain-text/emoji icon with the title. That offset was tuned for a text glyph, not `PageIcon`'s actual rendered SVG box, so switching to `PageIcon` left the icon slightly misaligned with the title text until the alignment was also fixed (see solution doc).
