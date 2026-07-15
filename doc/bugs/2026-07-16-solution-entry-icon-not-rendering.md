# Solution: render entry icons through PageIcon everywhere, and fix the resulting title-row alignment

**Fixed:** 2026-07-16

## What changed

**Icon rendering** — replaced the raw `<span>{entry.icon}</span>` text with `<PageIcon icon={entry.icon} size={...} className="shrink-0" />` in every real-view file that renders an entry's own icon next to its title:
- `components/database/table-view.tsx`
- `components/database/board-view.tsx`
- `components/database/gallery-view.tsx`
- `components/database/calendar-view.tsx` (two occurrences — the "+N more" popup row and the draggable chip)
- `components/database/gantt-view.tsx` (three occurrences — the draggable bar and both sidebar-row variants)
- `components/database/entry-side-panel.tsx` (currently unused/unreferenced, fixed anyway for consistency since it clearly shares this same intent)

`calendar-view.tsx` and `gantt-view.tsx` didn't previously import `PageIcon` — added the import to both.

**Title-row alignment** (follow-on) — in `gallery-view.tsx`, `board-view.tsx`, `template-gallery-view.tsx`, and `template-board-view.tsx`, replaced the guessed `mt-0.5` margin on the icon (and Board's grip handle) with a wrapping `<span className="flex h-5 shrink-0 items-center">`. `h-5` (20px) matches the title's own line height (`text-sm leading-snug`), so the icon self-centers against the title's first line regardless of what it renders, instead of relying on a margin tuned for one specific rendering.

## Why this fixes the root cause

`PageIcon` was already the established single source of truth for parsing an icon value in this app — the template-preview views proved the pattern works. Routing the real views through the same component removes the divergence entirely, rather than special-casing the JSON icon format inline in six different files. The alignment fix replaces a fragile, rendering-specific magic-number margin with a self-correcting technique (a fixed-height flex-centered wrapper) that keeps working no matter what the icon actually is.

## Verification

`tsc --noEmit` passes for all touched files. Not manually verified in a live browser in this session — worth confirming visually: give an entry a custom (non-emoji) icon and check it renders correctly and sits level with its title in Table, Board, Gallery, Calendar, and Gantt views.
