# Templates

## Overview

Templates are reusable page structures that help users get started quickly without building from scratch. WorkFlik offers a built-in template gallery curated by the WorkFlik team, and users can save any page as a custom template scoped to their workspace.

---

## User Stories

- As a new user, I want to pick a starting template during onboarding so I'm not staring at a blank page.
- As a team lead, I want to save our weekly meeting format as a template so everyone follows the same structure.
- As a project manager, I want a bug tracker template with a database already set up.
- As a user, I want a Template Button block so I can add repeating entries (like daily logs) with one click.

---

## Template Types

| Type | Created by | Available to |
|------|-----------|-------------|
| Built-in | WorkFlik team | All users across all workspaces |
| Custom | Workspace members | All members in that workspace |

---

## Template Gallery

Accessible from:
- **New Page dialog** → `"Start from a template"`
- **Sidebar** → `"Templates"` section
- **Slash command** → `/template`

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│ 🔍 Search templates...                               │
├─────────────────────────────────────────────────────-┤
│ Personal  Productivity  Project Mgmt  Team  CRM      │  ← filter tabs
├────────────────┬────────────────┬─────────────────────┤
│ [Preview]      │ [Preview]      │ [Preview]           │
│ Meeting Notes  │ Project Brief  │ Team Wiki           │
│ Productivity   │ Project Mgmt   │ Team & Knowledge    │
├────────────────┴────────────────┴─────────────────────┤
│ WORKSPACE TEMPLATES                                   │
│ Sprint Review  (created by You)                      │
└──────────────────────────────────────────────────────┘
```

Clicking a template shows a full-page preview (read-only). A `"Use Template"` button applies it.

---

## Built-in Templates

### Personal

| Template | Description |
|----------|-------------|
| Daily Journal | Date-stamped entries with mood, highlights, and reflection prompts |
| Weekly Planner | Goals, schedule, and review sections for the week |
| Reading List | Database of books with status, rating, and notes |
| Habit Tracker | Checkbox-based daily habit tracking database |

### Productivity

| Template | Description |
|----------|-------------|
| Meeting Notes | Agenda, attendees, action items, and decisions |
| Task List | Simple to-do page with checkbox blocks |
| Project Brief | Goals, scope, timeline, and stakeholders for a project |
| OKR Tracker | Objectives and key results in a database |

### Project Management

| Template | Description |
|----------|-------------|
| Project Tracker | Database with status, priority, assignee, and due date |
| Sprint Board | Kanban board pre-configured for sprint workflow |
| Bug Tracker | Database for tracking bugs with severity and status |
| Content Calendar | Calendar view database for content publishing schedule |

### Team & Knowledge

| Template | Description |
|----------|-------------|
| Team Wiki | Structured knowledge base with sections and subpages |
| Company Handbook | Policies, culture, and onboarding info |
| Meeting Agenda | Pre-meeting agenda with action item tracking |
| Decision Log | Database for logging decisions with context and outcome |

### Personal CRM

| Template | Description |
|----------|-------------|
| Contact Database | People database with company, last contact, and notes |
| Company Tracker | Company database linked to contacts (uses Relation property) |

---

## How Built-in Templates Are Created and Managed

Built-in templates are authored and maintained by the **WorkFlik team** through **Orbit Admin** at `/orbit/templates`. No direct database access or seed scripts are used — all template management goes through the admin UI so templates can be updated, previewed, and published without a deployment.

### Orbit Admin — Template Management (`/orbit/templates`)

This interface is only available to platform admins (WorkFlik team). End users and workspace Admins have no access to it.

**Template list view:**
```
┌─────────────────────────────────────────────────────────┐
│ Built-in Templates                      [+ New Template] │
├──────────────────────┬──────────────────┬───────────────┤
│ Name                 │ Category         │ Status        │
├──────────────────────┼──────────────────┼───────────────┤
│ Meeting Notes        │ Productivity     │ Published     │
│ Sprint Board         │ Project Mgmt     │ Published     │
│ Daily Journal        │ Personal         │ Draft         │
└──────────────────────┴──────────────────┴───────────────┘
```

**Actions per template:**

| Action | Description |
|--------|-------------|
| Create | Open a blank template editor (same block-based editor as regular pages) and author the template content |
| Edit | Modify an existing template's blocks, name, description, or category |
| Preview | View the template exactly as users see it in the gallery |
| Publish / Unpublish | Toggle `status` between `draft` and `published` — only published templates appear in the user-facing gallery |
| Delete | Permanently remove the template — does not affect pages already created from it |

### Template Authoring Flow (WorkFlik team)

1. Go to `/orbit/templates` → click **New Template**
2. Fill in: Name, Description, Category
3. Use the block editor to build the template content (all standard block types available, including databases, callouts, and template placeholder blocks)
4. Click **Preview** to verify how it looks to users
5. Click **Publish** — the template immediately appears in the user-facing gallery for all workspaces
6. To update: edit → re-publish. Changes take effect immediately; pages already created from the template are unaffected.

### Launch Templates

The following 18 built-in templates are authored by the WorkFlik team via Orbit Admin before the product launches. They are in `published` state at launch:

**Personal (4):** Daily Journal, Weekly Planner, Reading List, Habit Tracker
**Productivity (4):** Meeting Notes, Task List, Project Brief, OKR Tracker
**Project Management (4):** Project Tracker, Sprint Board, Bug Tracker, Content Calendar
**Team & Knowledge (4):** Team Wiki, Company Handbook, Meeting Agenda, Decision Log
**Personal CRM (2):** Contact Database, Company Tracker

---

## Using a Built-in Template

1. Open the template gallery
2. Click a template to preview it
3. Click `"Use Template"`
4. A new page is created using that template's structure
5. The new page is placed in the current parent (or workspace root) and opened immediately

Using a template creates an independent copy — changes to the template do not affect the page, and changes to the page do not affect the template.

---

## Custom Templates

### Create a Custom Template

1. Open any page
2. Click `···` (page options) → `"Save as Template"`
3. Enter a template name (required)
4. Optionally add a description and select a category
5. The template is now available to all workspace members in the template gallery under `"Workspace Templates"`

**What is saved:**
- All blocks and their content
- Subpage structure (subpages saved as placeholder linked-page blocks)
- Database structure (schema + views) but NOT database entries
- Page icon and cover image
- Page layout settings (full width, font)

**What is NOT saved:**
- Page permissions
- Comments
- Version history
- Database entries (entry data is never included)

---

### Managing Custom Templates

Available to the template creator and workspace Admin.

| Action | Description |
|--------|-------------|
| Edit | Opens the template page for editing. Changes affect only future uses — existing pages made from this template are not updated. |
| Rename | Change the template name and description |
| Delete | Permanently removes the template. Pages already created from it are unaffected. |

---

## Template Button Block

A special interactive block that creates a copy of a predefined block structure when clicked.

**Use case:** Recurring logs, daily journals, meeting notes — anything that repeats with the same structure.

### How it works

1. Insert a Template Button block via `/template-button`
2. Click `"Edit"` on the button to define the template content (any block types inside)
3. Set the button label (e.g., `"+ Add Today's Log"`)
4. Set the insertion location:
   - **Below the button** (default)
   - **At the bottom of the page**
5. When the button is clicked in normal view, a fresh copy of the template content is inserted at the configured location

### Configuration

| Setting | Options |
|---------|---------|
| Button label | Any text (e.g., "New Entry", "Add Meeting Notes") |
| Template content | Any block types — text, to-dos, tables, etc. |
| Insert location | Below button / Bottom of page |

**JSONB content shape** (stored in the block's `content` field in the `blocks` table):
```jsonc
{
  "label": "string — button text shown to the user",
  "template_blocks": [ /* array of block descriptors — same shape as page_snapshot.blocks;
                          IDs here are template-internal only, new UUIDs generated on each click */ ],
  "insert_location": "below_button | bottom_of_page"
}
```

---

## Template Placeholders

Built-in templates use placeholder blocks to guide users. Placeholder text is styled differently (faded, italicized) to show where to fill in content.

- Clicking a placeholder block focuses it and selects all placeholder text so the user can start typing immediately
- Placeholder blocks are regular blocks — they save normally if left unchanged

---

## Data Model

```
Template
├── id                  (uuid, primary key)
├── workspace_id        (foreign key → Workspace, nullable — null = built-in)
├── name                (string, required)
├── description         (string, nullable)
├── category            (enum: personal | productivity | project_mgmt | team | crm)
├── is_built_in         (boolean, default: false)
├── status              (enum: draft | published — built-in only; custom templates are always published)
├── created_by          (user_id, nullable — null for built-in)
├── page_snapshot       (jsonb — serialized page structure; see shape below)
├── created_at          (timestamp)
└── updated_at          (timestamp)
```

**`page_snapshot` JSONB shape:**

```jsonc
{
  "title": "Meeting Notes",           // string — page title to use for new pages from this template
  "icon": "📝",                       // string | null — emoji or image URL
  "cover_url": null,                  // string | null
  "is_full_width": false,
  "font_family": "default",
  "blocks": [                         // array of block descriptors (top-level blocks only)
    {
      "id": "<stable-template-uuid>", // stable UUID within the snapshot (for child references)
      "type": "h1",
      "content": { "text": [{ "text": "Agenda", "marks": [] }] },
      "schema_version": 1,
      "order_index": 0,
      "parent_block_id": null,        // null = direct child of page
      "children": []                  // nested block descriptors (same shape, recursive)
    }
  ],
  "subpages": [                       // subpage placeholders — rendered as linked_page blocks
    { "title": "Action Items" }       // only title is stored; a new blank subpage is created on apply
  ],
  "database_schema": null             // object | null — if the page IS a database template,
                                      // contains { properties: [...], views: [...] } (no entries)
}
```

> When a template is applied (`POST /api/templates/:id/use`), the server walks `page_snapshot.blocks` recursively, inserts them as `Block` rows under the new page (with new UUIDs), and creates placeholder subpages for each entry in `subpages`. Database schemas are recreated via `database_properties` and `database_views` rows — no entry data is copied. **All block IDs in `page_snapshot` are template-internal reference IDs used only during template definition — they are never persisted to the created page.** When the handler walks the snapshot, it generates brand-new UUIDs for every inserted `blocks` row.

---

## API Endpoints

### User-facing

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/templates` | List published built-in templates | Authenticated |
| GET | `/api/workspaces/:workspaceId/templates` | List workspace custom templates | Member+ |
| POST | `/api/workspaces/:workspaceId/templates` | Save a page as a template | Editor+ |
| PATCH | `/api/workspaces/:workspaceId/templates/:templateId` | Update template name / description | Creator or Admin |
| DELETE | `/api/workspaces/:workspaceId/templates/:templateId` | Delete a custom template | Creator or Admin |
| POST | `/api/templates/:id/use` | Create a page from a template | Editor+ |

