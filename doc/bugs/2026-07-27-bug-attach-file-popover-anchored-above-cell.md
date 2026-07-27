# Bug: "Attach file" cell popover renders near the top of the page instead of next to the clicked cell

**Reported:** 2026-07-27

## Symptom

On a page with a tall cover image, clicking an empty "Attach file" cell far down a database table opened the "Add a file or image" popover anchored near the top of the page — overlapping the cover image — instead of appearing next to the cell that was clicked. A visible gap sat between the popover and the cell.

## Root cause

`components/database/cells/cell-editor.tsx`'s shared `CellEditorInner` (used by every property-type popover: Select, Date, Person, Relation, Files) computes `top` for the "open above" case by subtracting a *capped estimate* (`maxH`, up to 420px) from the trigger cell's position — not the popover's actual rendered height:

```ts
const top = openBelow
  ? cellRect.bottom + 4
  : Math.max(MARGIN, cellRect.top - Math.min(maxH, spaceAbove) - 4);
```

The "open above" branch is taken whenever the clicked cell sits in the lower part of the viewport — common on a page with a tall cover image, since it pushes the whole table further down. `FileEditor`'s empty/collapsed state is only ~40–90px tall, far short of the reserved 420px, so the box rendered near the top of that reserved region while its actual (short) content stayed collapsed at the top — leaving a large visible gap between the popover and the cell. Every other popover type shares this same math; they just usually render tall enough to fill most of the reserved space, masking the bug.
