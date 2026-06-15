# Editor

## Overview

The WorkFlik editor is block-based — every piece of content is a discrete block that can be moved, transformed, nested, and styled independently. The editor is powered by **TipTap** (built on ProseMirror) and is the core interaction surface across all pages and database entries.

**Core principle:** A block can be anything. Paragraphs, headings, checkboxes, images, code, databases — all are blocks and behave consistently everywhere in the product.

---

## User Stories

- As a writer, I want to type freely and use markdown shortcuts so I don't have to reach for a menu.
- As a user, I want to insert any block type by typing `/` so I can keep my hands on the keyboard.
- As a team member, I want to comment on specific blocks so feedback stays in context.
- As a developer, I want a syntax-highlighted code block so I can share code snippets cleanly.
- As a user, I want my work to save automatically so I never have to think about it.

---

## Block Types

### Text Blocks

| Block | Slash Command | Markdown Shortcut |
|-------|--------------|-------------------|
| Paragraph | `/paragraph` | (default — just type) |
| Heading 1 | `/h1` | `# ` + Space |
| Heading 2 | `/h2` | `## ` + Space |
| Heading 3 | `/h3` | `### ` + Space |
| Bulleted List | `/bullet` | `- ` + Space or `* ` + Space |
| Numbered List | `/numbered` | `1. ` + Space |
| Toggle List | `/toggle` | `> ` + Space |
| Quote | `/quote` | `"` + Space |
| Callout | `/callout` | — |
| Divider | `/divider` | `---` + Enter |

### Task Block

| Block | Slash Command | Markdown Shortcut |
|-------|--------------|-------------------|
| To-Do (Checkbox) | `/todo` | `[] ` + Space |

### Media Blocks

| Block | Slash Command | Max Size |
|-------|--------------|---------|
| Image | `/image` | 10 MB |
| Video | `/video` | 50 MB |
| Audio | `/audio` | 50 MB |
| File | `/file` | 100 MB |

- Images can be uploaded or embedded via URL
- Video and audio can be uploaded or embedded from a URL (YouTube, Vimeo, etc.)
- Uploaded files are stored in S3-compatible object storage (served via a CDN)
- See [File Storage](./file-storage.md) for per-type size limits.

### Structure Blocks

| Block | Slash Command | Description |
|-------|--------------|-------------|
| Table of Contents | `/toc` | Auto-generates from H1/H2/H3 headings on the page |
| Simple Table | `/table` | Fixed-column table with text cells |
| Columns | `/columns` | 2 or 3-column layout; each column holds other blocks |

### Code & Math Blocks

| Block | Slash Command | Features |
|-------|--------------|---------|
| Code Block | `/code` | Syntax highlighting (50+ languages), line numbers toggle, copy button |
| Equation | `/equation` | LaTeX rendering via **KaTeX**; inline mode and block mode |

### Reference Blocks

| Block | Slash Command | Description |
|-------|--------------|-------------|
| Linked Page | `/page` | Clickable card linking to another page in the workspace |
| Inline Database | `/database` | Embeds a full database (all its views) directly inside the page. The block stores the `databaseId`; the database itself is a separate `pages` row (`kind='database'`) and can also be opened as a full-page database. |
| Template Button | `/template-button` | Inserts a configurable button that clones a predefined block structure on click (see [Templates](./templates.md)) |

---

## Slash Command Menu (`/`)

Typing `/` anywhere in the editor opens the block insertion menu.

**Behavior:**
- Opens immediately after typing `/`
- Continue typing to filter by block name (e.g., `/ima` shows Image)
- Arrow keys to navigate, `Enter` to insert, `Escape` to dismiss
- Grouped by category with section headers

**Layout:**
```
╔══════════════════════════════╗
║ /ima                [Esc]   ║
╠══════════════════════════════╣
║ MEDIA                        ║
║  🖼  Image                   ║  ← highlighted
║  🎬  Video                   ║
║                              ║
║ STRUCTURE                    ║
║  ⊞  Simple Table             ║
╚══════════════════════════════╝
```

---

