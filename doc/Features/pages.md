# Pages

## Overview

A page is the fundamental unit of content in WorkFlik. Everything — notes, documents, wikis, databases — lives inside a page. Pages can be nested infinitely, creating a flexible hierarchy that mirrors how teams actually think and organize information.

**Real-world analogy:** A page = a document in your filing cabinet, but one that can contain other documents inside it.

---

## User Stories

- As a writer, I want to create a page quickly and start typing immediately with no setup.
- As a user, I want to add an icon and cover image to make pages easy to identify visually.
- As a team member, I want to nest pages under each other to build a structured knowledge base.
- As a user, I want to move a page to a different location in the tree without losing any content.
- As a user, I want to recover a deleted page from the Trash within 30 days.
- As an Admin, I want to lock a page to prevent accidental edits by team members.

---

## Page Anatomy

```
┌──────────────────────────────────────────────┐
│  [Page Icon]  [Add Cover]                    │  ← optional icon + cover button
│                                              │
│  [Cover Image]                               │  ← optional full-width banner
│                                              │
├──────────────────────────────────────────────┤
│  📄  Page Title                              │  ← H1 title (always required)
│                                              │
│  Block 1 — Paragraph text...                 │
│  Block 2 — To-Do checkbox                   │
│  Block 3 — Image                             │
│  Block 4 — ↗ Subpage Card (linked page)     │
│  ...                                         │
└──────────────────────────────────────────────┘
```

---

## Features

### 1. Create a Page

**Methods:**
- Click `+` (New Page) button in the sidebar
- Hover over a page in the sidebar → click `+` to create a subpage
- Type `/` in the editor → select `Linked Page` or `Subpage`
- Press `Ctrl+N` / `Cmd+N` (creates a top-level page)
- Click `"New Page"` in the empty workspace state

On creation:
- Page opens immediately in edit mode, cursor placed in the title
- Starts with an empty title and an empty paragraph block
- Auto-saved from the first keystroke

---

### 2. Page Icon

- Click the icon area to open the icon picker
- **Emoji picker:** search by name or browse categories (all standard emoji)
- **Image upload:** upload a custom square image (max 1 MB, JPEG/PNG/WebP). Uses the same pre-signed upload flow as all other file uploads — `POST /api/uploads/sign` with `{ kind: "page_icon", pageId, size, mimeType }` → `PUT {uploadUrl}` → `POST /api/uploads/confirm`. The returned `fileUrl` is stored in `pages.icon`.
- **Remove icon:** option to remove the icon entirely
- Icon is displayed in the sidebar page tree, breadcrumbs, and search results

---

### 3. Page Cover

- Click `"Add Cover"` at the top of the page to add a full-width banner image
- **Upload:** drag-and-drop or choose file (JPEG, PNG, WebP — max 5 MB)
- **Reposition:** drag the cover image up/down to choose the display area
- **Remove Cover:** option to remove via cover hover menu
- Cover is displayed at the top of the page and as a thumbnail in Gallery view

---

### 4. Page Layout Options

Accessible from the page options menu (`···`) or `"Page"` button in the top-right:

| Option | Description |
|--------|-------------|
| Full Width | Expands content to fill the full page width (default is centered, max 720px) |
| Small Text | Reduces base font size for dense content |
| Font Family | Default (sans-serif), Serif, Monospace |

---

### 5. Subpages & Nesting

- Any page can contain subpages — there is no nesting limit
- Subpages appear as inline linked cards in the parent page content area (rendered as a `Linked Page` block)
- Subpages also appear in the sidebar under their parent, collapsible
- Clicking a subpage card opens it
- Subpages inherit the parent page's permissions by default (see Permissions doc)

---

### 6. Breadcrumb Navigation

- Every page shows a breadcrumb at the top: `Workspace > Parent Page > Current Page`
- Each segment is a clickable link that navigates directly to that page
- Breadcrumb updates automatically if the page is moved
- Long paths are truncated in the middle with `···`

---

### 7. Move Page

**Via drag-and-drop:** Drag the page in the sidebar to a new location.

**Via options menu:**
- `···` → `"Move To"` → search for destination (workspace root or another page)
- Page and all its subpages move together
- Page retains all content, permissions must be reviewed after move (permissions are inherited from the new parent unless already customized). If the page uses inherited permissions, it inherits from the new parent immediately. If it has custom permissions set, those persist unchanged.
- **Technical:** moving a page calls `movePageWithClosure()` in `lib/pages/closure.ts`, which updates `parent_id` and rebuilds all `page_closure` rows in a single transaction — never update `parent_id` directly.

---

### 8. Duplicate Page