### Orbit Admin (platform team only)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/orbit/templates` | List all built-in templates (draft + published) | Platform Admin |
| POST | `/api/orbit/templates` | Create a new built-in template | Platform Admin |
| GET | `/api/orbit/templates/:id` | Get built-in template detail | Platform Admin |
| PATCH | `/api/orbit/templates/:id` | Update template content, name, category | Platform Admin |
| PATCH | `/api/orbit/templates/:id/publish` | Publish template (make visible to users) | Platform Admin |
| PATCH | `/api/orbit/templates/:id/unpublish` | Unpublish template (hide from gallery) | Platform Admin |
| DELETE | `/api/orbit/templates/:id` | Delete a built-in template | Platform Admin |

---

## UI Screens

### User-facing

| Screen | Route / Location | Access |
|--------|----------------|--------|
| Template Gallery | Modal (New Page / sidebar / slash command) | All members |
| Template Preview | Modal tab | All members |
| Save as Template | Modal (from page options `···`) | Editor+ |

### Orbit Admin (WorkFlik team only)

| Screen | Route | Access |
|--------|-------|--------|
| Built-in Template List | `/orbit/templates` | Platform Admin |
| Template Editor | `/orbit/templates/new`, `/orbit/templates/:id/edit` | Platform Admin |
| Template Preview | `/orbit/templates/:id/preview` | Platform Admin |