## Inline Formatting

Select any text to reveal the floating formatting toolbar.

| Format | Toolbar | Keyboard Shortcut |
|--------|---------|------------------|
| Bold | **B** | `Ctrl+B` / `Cmd+B` |
| Italic | *I* | `Ctrl+I` / `Cmd+I` |
| Underline | U̲ | `Ctrl+U` / `Cmd+U` |
| Strikethrough | ~~S~~ | — |
| Inline Code | `</>` | `Ctrl+E` / `Cmd+E` |
| Hyperlink | 🔗 | `Ctrl+K` / `Cmd+K` (on selection — takes priority over global search when text is selected) |
| Text Color | A | — (opens color picker) |
| Highlight | 🖍 | — (opens highlight color picker) |
| Comment | 💬 | — (opens comment composer) |
| Turn Into | ⇄ | — (convert block type) |

**Floating toolbar appears:**
- On mouse text selection (after a brief 200ms delay)
- Does NOT appear on empty selection or cursor-only placement

---

## Markdown Shortcuts

Type the shortcut at the start of a line and press Space or Enter to auto-convert.

| Shortcut | Result |
|----------|--------|
| `# ` | Heading 1 |
| `## ` | Heading 2 |
| `### ` | Heading 3 |
| `- ` or `* ` | Bulleted List |
| `1. ` | Numbered List |
| `> ` | Toggle List |
| `[] ` | To-Do checkbox |
| `" ` | Quote block |
| `---` + Enter | Divider |
| ` ``` ` + Enter | Code Block |
| `**text**` | Bold (inline) |
| `*text*` | Italic (inline) |
| `` `code` `` | Inline Code |

---

## Block Operations

**Drag Handle:** Appears on hover to the left of every block (`⠿`). Drag to reorder.

**Options Menu (`···`):** Appears on hover to the right of the drag handle.

| Option | Description |
|--------|-------------|
| Delete | Removes the block permanently (undo with `Ctrl+Z`) |
| Duplicate | Creates a copy of the block immediately below |
| Turn Into | Converts block to a different type (see conversion table) |
| Copy Block Link | Copies a deep link to this specific block |
| Move To | Moves block to a different page |
| Comment | Opens comment composer attached to this block |
| Color | Sets text color or background color for the block |

**Turn Into — Supported Conversions:**

| From | Can convert to |
|------|---------------|
| Paragraph | Any heading, bulleted list, numbered list, toggle, quote, callout, to-do |
| Heading 1/2/3 | Any other heading, paragraph |
| Bulleted List | Numbered list, to-do, paragraph |
| Numbered List | Bulleted list, to-do, paragraph |
| To-Do | Bulleted list, numbered list, paragraph |
| Toggle | Bulleted list, paragraph |
| Quote | Callout, paragraph |
| Callout | Quote, paragraph |

---

## Nesting

Blocks can be nested inside other blocks:

- **Toggle List:** Click the triangle to expand/collapse nested blocks
- **Bulleted / Numbered List:** `Tab` to indent, `Shift+Tab` to outdent (creates sub-list)
- **Callout:** Can contain any block type inside the callout box
- **Column Layout:** Each column is a container for other blocks. Columns blocks support nesting of all block types **except** another Columns block (no nested column layouts). Dragging a block into a column or out of a column is allowed; the `parent_block_id` is updated accordingly. A Columns block always has exactly 2 or 3 child column-container blocks at depth 1; each column-container can hold any number of non-Columns blocks at depth 2.
- **To-Do:** Can contain text blocks for longer descriptions

---

## Multi-Block Selection

- Click-drag across multiple blocks to select them
- `Shift+Click` to extend selection to a specific block
- Selected blocks show a blue highlight
- With multiple blocks selected:
  - `Backspace` / `Delete` — deletes all selected blocks
  - `Ctrl+D` — duplicates all selected blocks
  - Color menu applies to all selected blocks
  - Drag the drag handle of any selected block to move all selected blocks together

---

## Auto-Save

- Content is saved **continuously** as the user types — there is no manual save
- Save state indicator in the top bar:
  - `"Saving..."` — write in progress
  - `"Saved"` — last save successful
  - `"Offline — changes will sync when reconnected"` — no network
- Offline edits are queued in **IndexedDB** (persisted across browser refreshes) and synced automatically when connectivity is restored
- If a sync conflict occurs (same page edited on two devices offline), the most recent save wins

---

## Undo / Redo

- `Ctrl+Z` / `Cmd+Z` — undo last action
- `Ctrl+Shift+Z` / `Cmd+Shift+Z` (or `Ctrl+Y`) — redo
- **200-step history** per page per session
- History is **per-session only** — it does not persist across browser refreshes or sessions
- For recovering older content, use Version History (page settings menu)

---

## Keyboard Shortcuts — Editor

| Action | Shortcut |
|--------|---------|
| New line | `Enter` |
| Soft line break | `Shift+Enter` |
| Indent block | `Tab` |
| Outdent block | `Shift+Tab` |
| Select all blocks | `Ctrl+A` / `Cmd+A` |
| Open slash menu | `/` |
| Open link dialog | `Ctrl+K` (on selection) |
| Undo | `Ctrl+Z` |
| Redo | `Ctrl+Shift+Z` |

---

## Data Model

```
Block
├── id                  (uuid, primary key)
├── page_id             (foreign key → Page)
├── parent_block_id     (foreign key → Block, nullable — for nested blocks)
├── type                (enum: paragraph | h1 | h2 | h3 | bullet | numbered |
│                        toggle | quote | callout | divider | todo | image |
│                        video | audio | file | toc | table | columns |
│                        code | equation | linked_page | database |
│                        template_button)
├── content             (jsonb — type-specific content and formatting)
├── order_index         (integer — position within parent)
├── created_by          (user_id, foreign key)
├── created_at          (timestamp)
└── updated_at          (timestamp)
```

**Content JSONB structure (examples):**

The `text` array in paragraph, heading, quote, callout, to-do, and similar blocks holds a sequence of **inline nodes**. There are two kinds of inline node:

- **Text run** — a plain string with optional marks.
- **Inline element** — a leaf node with a `type` and `attrs`; has no `text` field.

```
// --- Block-level content shapes ---
Paragraph:       { "text": [{ "text": "Hello", "marks": ["bold"] }] }
Heading:         { "level": 1, "text": [{ "text": "Title" }] }
Code Block:      { "language": "typescript", "code": "const x = 1;", "lineNumbers": true }
Image:           { "url": "...", "caption": "...", "width": 720, "objectKey": "..." }
To-Do:           { "checked": false, "text": [...] }
Linked Page:     { "pageId": "<uuid of the target page>" }
Inline Database: { "databaseId": "<uuid of the database page>", "defaultViewId": "<uuid>" }
Columns:         { "columnCount": 2 }  // child blocks with parent_block_id form the columns
// --- Inline node types (appear inside text arrays) ---
// Text run with marks:
//   { "text": "Hello", "marks": ["bold", "italic"] }
//   Valid marks: "bold" | "italic" | "underline" | "strikethrough" | "code" | "highlight" | "textColor"
//   Link mark carries extra attrs: { "type": "link", "attrs": { "href": "https://..." } }

