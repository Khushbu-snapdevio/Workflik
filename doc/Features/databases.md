# Databases

## Overview

A database in WorkFlik is a structured collection where each entry is a full page. Databases bring spreadsheet-style organization directly into the page-and-block world — without leaving the document experience. The same database can be displayed in multiple views (Table, Board, Calendar, Gallery) and the user switches between them without any data loss.

---

## User Stories

- As a project manager, I want a Kanban board to visualize work by status.
- As a writer, I want a Calendar view to see my content publishing schedule.
- As a developer, I want a Table view to track bugs with status, priority, and assignee.
- As a user, I want to open a database entry as a full page so I can write rich content inside it.
- As a team member, I want to filter and sort the database so I only see what's relevant to me.

---

## Creating a Database

**Full-page database:**
- Creates a dedicated top-level page that is entirely a database
- Create from sidebar: click `+` → `"New Database"`
- The database is its own page and appears in the sidebar like any other page

**Inline database:**
- Embedded as a block inside an existing page, alongside other content
- Insert via slash command: `/database` or `/table`
- On insert, a picker appears with two options:
  - **"New database"** — creates a brand-new database page and embeds it
  - **"Existing database"** — search by name and embed any database the user has access to
- Multiple databases can be embedded on the same page
- An inline database is functionally identical to a full-page database — same views, filters, sorts, and entry management. The only difference is how it is displayed (embedded in a page vs. occupying the full viewport)

---

## The Four Views

### 1. Table View

The default and most data-dense view. Spreadsheet-style layout.

```
┌──────────────────────────────────────────────────────────┐
│ 📋 Name              │ Status    │ Priority │ Due Date   │
├──────────────────────┼───────────┼──────────┼────────────┤
│ Design homepage      │ In Review │ High     │ Jun 12     │
│ Fix nav bug          │ To Do     │ Urgent   │ Jun 8      │
│ Write release notes  │ Done      │ Low      │ —          │
├──────────────────────┴───────────┴──────────┴────────────┤
│ + New                                                    │
└──────────────────────────────────────────────────────────┘
```

- Each row = one database entry (linked to its own page)
- Each column = one property
- First column is always the entry title (bold, acts as a link)
- Click any cell to edit the value inline
- Click the entry title to open the entry as a full page
- Drag the edge of a column header to resize width
- Click a column header to sort by that property
- Drag the row handle to reorder (only when no sort is applied)
- `+` button at the bottom adds a new entry

---

### 2. Board View (Kanban)

Entries displayed as cards in vertical columns, grouped by a **Select-type property**.

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ TO DO (3)    │  │ IN PROGRESS  │  │ DONE (5)     │
├──────────────┤  ├──────────────┤  ├──────────────┤
│ Design login │  │ Build API    │  │ Set up CI    │
│ Write tests  │  │              │  │ Deploy DB    │
│ Review PR    │  │              │  │ ...          │
│              │  │              │  │              │
│ + Add card   │  │ + Add card   │  │ + Add card   │
└──────────────┘  └──────────────┘  └──────────────┘
```

- Each column = one value of the grouped Select property
- Dragging a card to a new column automatically updates that property value
- Cards show the entry title and configurable property values (e.g., assignee, due date)
- Columns can be hidden (data is preserved), collapsed to header-only, or reordered
- `+ Add card` at the bottom of each column creates an entry pre-set with that column's value
- New columns can be added by adding a new option to the grouped Select property

**Board card display:** Configurable per view — choose which properties appear on the card face.

---

### 3. Calendar View

Entries placed on a calendar grid based on a **Date-type property**.

- Month grid (default); navigate months with `<` `>` arrows
- Each entry appears on the date of its selected date property
- Entries with a date range span across multiple days
- Click a day square to create a new entry with that date pre-filled
- Click an entry on the calendar to open its detail panel
- If an entry has no value in the date property, it does not appear on the calendar
- Date property used for calendar is configurable per view (if the database has multiple date properties)

---

### 4. Gallery View

Entries displayed as visual cards in a grid, with the cover image prominent.

- Card cover source: the page's cover image, or the first image block inside the entry
- If no image is found: a deterministic color background is used (based on entry ID)
- Card sizes: Small (4 columns), Medium (3 columns), Large (2 columns) — configurable per view
- Optional property values can be shown below the title on each card
- Click a card to open the entry detail panel

---

## View Management

- **Multiple views per database:** A database can have any number of named views (e.g., `"My Tasks"`, `"By Status"`, `"Sprint 12"`)
- **Create a view:** Click `+` in the view tabs bar → choose type → name the view
- **Rename a view:** Double-click the view tab
- **Duplicate a view:** Right-click a tab → `"Duplicate view"` (copies filters, sorts, and grouping)
- **Delete a view:** Right-click a tab → `"Delete view"` (data is not affected)
- All views of a database share the same underlying data and properties

---

## Filters

Add filters to show only the entries that match your criteria. Filters are saved per view.

**Adding a filter:**
- Click `"Filter"` in the view toolbar
- Select a property → select an operator → enter a value

**Filter operators by property type:**

| Property Type | Operators |
|--------------|-----------|
| Text | Contains, Does not contain, Is, Is not, Is empty, Is not empty, Starts with, Ends with |
| Number | `=`, `≠`, `<`, `>`, `≤`, `≥`, Is empty, Is not empty |
| Select | Is, Is not, Is any of, Is none of, Is empty, Is not empty |
| Multi-Select | Contains, Does not contain, Is empty, Is not empty |
| Date | Is, Is before, Is after, Is between, Is empty, Is not empty |
| Checkbox | Is checked, Is not checked |
| Person | Is, Is not, Is any of, Includes me, Is empty, Is not empty |
| Relation | Contains, Does not contain, Is empty, Is not empty |

**Multiple filters:** Combined with AND (all must match) or OR (any must match). Switch between AND/OR using the logic toggle.

---

## Sorting

Add sort rules to order database entries.

- Click `"Sort"` in the view toolbar
- Select a property and direction (A→Z / Z→A, or oldest→newest / newest→oldest)
- Add up to **5 stacked sort rules** (applied in order — first rule takes priority)
- Empty values always appear at the bottom (ascending) or top (descending)
- If two entries are equal after all sort rules, creation time is the final tiebreaker

> **Sorts and grouping are independent.** The 5-rule limit applies to sort rules only. Grouping by a Select property (Board view or Table view "Group by") is a separate setting stored in `database_views.group_by_property_id` and does not count against the sort limit. A view can have up to 5 active sort rules **and** a grouping applied simultaneously.

---

## Grouping

Group entries by a **Select-type property** to organize them into collapsible sections.

- **Board view:** Grouping is required and always active
- **Table view:** Optional — toggle via `"Group by"` in the view toolbar
- **Gallery view:** Optional

Grouped sections can be collapsed to show only the group header and entry count.

---

## Entry Detail View

Opening a database entry opens it as a full page.

**Open modes:**
- **Side panel** (default): Entry opens in a panel on the right side of the screen, overlaid on the database
- **Full page**: Entry opens as a full-page view (navigate back via breadcrumb)

Toggle the default mode per view from the view settings.

The entry detail view shows:
- Entry title (editable)
- All database properties with their values
- Full block-based content area (all block types available)
- Comments section

---

## Data Model

```
Database (extends Page — a database is a special type of page)
├── id                    (uuid — same as Page id)
├── default_view_id       (foreign key → DatabaseView)
└── (inherits all Page fields)

