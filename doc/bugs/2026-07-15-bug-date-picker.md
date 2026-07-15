# Bug: date property picker — gaps and defects against Notion's reference behavior

**Reported:** 2026-07-15

## Context

The date property was rebuilt from a bare single-date calendar popover into a full Notion-style editor (range, time, timezone, date format, reminders). Across implementation and review, the following distinct issues were found against the Notion reference the rebuild was targeting. All live in `components/database/date-value-editor.tsx` (the editor), `components/database/property-registry.ts` (the `date`/`short`/`relative` formatters), `components/database/cells/cell-display.tsx` (the read-only cell), `components/ui/calendar.tsx` (the shared calendar primitive), and `components/templates/views/template-table-view.tsx` (the table row hover overlay).

## Symptoms & root causes

1. **Hover icons stay visible while editing.** Opening the date popover left the row's comment/copy hover-action overlay showing the whole time it was open, instead of hiding like every other property type. `DateCell` never accepted or called the `onEditingChange` callback the row already uses to hide that overlay during editing.

2. **Date format output was inconsistent and "Relative" broke on distant dates.** `Month/Day/Year` rendered unpadded (`7/15/2026`) while `Day/Month/Year`/`Year/Month/Day` came out padded, purely because each numeric format leaned on a different `toLocaleDateString()` locale default. `Relative` had no upper bound and rendered absurd output like `"510 days ago"` for dates over a year away.

3. **"Clear" didn't close the popover.** `DateValueEditor` declared an `onClose` prop but never used it — Clear only wiped the value, leaving the popover open (every other exit path closes it).

4. **Flyouts drifted from their row on scroll.** `SimpleFlyout`/`TimezoneFlyout` are portaled and positioned once via `getBoundingClientRect()`. The editor's own scrollable body could move underneath an open flyout without the flyout following, even though the fix pattern (`useScrollLockWhileOpen`) already existed elsewhere in the codebase and was referenced in a comment but never actually called.

5. **No "Today"/"Now" quick-jump.** Notion's calendar header has a one-click shortcut to jump to the current date/time; the rebuilt editor had no equivalent. Adding it also surfaced a second bug: the calendar's absolutely-positioned nav row had no `pointer-events-none`, so its empty middle silently swallowed clicks meant for the header's new button.

6. **Start/end boxes always stacked, even without a time.** With range on but time off, start and end dates rendered in two separate rows instead of Notion's single shared row — the layout only branched on range, not on whether a time field needed its own row.

7. **"Now" always targeted the start date and cleared the range.** There was no concept of "which field (start/end) is currently active" — the shortcut always wrote `date` and, if a range was active, actively nulled out `endDate` as a side effect.

8. **"Short date" included a year it shouldn't, and long cells wrapped to two lines.** Confirmed against real Notion, "Short date" should read `Feb 13` with no year (distinct from "Full date"). Separately, the read-only cell's date span had no `truncate`/`min-w-0`, so long range+time strings wrapped instead of ellipsizing like every other property type's cell text.

9. **Changing timezone didn't convert the displayed time.** Picking a new timezone updated the label but left the time digits unchanged, silently reinterpreting the same wall-clock time as a different instant (e.g. "9:00 AM" stayed "9:00 AM" switching Calcutta → Tokyo, a real 3.5-hour difference).

10. **Current timezone listed twice.** The pinned "Current timezone" row and the "Select a timezone" list both read from the same unfiltered zone list, so the browser's detected zone appeared in both places at once.

11. **Range highlight too faint; "Now"/"Today" hover had no button feel.** The range-fill color used `bg-muted` (too low-contrast to read as "selected"), and the Now/Today link only shifted text color on hover with no background chip, unlike every other clickable element in the app.
