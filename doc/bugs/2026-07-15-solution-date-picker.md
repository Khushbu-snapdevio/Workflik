# Solution: date property picker fixes

**Fixed:** 2026-07-15

## What changed

1. **Hover icons** — `DateCell` (`template-table-view.tsx`) now accepts and calls `onEditingChange(true/false)` on open/close, same contract `EditableCell` already uses.

2. **Date format consistency** — `formatSingleDate()` (`property-registry.ts`) now builds every numeric format (`mdy`/`dmy`/`ymd`) manually with `padStart(2, "0")`, and named-month formats (`full`/`short`) from hardcoded English month-name arrays — no `toLocaleDateString()` locale dependency anywhere. `relative` only uses relative wording within 7 days of today (matching this app's own timestamp convention, Hard Rule 36) and falls back to the absolute short format beyond that. `short` was later corrected to drop the year entirely (`Feb 13`, not `Feb 13, 2025`) per direct confirmation against real Notion.

3. **Clear button** — `DateValueEditor` now destructures and calls the `onClose` prop it already received; Clear both wipes the value and closes the popover.

4. **Flyout scroll drift** — `SimpleFlyout`/`TimezoneFlyout` now call `useScrollLockWhileOpen(true, (target) => ref.current?.contains(target))`, the same hook `OptionSubmenu` uses for the identical problem, locking the editor's scrollable body while a flyout is open.

5. **Today/Now shortcut** — added `MonthCaptionNow`, passed to react-day-picker via `components={{ MonthCaption: ... }}`, rendering the library's own month label plus a "Today"/"Now" button (label switches on `includeTime`). The calendar's month became controlled (`month`/`onMonthChange`) so the button can move the visible month. `components/ui/calendar.tsx`'s nav row got `pointer-events-none` on the container with `pointer-events-auto` restored on the two arrow buttons, so it stops blocking clicks on anything rendered underneath it.

6. **Start/end row layout** — the date/time block now branches on `includeTime`: with a time, start and end each get their own `[date, time]` row; without one, start and end share a single `[date, date]` row.

7. **Active-field targeting** — added `activeField: "start" | "end"` state. `DateBox` (now a real button) and `TimeInput` accept `active`/`onClick`/`onFocus`, highlighting whichever field was last clicked/focused. `jumpToNow()` now only patches the active field's date/time, never touching the other field.

8. **Cell truncation** — `cell-display.tsx`'s `"date"` case span gained `block min-w-0 truncate`, matching the `"text"` case's existing classes, so long formatted strings ellipsize on one line.

9. **Timezone conversion** — added `changeTimezone(newTz)`, using `date-fns-tz`'s `fromZonedTime`/`toZonedTime` to convert the current date/time (and end date/time, if set) through a UTC instant into the new zone's wall-clock representation, preserving the same absolute moment instead of silently relabeling stale digits.

10. **Duplicate timezone entry** — `TimezoneFlyout`'s unfiltered list now excludes the current zone (`zones.filter((z) => z.value !== current?.value)`) since it already has its own pinned row; a search query still surfaces the current zone in results if it matches.

11. **Range highlight & Now/Today hover** — `range_start`/`range_middle`/`range_end` (in both the classNames map and the day button's `data-[range-middle=true]` state) switched from `bg-muted` to `bg-primary/15`. The Now/Today button gained `rounded-[var(--radius-xs)] px-1.5 py-0.5` and `hover:bg-accent`, matching the app's standard interactive-chip hover convention.

## Verification

Each fix was verified live in a real browser session (magic-link login against a throwaway test database, screenshotted, then cleaned up) before being folded into this consolidated record. `tsc --noEmit` passes with the final state of all changes.
