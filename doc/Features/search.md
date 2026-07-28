# Search

## Overview

Global search gives users instant access to any content in their workspace — pages, database entries, property values, and comments — from a single keyboard shortcut. Search is permission-aware: users only see results they are allowed to access.

**Powered by:** PostgreSQL full-text search (`tsvector` / `tsquery`) — no external search service required.

---

## User Stories

- As a user, I want to open search instantly with a keyboard shortcut so I can navigate without reaching for the mouse.
- As a team member, I want to search across all pages and databases so I can find information regardless of where it lives.
- As a user, I want search results to respect permissions so I never see content I shouldn't.
- As a user, I want to filter results by type and date so I can narrow down what I'm looking for.
- As a user, I want to see recently visited pages before I type so I can jump back to what I was working on.

---

## Opening Search

| Method | Trigger |
|--------|---------|
| Keyboard shortcut | `Ctrl+K` / `Cmd+K` |
| Sidebar button | Click the 🔍 Search button |

---

## Search Dialog Layout

```
┌──────────────────────────────────────────────────────┐
│ 🔍  Search pages, databases, and more...     [Esc]  │
├──────────────────────────────────────────────────────┤
│ Filters: [All ▾]  [Any type ▾]  [Any time ▾]        │
├──────────────────────────────────────────────────────┤
│ RECENTLY VISITED                                      │
│  📄  Project Brief          Engineering  3h ago      │
│  📋  Sprint Board           Engineering  Yesterday   │
│  📄  Meeting Notes          Team         2d ago      │
├──────────────────────────────────────────────────────┤
│  ↑ ↓ to navigate  ·  ↵ to open  ·  Esc to close    │
└──────────────────────────────────────────────────────┘
```

When the user starts typing:

```
┌──────────────────────────────────────────────────────┐
│ 🔍  onboarding flow                          [Esc]  │
├──────────────────────────────────────────────────────┤
│ Filters: [All ▾]  [Any type ▾]  [Any time ▾]        │
├──────────────────────────────────────────────────────┤
│  📄  Onboarding Flow                                 │
│      Product / Design                                │
│      "...complete the onboarding flow for new..."   │
│      Edited 2h ago                                   │
├──────────────────────────────────────────────────────┤
│  📋  User Onboarding [database entry]                │
│      Databases / CRM                                 │
│      Edited yesterday                                │
├──────────────────────────────────────────────────────┤
│ 50 results — showing top 50                          │
└──────────────────────────────────────────────────────┘
```

---

## What Is Searched

| Content Type | Searchable fields | `source_type` in search_index |
|-------------|------------------|-----------------------------|
| Pages | Title, all block text content | `page` |
| Database entries | Entry title, all text-type property values (Text, URL, Email, Phone), Select/Multi-Select option names | `entry` |
| Comments | Comment text, reply text | `comment` |

> **Property values are not a separate `source_type`.** Text, URL, Email, Phone values for a database entry are aggregated into that entry's `search_index` row (`source_type = 'entry'`) by the `property_values` trigger — there is no separate `property_value` enum member. When a user applies the "Entries only" filter in the search dialog, they see results from `source_type = 'entry'` which already includes property value matches.

**Not searched:**
- File contents (PDFs, Word docs, images — only filename)
- Private pages of other users (intentional — privacy boundary)
- Deleted / Trashed pages (including trashed database entries — every entry is a page)

---

## Search Result Format

Each result shows:
- Page icon + type icon (page / database / entry / comment)
- **Title** (matching terms highlighted in bold)
- Location path: `Workspace > Parent Page > Page`
- Content snippet: up to 120 characters around the first match (matching terms highlighted)
- Last edited timestamp (relative: "3h ago", "Yesterday", "Jun 3")

---

## Result Ordering

**Default (relevance):**
1. Title exact match first
2. Title contains match
3. Content matches
4. Within each group: most recently edited first
5. Within same edit time: most frequently visited first (per user)

**Alternative sorts** (toggle in results):
- Last edited (newest first)
- Created date (newest first)