DatabaseView
├── id                    (uuid, primary key)
├── database_id           (foreign key → Database)
├── name                  (string)
├── type                  (enum: table | board | calendar | gallery)
├── group_by_property_id  (foreign key → DatabaseProperty, nullable)
├── calendar_property_id  (foreign key → DatabaseProperty, nullable)
├── filters               (jsonb — array of filter rules)
├── sorts                 (jsonb — array of sort rules, max 5)
├── card_display_props    (jsonb — property IDs to show on board/gallery cards)
├── gallery_card_size     (enum: small | medium | large, nullable)
├── entry_open_mode       (enum: side_panel | full_page, default: side_panel)
├── order_index           (integer)
├── created_at            (timestamp)
└── updated_at            (timestamp)

DatabaseEntry (extends Page — each entry is a page)
├── id                    (uuid — same as Page id)
├── database_id           (foreign key → Database)
└── (inherits all Page fields)
```

---

## API Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/workspaces/:id/databases` | Create a new database | Editor+ |
| GET | `/api/databases/:id` | Get database details + views | Can View+ |
| GET | `/api/databases/:id/entries` | List all entries (with filter/sort params) | Can View+ |
| POST | `/api/databases/:id/entries` | Create a new entry | Can Edit+ |
| GET | `/api/databases/:id/entries/:entryId` | Get entry details + blocks | Can View+ |
| PATCH | `/api/databases/:id/entries/:entryId` | Update entry properties | Can Edit+ |
| DELETE | `/api/databases/:id/entries/:entryId` | Delete entry | Can Edit+ |
| GET | `/api/databases/:id/views` | List all views | Can View+ |
| POST | `/api/databases/:id/views` | Create a new view | Can Edit+ |
| PATCH | `/api/databases/:id/views/:viewId` | Update view (filters, sorts, grouping) | Can Edit+ |
| DELETE | `/api/databases/:id/views/:viewId` | Delete a view | Can Edit+ |

---

## UI Screens

| Screen | Route | Access |
|--------|-------|--------|
| Database (full-page) | `/[workspace]/[database-id]` | Can View+ |
| Database Entry | `/[workspace]/[database-id]?entry=[id]` | Can View+ |
| Inline Database | Embedded in page | Can View+ |

---

## Business Rules

1. A database is a special type of page — it appears in the sidebar and supports all page features (icon, cover, export, permissions).
2. Every database must have at least one view. The last remaining view cannot be deleted. Every database has a `default_view_id` — if the default view is deleted, the oldest remaining view becomes the new default automatically (reassigned in the same transaction as the delete).
3. Switching views never modifies the underlying data — views are lenses on the same data set.
4. Board view requires a Select-type property to group by. If no Select property exists, the user is prompted to create one.
5. Calendar view requires a Date-type property. If none exists, the user is prompted to create one.
6. Filters and sorts are saved per view — changing filters on one view does not affect other views.
7. Deleting a view does not delete any entries.
8. An entry deleted from a database is moved to Trash — it can be restored within 30 days.
9. An inline database is a full database — it has the same capabilities as a full-page database.

---

## Out of Scope (MVP)

- Gantt / timeline view
- Spreadsheet formulas in Table view
- Cross-database rollup properties
- Database templates (pre-configured database structures)
- Import from CSV / Excel
- Bulk entry operations (select multiple entries for bulk edit or delete)
- Database-level sharing separate from page-level sharing
