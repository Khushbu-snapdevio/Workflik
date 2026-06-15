# Navigation

## Overview

The sidebar is the primary navigation structure in WorkFlik. It gives users instant access to their pages, workspaces, search, and settings. The sidebar is always present on desktop and collapses to a peek or fully hidden mode when not needed.

---

## User Stories

- As a user, I want to see all my pages in a tree so I can navigate quickly.
- As a user, I want to pin my most-used pages to Favorites so I don't have to dig through the tree.
- As a user, I want to collapse the sidebar to get more writing space.
- As a user, I want to drag pages to reorder them or nest them under a different parent.
- As an Admin, I want to switch between multiple workspaces without leaving the page.

---

## Sidebar Layout

```
┌────────────────────────────────┐
│ [Workspace Name ▾]  [+ New]   │  ← Workspace switcher + new page
├────────────────────────────────┤
│ 🔍 Search           Ctrl+K    │
│ 🔔 Notifications              │
│ ⚙️  Settings                  │
├────────────────────────────────┤
│ ★ Favorites                   │
│   └ [page]                    │
├────────────────────────────────┤
│ 📁 Pages                      │
│   ├─ Page A                   │
│   │    └─ Subpage             │
│   └─ Page B                   │
├────────────────────────────────┤
│ 🗑️ Trash                      │
├────────────────────────────────┤
│ [Avatar] Name      [?] Help   │  ← Account row + Help
└────────────────────────────────┘
```

---

## Features

### 1. Workspace Switcher

- Located at the very top of the sidebar
- Shows current workspace name and icon
- Click to open a dropdown listing all workspaces the user belongs to
- Each entry shows: workspace icon, name, user's role in that workspace
- `"+ Create workspace"` and `"Join workspace"` options at the bottom
- Switching workspaces navigates to the last active page in that workspace

---

### 2. Quick Action Buttons

| Button | Action | Shortcut |
|--------|--------|---------|
| Search | Opens global search dialog | `Ctrl+K` / `Cmd+K` (when no text is selected in the editor) |
| Notifications | Opens notification center panel | `Ctrl+Shift+N` |
| Settings | Opens workspace settings | — |
| New Page (+) | Creates a new top-level page | `Ctrl+N` / `Cmd+N` |

---

### 3. Favorites

- Pages the user has starred appear in this section
- Favorites are personal — they are not visible to other workspace members
- Drag-and-drop to reorder favorites within the section
- Click to navigate; hover to see the star icon for removing

---

### 4. Page Tree

Hierarchical display of all pages in the workspace.

**Display rules:**
- Pages the user has access to are shown
- Private pages of other users are hidden
- Each page shows: icon, title, and a hover menu (`···`)
- Subpages are indented under their parent (chevron to collapse/expand)
- Newly created pages appear at the bottom of the level they were created in

**Hover actions on a page row:**
- `+` — create a subpage directly under this page
- `···` — open options menu (rename, duplicate, move, copy link, share, delete)

**Double-click** on a page title to rename it inline.

---

### 5. Drag-and-Drop

- Drag a page to reorder it within the same level
- Drag a page onto another page to make it a subpage
- Drag a page to the top-level area to move it out of a subpage
- Visual indicator (blue line or highlight) shows where the page will land
- Works across all levels of nesting

---

### 6. Sidebar Filter