---

## Filters

| Filter | Options |
|--------|---------|
| Location | All, Shared pages, Private pages, Specific page (enter name) |
| Content type | All, Pages only, Databases only, Entries only, Comments only |
| Date | Any time, Past 24 hours, Past 7 days, Past 30 days, Custom date range |
| Author | Any, Created by me, Last edited by me, Specific member (picker) |

Filters combine additively (AND logic). Active filters are shown as chips below the search input with an `×` to remove each.

---

## Recently Visited

Shown in the dialog when the search input is empty.
- Last 10 pages visited, in reverse-chronological order
- Personal and workspace-specific
- Click to navigate; keyboard arrows work
- Refreshes as the user navigates

---

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move between results |
| `Enter` | Open highlighted result |
| `Escape` | Close dialog, return to previous location |
| `Tab` | Move focus to filter controls |
| `Ctrl+K` (while open) | Clear search and focus input |

---

## Permission Scope

- Search results are filtered by the current user's access
- A user only sees pages and entries they have at least **Can View** permission on
- Private pages of other users **never appear** in search results — even for workspace Admins
- Guests see only the pages they have been explicitly invited to
- Admins can see all non-private pages in the workspace

---

## Technical Implementation

**PostgreSQL Full-Text Search:**
- Each indexed content item has a `search_vector` column of type `tsvector`
- Vectors are updated by PostgreSQL triggers on INSERT/UPDATE of `blocks` (page block content), `property_values` (database entry text fields), and `comments` (comment and reply text) — each trigger updates the corresponding `search_index` row's `search_vector` column synchronously
- Query uses `@@` operator with `to_tsquery()` for matching
- Ranking uses `ts_rank()` with custom weights:
  - Title: weight A (highest)
  - Database entry title: weight B
  - Block content: weight C
  - Comments: weight D (lowest)
- No external search service (Elasticsearch, Typesense) needed for MVP

**Index update latency:** Near-real-time — trigger fires synchronously on content save, so changes are searchable within seconds.

---

## Data Model

```
SearchIndex
├── id                  (uuid, primary key)
├── workspace_id        (foreign key → Workspace)
├── source_type         (enum: page | entry | comment)
├── source_id           (uuid — ID of the page, entry, or comment)
├── title               (string — for display)
├── search_vector       (tsvector — weighted, indexed with GIN)
├── page_id             (foreign key → Page — for permissions check)
├── updated_at          (timestamp)

UserRecentlyVisited
├── id                  (uuid, primary key)
├── user_id             (foreign key → User)
├── workspace_id        (foreign key → Workspace)
├── page_id             (foreign key → Page)
├── visited_at          (timestamp)
```

---

## API Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/search?q=&workspace=&type=&date=&author=` | Search workspace content | Member+ |
| GET | `/api/user/recently-visited` | Recently visited pages | Authenticated |
| POST | `/api/user/recently-visited` | Record a page visit | Authenticated |

---

## UI Screens

| Screen | Location | Access |
|--------|----------|--------|
| Global Search Dialog | Modal overlay (`Ctrl+K`) | All members |

---

## Business Rules

1. Search results are always filtered by the current user's page access permissions.
2. Private pages belonging to other users are never returned in search results, even for workspace Admins.
3. Deleted and trashed pages are excluded from search results.
4. Search is scoped to a single workspace — results from other workspaces do not appear.
5. Results are capped at 50 per query. A note is shown when the cap is reached ("Showing top 50 results — refine your search").
6. The search index is updated synchronously on content changes — no manual reindex is needed.
7. Recently visited list is personal, per-user, and per-workspace. Maximum 10 entries.

---

## Out of Scope (MVP)

- Full-text search inside uploaded files (PDFs, Word docs)
- Saved searches / search presets
- Workspace-wide activity feed / changelog
- Advanced semantic / AI-powered search (Phase 4)
- Fuzzy matching / typo tolerance (post-MVP enhancement)
- Cross-workspace search