- `···` → `"Duplicate"`
- Creates an exact copy: all blocks, subpages, icon, and cover
- Named: `"[Original Title] (copy)"`
- Placed immediately after the original page in the same parent (`parent_id` set to the original's parent); a fresh closure-table entry is created for the duplicate and all its copied subpages via `insertPageWithClosure()`
- Does NOT copy page-level permissions or comments — starts fresh

---

### 9. Delete & Trash

- `···` → `"Delete"` — moves the page to **Trash** (does not delete immediately). All subpages are trashed together (cascade). Closure-table entries are preserved so the hierarchy can be restored intact.
- Deleted pages are visible in the Trash section of the sidebar
- **Retention:** 30 days. After this period, the page is permanently auto-deleted.
- **Warning banner:** At 7 days remaining before auto-deletion, the page shows a warning banner when viewed from Trash. This is **stateless UI logic** — the banner is derived at render time from `deleted_at <= NOW() - INTERVAL '23 days'`; no job or flag is required.
- **Warning notification:** At 3 days remaining, a one-time in-app + email notification is sent to the user who deleted the page and the page creator, so they can restore it before it is pruned.
- Restore: moves page back to its original parent (or workspace root if parent was also deleted)
- Permanent Delete: immediately removes the page and all its content
- **Empty Trash:** permanently deletes all pages currently in Trash in a single action (requires a confirmation dialog) — irreversible. An Admin empties the entire workspace Trash; a non-admin empties only the trashed pages they have permission to permanently delete

**Admin note:** Workspace Admins can permanently delete any page at any time from Trash.

---

### 10. Favorites

- Click the star icon (`★`) in the page's top-right options or from the sidebar hover menu
- Favorited pages appear in the **Favorites** section of the sidebar
- Favorites are personal — other members do not see your favorites
- Un-favor by clicking the star again

---

### 11. Page Lock

- `···` → `"Lock Page"` (available to users with Full Access permission on the page)
- When locked: all blocks become read-only — no one (including Admins) can edit content while locked
- A lock icon appears in the top bar indicating the page is locked
- Only a user with **Full Access** on the page can unlock it
- Locking does not affect permissions — locked page can still be commented on

---

### 12. Export

Available from `···` → `"Export"`

| Format | Includes |
|--------|---------|
| Markdown | All text blocks, headings, lists; images as links |
| PDF | Full visual render including cover image and formatting |
| HTML | Clean HTML with inline styles |

- Subpages are NOT included in a single-page export
- Databases export as flat CSV (separate option from the database menu)
- **Export is asynchronous for PDF** — a pg-boss `export-page` job is enqueued and the download link is delivered when ready (per Rule 2: slow IO must not block a Next.js request). Markdown and HTML are rendered synchronously and returned directly. **PDF implementation:** Rendered by the worker using **Puppeteer** (headless Chromium) via the browser's print pipeline.

---

### 13. Version History

- Access from `···` → `"Version History"`
- Shows a list of saved snapshots of the page at previous points in time
- Versions are auto-created on save, debounced to **one version per 10-minute window per editor** — not on every keystroke. The version records the `created_by` user who triggered the save.
- Retention: 7 days (pruned by `auto-delete-expired-versions` job)
- Click a version to preview it (read-only)
- `"Restore this version"` button replaces current content with the selected snapshot
- Restoring creates a new version entry — nothing is permanently lost

---

### 14. Page URL

```
https://workflik.app/[workspace-slug]/[page-id]
```

- Workspace slug is the URL-friendly workspace name (e.g. `acme-inc`)
- Page ID is a short unique identifier (e.g. `k3j9x2a`)
- Page title is NOT in the URL — renaming a page never breaks existing links
- Sharing the URL with a workspace member navigates them directly to the page (if they have access)

---

## Data Model

```
Page
├── id                  (uuid, primary key)
├── short_id            (string, unique — 7-character nanoid, used in public URLs)
├── workspace_id        (foreign key → Workspace)
├── parent_id           (foreign key → Page, nullable — null = top-level)
├── kind                (enum: page | database | entry, default: page)
├── database_id         (foreign key → Page, nullable — set when kind=entry)
├── default_view_id     (uuid, nullable — set when kind=database; deferred FK → database_views.id)
├── order_index         (integer — sibling order within parent, used for sidebar drag-and-drop)
├── title               (string, default: "Untitled")
├── icon                (string — emoji or image URL, nullable)
├── cover_url           (string — image URL, nullable)
├── cover_position      (float — vertical position 0.0–1.0, default: 0.5)
├── is_full_width       (boolean, default: false)
├── font_family         (enum: default | serif | mono, default: default)
├── is_small_text       (boolean, default: false)
├── is_locked           (boolean, default: false)
├── is_private          (boolean, default: false)
├── is_deleted          (boolean, default: false)
├── deleted_at          (timestamp, nullable)
├── deleted_by          (user_id, foreign key, nullable — ON DELETE SET NULL; who moved the page to Trash)
├── trash_warning_sent  (boolean, default: false — set to true by the `warn-expiring-trash` job when the 3-day warning is sent; remains true even if the page is later restored, to prevent duplicate warnings on re-deletion)
├── created_by          (user_id, foreign key, nullable — ON DELETE SET NULL; null = "Former Member")
├── last_edited_by      (user_id, foreign key, nullable — ON DELETE SET NULL)
├── created_at          (timestamp)
└── updated_at          (timestamp)
```

---

```
PageVersion
├── id                  (uuid, primary key)
├── page_id             (foreign key → Page)
├── content_snapshot    (jsonb — full serialized block structure at time of save)
├── label               (string, nullable — optional name e.g. "Before restructure")
├── created_by          (user_id, foreign key, nullable — ON DELETE SET NULL)
└── created_at          (timestamp)
```

Versions are created automatically on each auto-save (debounced — one version per 10-minute window per user). The most recent version within the 7-day retention window is always kept. Older versions outside the retention window are pruned by the `auto-delete-expired-versions` pg-boss job.

---

## Background Jobs (pg-boss)

| Job | Schedule | Description |
|-----|----------|-------------|
| `auto-delete-expired-trash` | Daily at 02:00 UTC | Permanently deletes pages where `is_deleted = true` and `deleted_at` exceeds the 30-day trash retention. Cascades to subpages and queues object-storage file deletion for all file blocks on those pages. |
| `warn-expiring-trash` | Daily at 02:00 UTC | **7-day banner:** the UI derives this at render time — no DB flag needed; condition is `deleted_at <= NOW() - INTERVAL '23 days'`. **3-day notification:** queries `WHERE is_deleted = true AND deleted_at <= NOW() - INTERVAL '27 days' AND deleted_at > NOW() - INTERVAL '30 days' AND trash_warning_sent = false`; for each result atomically sets `trash_warning_sent = true` (guarded UPDATE to handle concurrent runs) then enqueues in-app + email notification to the page's deleter and creator. |
| `auto-delete-expired-versions` | Daily | Prunes page versions older than the 7-day Version History retention window. |

---

## API Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/workspaces/:id/pages` | Create a new page | Editor+ |
| GET | `/api/pages/:id` | Get page details | Can View+ |
| PATCH | `/api/pages/:id` | Update title, icon, cover, settings | Can Edit+ |
| DELETE | `/api/pages/:id` | Move page to Trash | Can Edit+ |
| POST | `/api/pages/:id/restore` | Restore from Trash | Can Edit+ |
| DELETE | `/api/pages/:id/permanent` | Permanently delete | Admin or Full Access |
| DELETE | `/api/workspaces/:id/trash` | Empty Trash — permanently delete all trashed pages the caller may delete | Admin or Full Access |
| POST | `/api/pages/:id/duplicate` | Duplicate page | Can Edit+ |
| PATCH | `/api/pages/:id/move` | Move page to new parent | Can Edit+ |
| GET | `/api/pages/:id/versions` | List version history | Can View+ |
| POST | `/api/pages/:id/versions/:versionId/restore` | Restore a version | Can Edit+ |
| GET | `/api/pages/:id/export` | Export page | Can View+ |

---

## UI Screens

| Screen | Route | Access |
|--------|-------|--------|
| Page View / Editor | `/[workspace]/[page-id]` | Can View+ |
| Trash | `/[workspace]/trash` | All members |
| Version History | Modal on page | Can View+ |
| Export | Modal on page | Can View+ |

---

## Business Rules

1. Every page must have a title — the title field defaults to `"Untitled"` and is never empty.
2. Deleting a page moves it to Trash; it is not permanently removed immediately.
3. Pages in Trash are permanently auto-deleted after the 30-day retention period. There is no recovery after auto-deletion.
4. Duplicating a page does not copy its permissions or comments.
5. Moving a page to a new parent causes it to inherit the new parent's permissions, unless the page already has custom permissions set.
6. A page's URL is based on its ID, not its title — renaming a page never breaks existing links.
7. Page version history is retained for 7 days.
8. A locked page cannot be edited by anyone until unlocked — including workspace Admins.
9. Only users with Full Access on a page can lock or unlock it.
10. Subpages of a deleted page are also moved to Trash together.
11. "Empty Trash" permanently deletes all trashed pages in one action after explicit confirmation. It is irreversible and follows the same per-page delete permissions as a single permanent delete.
12. A trashed page sends a one-time auto-deletion warning notification (in-app + email) to the user who deleted it and the page creator 3 days before it is permanently pruned.

---

## Out of Scope (MVP)

- Page templates per page (different from workspace-level templates)
- Real-time collaborative editing / multiplayer cursors (Phase 2)
- Page analytics (views, unique visitors — Phase 2)
- Password-protected pages
- Page comments visible in sidebar (comment count badge only)
- Bulk export (export multiple pages at once)