- A search/filter input appears at the top of the page tree on hover or focus
- Typing filters the visible page tree in real time (**title match only** — not block content)
- Match is **case-insensitive substring**: `"eng"` matches `"Engineering"`, `"Design"` does not
- A page that matches keeps its full ancestor chain visible (parents are shown even if they don't match, so the user sees where the result lives)
- Non-matching leaf pages (and collapsed branches with no matching descendants) are hidden
- Clearing the filter restores the full tree
- This is a local, client-side filter — it does not trigger the search API or open the global search dialog

---

### 7. Recently Visited Pages

- Shown below the search button when the sidebar is open and no filter is active
- Last 10 **unique** pages visited in the current workspace, in reverse-chronological order (per-workspace, not cross-workspace)
- Revisiting a page already in the list updates its `visited_at` timestamp (upsert) rather than creating a duplicate entry
- Clicking a recent page navigates directly to it
- The list updates automatically as the user navigates

---

### 8. Trash

- Located at the bottom of the sidebar
- Shows all pages deleted within the last 30 days
- Pages in Trash are listed in deletion order (most recent first)
- Each entry has: `"Restore"` and `"Delete Permanently"` actions
- **Empty Trash:** an `"Empty Trash"` action at the top of the Trash view permanently deletes all trashed pages at once (after a confirmation dialog) — irreversible
- After the retention period, pages are auto-deleted permanently (no recovery)

---

### 9. Collapse & Resize

- Click the `◀` button at the edge of the sidebar to collapse it
- Keyboard shortcut: `Ctrl+\` / `Cmd+\`
- **Collapsed mode:** Sidebar is hidden; a thin hover strip appears on the left — hovering shows a peek panel floating over content
- **Peek mode:** Peek panel shows the full sidebar overlaid on content; clicking outside dismisses it
- Sidebar can be resized by dragging its right edge
  - Minimum width: 200px
  - Maximum width: 480px

---

## Data Model

```
UserPreferences
├── id                  (uuid, primary key)
├── user_id             (foreign key → User, unique — one row per user, global)
├── last_workspace_id   (foreign key → Workspace, nullable — last active workspace, for redirect on login)
├── sidebar_width       (integer — pixels, default: 240)
├── sidebar_collapsed   (boolean, default: false)
└── updated_at          (timestamp)

UserFavorite
├── id                  (uuid, primary key)
├── user_id             (foreign key → User)
├── page_id             (foreign key → Page)
├── workspace_id        (foreign key → Workspace)
├── order_index         (integer)
└── created_at          (timestamp)

UserRecentlyVisited
├── id                  (uuid, primary key)
├── user_id             (foreign key → User)
├── workspace_id        (foreign key → Workspace)
├── page_id             (foreign key → Page)
└── visited_at          (timestamp)
```

> The recently visited list is stored in its own `UserRecentlyVisited` table (one row per visit, ordered by `visited_at`), keeping it per-workspace and indexable. The 10-entry cap is enforced at query/write time. See [search.md](search.md) for the canonical definition.

---

## API Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/workspaces/:id/pages/tree` | Page tree for sidebar | Member+ |
| GET | `/api/user/preferences` | User sidebar preferences | Authenticated |
| PATCH | `/api/user/preferences` | Update sidebar width, collapsed state | Authenticated |
| GET | `/api/user/favorites` | Favorite pages for current workspace | Authenticated |
| POST | `/api/user/favorites` | Add a page to favorites | Authenticated |
| DELETE | `/api/user/favorites/:pageId` | Remove a page from favorites | Authenticated |
| PATCH | `/api/user/favorites/reorder` | Reorder favorites | Authenticated |
| GET | `/api/user/recently-visited` | Recently visited pages | Authenticated |
| POST | `/api/user/recently-visited` | Record a page visit | Authenticated |

---

## UI Screens

| Screen | Route | Access |
|--------|-------|--------|
| Sidebar (global) | Persistent on all `/[workspace]/*` routes | All members |
| Workspace Switcher | Sidebar dropdown | All members |
| Trash | `/[workspace]/trash` | All members |

---

## Business Rules

1. The sidebar is always rendered on desktop (≥1280px); hidden by default on mobile in Phase 1.
2. A user only sees pages they have permission to access in the sidebar.
3. Private pages of other users are completely hidden — they do not appear in the tree even with a placeholder.
4. Favorites are personal and workspace-specific — a page favorited in Workspace A does not appear as a favorite in Workspace B.
5. Trash retains pages for 30 days. After this period, pages are permanently and irreversibly deleted.
6. Restoring a page from Trash restores it to its original location in the page tree, if the parent still exists. If the parent was also deleted, the page is restored to the top level.
7. Recently visited list is per-user and per-workspace — max 10 entries, oldest entry dropped when a new one is added.
8. Sidebar resize/collapse preferences are saved **per-user (global, not per-workspace)** and persist across sessions — `user_preferences` holds one row per user. `last_workspace_id` records the most recently active workspace for the post-login redirect.

---

## Out of Scope (MVP)

- Mobile-specific sidebar (slide-in drawer for small screens — Phase 2)
- Sidebar sections with custom labels (user-defined groupings)
- Pinned databases section (separate from the page tree)
- Nested favorites (favorites folder grouping)
- Page tree multi-select for bulk move/delete
