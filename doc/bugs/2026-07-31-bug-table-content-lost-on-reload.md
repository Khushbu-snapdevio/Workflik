# Bug — Table content is erased on page reload

## What's broken

Inserting a table into a page and typing into it works fine during the session,
but the table (and everything typed into it) is gone after a refresh. The table
doesn't come back empty — it's replaced by a blank paragraph, so the block
itself disappears from the page too.

This is silent data loss: nothing errors, the save indicator shows "Saved", and
the content is already destroyed in the database before the user reloads.

## Reproduce

1. Open any page in the editor.
2. Insert a table (`/table`).
3. Type text into a few cells.
4. Wait for the save indicator to show "Saved".
5. Reload the page.

**Expected:** the table renders with its content.
**Actual:** the table is gone, replaced by an empty paragraph.

## Root cause

Two independent gaps in `components/editor/serializer.ts`, either of which alone
would lose the table:

**1. The save path had no `table` case (this is what destroys the data).**

`tiptapNodeToBlockContent()` switches on the TipTap node type to produce the DB
block shape. It had cases for every block type *except* `table`, so a table node
fell through to:

```ts
default:
  return { type: "paragraph", content: { text: [] } };
```

Every autosave therefore rewrote the table's DB row as an **empty paragraph**.
The grid was destroyed server-side within a second of being created — the reload
merely revealed it.

**2. The load path read children that are never persisted.**

`blockToTipTapNode()`'s `case "table"` rebuilt the table from `block.children`:

```ts
case "table":
  return { type: "table", attrs: { blockId: id },
           content: block.children?.map(blockToTipTapNode) ?? [] };
```

But `tiptapDocToBlocks()`'s `walk()` only recurses into `toggle`, `columns`, and
`syncedBlock` — never into tables — so no `tableRow`/`tableCell` child rows are
ever written. `blockToTipTapNode` also has no `tableRow`/`tableCell` cases, so
even if such rows existed they'd deserialize to paragraphs. This path could
never have restored a table regardless of bug #1.

Net effect: tables were write-destructive on save and unreadable on load.