---

## Business Rules

1. Custom templates are workspace-scoped — they are not visible to members of other workspaces.
2. A page created from a template is fully independent — editing the template does not retroactively change existing pages.
3. Deleting a custom template does not affect pages already created from it.
4. Only the template creator or a workspace Admin can edit or delete a custom template.
5. Built-in templates are authored and managed exclusively by the WorkFlik team via Orbit Admin (`/orbit/templates`). Workspace members and workspace Admins have no ability to create, edit, or delete built-in templates.
6. Built-in templates have a `draft` / `published` status. Only published templates appear in the user-facing gallery. Draft templates are visible only in Orbit Admin.
7. Each workspace allows up to **5 custom templates**. **Enforcement:** the `POST /api/workspaces/:workspaceId/templates` handler executes `SELECT COUNT(*) FROM templates WHERE workspace_id = :workspaceId AND is_built_in = false FOR UPDATE` before inserting; if count ≥ 5 it returns `400 { error: "Template limit reached. A workspace can have at most 5 custom templates." }`. The count check and the insert run in a single transaction (the `FOR UPDATE` prevents a race condition where two concurrent requests both read count = 4 and both succeed).
8. Template Button block content is part of the page's block structure — it is not a separate template stored in the template library.
9. Database entries are never included when saving a page as a template — only the database schema and views are preserved.

---

## Out of Scope (MVP)

- Template sharing across workspaces
- Template versioning (history of changes to a template)
- Community template marketplace
- Template ratings and reviews
- AI-generated templates (Phase 4)
- Template import / export
