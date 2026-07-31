# Solution — Table content is erased on page reload

## What changed

All changes are in `components/editor/serializer.ts`. No table editing logic,
schema, or migration was touched — the table grid is stored inline on the
existing `table` block's `content` JSON.

### 1. New `tableRows` field on `BlockContent`

```ts
tableRows?: {
  cells: {
    colspan?: number;
    isHeader?: boolean;
    paragraphs: InlineNode[][];
    rowspan?: number;
  }[];
}[];
```

Stored on the `table` block itself rather than as child block rows. Table
rows/cells aren't independently addressable blocks anywhere in the app (no
comments, no drag handles, no block ids), so giving each a DB row would require
`table_row`/`table_cell` block types threaded through the whole serializer,
`walk()`, and the blocks API for no benefit. This mirrors how `template_button`
already stores `templateBlocks` inline.

`paragraphs` is `InlineNode[][]` (not a flat `InlineNode[]`) because table cells
hold *block* content — usually one paragraph, but not always — and flattening
would silently merge multi-paragraph cells.

### 2. Two conversion helpers

- `tiptapTableToRows(node)` — TipTap table node → stored grid, preserving cell
  text, marks, header-vs-body cell type, and colspan/rowspan.
- `rowsToTiptapTable(rows)` — stored grid → TipTap table content.

`rowsToTiptapTable` backfills missing pieces (at least one row, one cell per row,
one paragraph per cell). ProseMirror's table schema **requires** each of those;
emitting an empty table would produce a document TipTap refuses to load, turning
a data-loss bug into a page-crash bug.

### 3. Save path — added the missing `table` case

```ts
case "table":
  return { type: "table", content: { tableRows: tiptapTableToRows(node) } };
```

This is the actual fix for the data loss. Without it, a table hit the `default`
branch and was persisted as an empty paragraph, destroying the grid on the first
autosave.

### 4. Load path — read from `content`, not `children`

```ts
case "table":
  return { type: "table", attrs: { blockId: id },
           content: rowsToTiptapTable(c.tableRows) };
```

Replaces the `block.children?.map(blockToTipTapNode)` lookup, which read child
rows that `walk()` never writes.

## Why this fixes the root cause

The two bugs were a matched pair — a table was destroyed on write *and*
unreadable on read — so both halves had to change together. The table is now
serialized to a real, non-lossy representation on save and reconstructed from
that same representation on load, closing the round trip.

`walk()` deliberately still does **not** recurse into tables: the grid now lives
entirely in the parent block's `content`, so recursing would double-persist it.

## Verification

A round-trip test (TipTap doc → `tiptapDocToBlocks` → `blocksToTiptapDoc`)
confirms cell text, bold marks, `tableHeader` cell types, and the block's
`blockId` all survive intact. Running the same test against the pre-fix
serializer fails with `block persisted as "paragraph", not "table"` — reproducing
the exact reported data loss.

## Note on already-broken data

Tables saved *before* this fix were overwritten as empty paragraphs in the
database. That content is unrecoverable — the fix prevents further loss but
cannot restore tables already destroyed.
