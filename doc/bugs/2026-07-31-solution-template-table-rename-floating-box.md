# Solution: rename inline in the header cell, matching table-view.tsx's pattern

**Fixed:** 2026-07-31

## What changed

**`components/templates/views/template-table-view.tsx`**, in `ColumnHeader`:

- The header's label `<span>{prop.name}</span>` is now conditionally replaced by an inline `<input>` when `renaming` is true — same spot in the layout, sized with `flex-1` alongside the type icon, rather than being rendered inside the "⋯" dropdown's portal.
- The dropdown's own "Rename" button now calls `setMenuOpen(false)` immediately (alongside `setRenaming(true)`), since renaming no longer happens inside that dropdown — the menu just closes and the header's own input takes over, the same handoff `table-view.tsx` already does.
- Removed the dropdown's now-dead `renaming` branch (the small boxed input with its own `onBlur`/`onKeyDown`) — that logic lives solely in the header cell's inline input now.
- `menuHeight` no longer special-cases `renaming` (it only ever needs to size the item list now).

## Why this fixes the root cause

The input was floating because it was rendered as part of the dropdown menu's popover, anchored to the "⋯" button rather than to the label it was supposedly editing. Moving the input into the header cell itself — the same DOM position the static label occupied — makes it visually and structurally "the label, editable" instead of a separate disconnected popup, matching the working pattern already used for the non-template database table view.

## Verification

`tsc --noEmit` shows no new errors. Traced the interaction: clicking "⋯" → "Rename" now closes the dropdown and focuses the header's own input (via the existing `useEffect(() => { if (renaming) inputRef.current?.focus() }, [renaming])`, unchanged); `Enter`/blur commits via `commitRename`, `Escape` cancels by clearing `renaming` — same commit/cancel behavior as before, just relocated.