// @name mention (notifies the user):
//   { "type": "mention", "attrs": { "userId": "<uuid>", "name": "Sarah Chen" } }

// @page live link (navigates to another page in the workspace):
//   { "type": "pageMention", "attrs": { "pageId": "<uuid>", "title": "Meeting Notes" } }

// @date formatted reference (renders as a clickable date chip):
//   { "type": "dateMention", "attrs": { "date": "2026-06-11", "format": "MMM D, YYYY" } }

// Example — paragraph with a mix of runs and inline elements:
//   {
//     "text": [
//       { "text": "Assigned to " },
//       { "type": "mention", "attrs": { "userId": "<uuid>", "name": "Alice" } },
//       { "text": " — due " },
//       { "type": "dateMention", "attrs": { "date": "2026-06-15", "format": "MMM D, YYYY" } },
//       { "text": ". See " },
//       { "type": "pageMention", "attrs": { "pageId": "<uuid>", "title": "Sprint Board" } }
//     ]
//   }

Template Button: {
                   "label": "+ Add Today's Log",
                   "insert_location": "below_button",  // "below_button" | "bottom_of_page"
                   "template_blocks": [
                     // Serialized block structures stored inline — NOT as separate Block rows.
                     // Full TemplateBlock schema (recursive):
                     // {
                     //   "type": blockType enum value,
                     //   "content": jsonb (same shape as the Block content field for that type),
                     //   "orderIndex": integer,
                     //   "schemaVersion": integer,
                     //   "parentBlockId": string | null  (references another entry's stable id within
                     //                                    this templateBlocks array for nested layouts),
                     //   "children": TemplateBlock[]     (nested blocks, same shape, recursive)
                     // }
                     // On button click the server walks templateBlocks recursively, inserts each as a
                     // new Block row with a freshly generated UUID, preserving parent/child relationships.
                     { "type": "paragraph", "content": { "text": [] }, "orderIndex": 0, "schemaVersion": 1, "parentBlockId": null, "children": [] }
                   ]
                 }
