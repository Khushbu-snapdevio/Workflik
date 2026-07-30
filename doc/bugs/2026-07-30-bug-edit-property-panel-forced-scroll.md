# Bug: "Edit property" panel forces an internal scrollbar even for short content

**Reported:** 2026-07-30 (user-reported, with a screenshot from an inline database showing a Multi-select property's "Edit property" panel with a cramped scrollable region around the Name/Type fields, cutting into "Only affects this view")

## Symptom

Opening "Edit property" on a column (e.g. a Multi-select property) showed the Name field and "Type" row squeezed into a tiny internally-scrolling area, with a visible scrollbar, even though the panel's actual content (name, type, a couple of buttons, and the always-visible Wrap content / Display as / Duplicate / Delete footer) was short enough to fit without scrolling. This showed up when the property's column header trigger sat in the lower portion of the page (a common case for inline databases embedded partway down a page).

## Root cause

`components/database/edit-property-panel.tsx` positions the panel next to its trigger and picks a max height from whichever side (above or below the trigger) it opens toward:

```ts
const openBelow = spaceBelow >= 260 || spaceBelow >= spaceAbove;
const maxHeight = Math.min(Math.max(openBelow ? spaceBelow : spaceAbove, 220), 480);
```

The `spaceBelow >= 260` clause made the panel open downward whenever there was at least 260px below the trigger — *regardless* of how much more room existed above it. For a trigger positioned in the lower half of a tall page, `spaceBelow` could clear that 260px threshold while `spaceAbove` was far larger (e.g. 300px below vs. 600px above). The panel would open below and cap its height at the smaller `spaceBelow`, even though opening upward would have given it much more room. With the header and the always-visible bottom section (Wrap content/Display as/Duplicate/Delete) taking priority for space in the flex layout, the middle `flex-1 overflow-y-auto` region (Name + Type) was squeezed down to almost nothing, forcing it into its own scrollbar despite having very little content.