```

> **Template Button block** stores its template content directly in `content.templateBlocks` — it is NOT a separate entry in the `templates` table. When the button is clicked, the worker (or server action) clones `templateBlocks` as new `Block` rows under the page. See [templates.md](./templates.md) § Template Button Block.

---

## API Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/pages/:id/blocks` | Get all blocks for a page | Can View+ |
| POST | `/api/pages/:id/blocks` | Create a new block | Can Edit+ |
| PATCH | `/api/blocks/:id` | Update block content or type | Can Edit+ |
| DELETE | `/api/blocks/:id` | Delete a block | Can Edit+ |
| PATCH | `/api/blocks/:id/move` | Move block to new position or page | Can Edit+ |
| POST | `/api/blocks/:id/duplicate` | Duplicate a block | Can Edit+ |

---

## UI Screens

| Screen | Route | Access |
|--------|-------|--------|
| Page Editor | `/[workspace]/[page-id]` | Can Edit+ (read-only for Can View) |
| Database Entry Editor | `/[workspace]/[page-id]?entry=[entry-id]` | Can Edit+ |

---

## Business Rules

1. Every page must have at least a title block — the title cannot be deleted.
2. Blocks are ordered by `order_index` within their parent scope (page or parent block).
3. A deleted block is permanently removed — it cannot be recovered except via page Version History.
4. Auto-save triggers after every content change with a debounce of 1 second.
5. Offline edits sync automatically on reconnection — the most recent timestamp wins on conflict.
6. Undo history is per-session only and is lost on browser refresh.
7. Markdown shortcuts only trigger at the start of an empty block — they do not activate mid-sentence.
8. The slash command menu dismisses automatically if the user clicks outside or presses Escape.
9. All block types behave identically whether the block is on a page or inside a database entry.
10. Deleting a file block (Image, Video, Audio, File) does **not** immediately remove the stored file — undo (`Ctrl+Z`) and Version History must still be able to restore the block with its media intact. The stored file is removed later by a cleanup job, once no active block references it and it has aged out of the 7-day Version History window.
11. **Maximum block nesting depth is 10 levels** (the length of the `parent_block_id` chain from a leaf block to the page root). The ProseMirror schema must enforce this limit — dragging a block deeper than level 10 or pressing `Tab` past level 10 is silently blocked (the block stays at depth 10 rather than going deeper). A Columns block at depth 1 counts as one level; its column-container children are depth 2; blocks inside columns start at depth 3.

---

## Out of Scope (MVP)

- Real-time multiplayer cursors and presence indicators (Phase 2)
- AI writing assistant — autocomplete, summarize, improve (Phase 4)
- Drawing / sketch block (whiteboard — Phase 4)
- Table block with formulas (spreadsheet-style calculations)
- Custom block types via plugin API (Phase 5)
- Voice-to-text block (Phase 5)
