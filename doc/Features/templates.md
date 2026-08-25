# Templates

## Overview

Templates are reusable page structures that help users get started quickly without building from scratch. Pagevo offers a built-in template gallery curated by the Pagevo team, and users can save any page as a custom template scoped to their workspace.

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
| Built-in | Pagevo team | All users across all workspaces |
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

All 16 built-in templates are **database pages**. Each spec below lists the exact icon, tagline, default view, all views, every database property (type + options), and the 3 sample rows pre-seeded in the template.

---

### Productivity

---

#### 📅 Meeting Notes

> *"Capture every meeting, stay on top of every decision."*

**Page type:** Database · **Default view:** All Meetings (table)

**Views:**

| View | Type | Filter / Sort |
|------|------|---------------|
| All Meetings ★ | Table | — |
| My Notes | Table | Created by = me |

**Database properties:**

| Property | Type | Options |
|----------|------|---------|
| Meeting name | Title | — |
| Date | Date | — |
| Category | Select | `Retro` · `Standup` · `Presentation` |
| Attendees | Person | multi |
| Created by | Created by | auto |

**Sample rows (3):**

| Meeting name | Date | Category |
|-------------|------|----------|
| Product release post-mortem | Feb 13, 2025 | Retro |
| Weekly team sync | Feb 13, 2025 | Standup |
| GTM strategy presentation | Feb 13, 2025 | Presentation |

---

#### ✅ Tasks Tracker

> *"Stay organized with tasks, your way."*

**Page type:** Database · **Default view:** All Tasks (table)

**Views:**

| View | Type | Filter / Sort |
|------|------|---------------|
| All Tasks ★ | Table | — |
| By Status | Table | Group by Status |
| My Tasks | Table | Assignee = me |

**Database properties:**

| Property | Type | Options |
|----------|------|---------|
| Task name | Title | — |
| Status | Select | `Done` · `In progress` · `Not started` |
| Assignee | Person | multi |
| Due date | Date | — |
| Priority | Select | `High` · `Medium` · `Low` |
| Task type | Select | `Polish` · `Feature request` |
| Description | Text | — |
| Effort level | Select | `Small` · `Medium` · `Large` |

**Sample rows (3):**

| Task name | Status | Due date | Priority | Task type | Effort level |
|-----------|--------|----------|----------|-----------|--------------|
| Improve website copy | Done | 02/03/2025 | High | Polish | Medium |
| Update help center & FAQ | In progress | 02/20/2025 | Medium | Feature request | Small |
| Publish release notes | Not started | 02/28/2025 | Low | Feature request | Small |

---

#### 🎯 Goals Tracker

> *"Align your team's objectives. Track progress seamlessly."*

**Page type:** Database · **Default view:** All Goals (table)

**Views:**

| View | Type | Filter / Sort |
|------|------|---------------|
| All Goals ★ | Table | — |
| By Status | Table | Group by Status |
| My Goals | Table | Owner = me |

**Database properties:**

| Property | Type | Options |
|----------|------|---------|
| Goal name | Title | — |
| Owner | Person | single |
| Status | Select | `In progress` · `Not started` · `Done` |
| Due date | Date | — |
| Priority | Select | `High` · `Medium` · `Low` |
| Team | Select | `Business Development` · `Account Management` · `Engineering` · `Marketing` · `Product` |

**Sample rows (3):**

| Goal name | Status | Due date | Priority | Team |
|-----------|--------|----------|----------|------|
| Increase sales by 20% | In progress | 02/26/2025 | High | Business Development |
| Launch 3 new products | Not started | 04/16/2025 | Medium | Account Management |
| Acquire 20K new users | Done | 02/03/2025 | Medium | Business Development |

---

#### 💡 Brainstorm Session

> *"Capture ideas. Prioritize together."*

**Page type:** Database · **Default view:** All Ideas (table)

**Views:**

| View | Type | Filter / Sort |
|------|------|---------------|
| All Ideas ★ | Table | — |
| By category | Table | Group by Category |

**Database properties:**

| Property | Type | Options |
|----------|------|---------|
| Idea | Title | — |
| Created by | Created by | auto |
| Priority | Select | `High` · `Medium` · `Low` |
| Category | Select | `Activation` · `Conversion` · `Top of funnel` |
| Upvote | Button | label: `Upvote` — increments Total votes by 1 and appends current user to Upvoted by |
| Total votes | Number | integer; default 0 |
| Upvoted by | Person | multi |

**Sample rows (3):**

| Idea | Priority | Category | Total votes |
|------|----------|----------|-------------|
| Launch back to school campaign | High | Activation | 0 |
| Simplify onboarding experience | Medium | Conversion | 0 |
| Improve SEO | Low | Top of funnel | 0 |

---

### Project Management

---

#### 🔵 Projects

> *"Manage and execute projects from start to finish."*

**Page type:** Database · **Default view:** By Status (board)

**Views:**

| View | Type | Filter / Sort |
|------|------|---------------|
| By Status | Board | Group by Status |
| All Projects ★ | Table | — |
| Gantt | — | *(Phase 2 — shown in UI, opens table fallback in MVP)* |

**Database properties:**

| Property | Type | Options |
|----------|------|---------|
| Project name | Title | — |
| Status | Select | `Not started` · `In progress` · `Done` |
| Priority | Select | `High` · `Medium` · `Low` |
| Owner | Person | single |

**Sample rows (3) — shown as board cards:**

| Project name | Status | Priority |
|-------------|--------|----------|
| Quarterly sales planning | Not started | Medium |
| Public launch of iOS app | In progress | High |
| Revamp new hire onboarding | Done | Low |

---

#### 🔴 Issue Tracking

> *"Easily manage issues and feedback to ensure timely resolutions."*

**Page type:** Database · **Default view:** Kanban (board)

**Views:**

| View | Type | Filter / Sort |
|------|------|---------------|
| Kanban | Board | Group by Status |
| All Issues ★ | Table | — |
| My Issues | Table | Assignee = me |

**Database properties:**

| Property | Type | Options |
|----------|------|---------|
| Issue name | Title | — |
| Status | Select | `Backlog` · `Open` · `In progress` · `In review` · `Testing` · `Won't fix` · `Done` |
| Priority | Select | `High` · `Medium` · `Low` |
| Assignee | Person | single |
| Reporter | Person | single |

**Sample rows (2) — shown as board cards:**

| Issue name | Status | Priority |
|------------|--------|----------|
| New issue 1 | Open | High |
| New issue 2 | In progress | Medium |

---

#### 🔴 Feature Requests

> *"Track and assign new feature requests."*

**Page type:** Database · **Default view:** By Status (board)

**Views:**

| View | Type | Filter / Sort |
|------|------|---------------|
| By Status | Board | Group by Status |
| All Requests ★ | Table | — |
| Assigned to Me | Table | Assignee = me |

**Database properties:**

| Property | Type | Options |
|----------|------|---------|
| Request name | Title | — |
| Status | Select | `New` · `Under Review` · `Planned` · `In Development` · `Launched` · `Declined` |
| Assignee | Person | single |
| Priority | Select | `High` · `Medium` · `Low` |

**Sample rows (3) — shown as board cards:**

| Request name | Status |
|-------------|--------|
| Drawing feature | New |
| New integration | Under Review |
| Easier login | In Development |

---

#### 🔵 Creative Projects

> *"Efficiently organize and manage creative projects."*

**Page type:** Database · **Default view:** By Status (board)

**Views:**

| View | Type | Filter / Sort |
|------|------|---------------|
| By Status | Board | Group by Status |
| All Projects ★ | Table | — |
| My Projects | Table | Owner = me |

**Database properties:**

| Property | Type | Options |
|----------|------|---------|
| Project name | Title | — |
| Status | Select | `Not started` · `In progress` · `Needs review` · `In review` · `Done` |
| Type | Select | `Branding` · `Illustration` · `Photography` · `Video` · `Copywriting` |
| Owner | Person | single |

**Sample rows (3) — shown as board cards:**

| Project name | Status | Type |
|-------------|--------|------|
| Project 1 | Needs review | Photography |
| Project 2 | In progress | Illustration |
| Project 3 | Not started | Branding |

---

### Marketing & Content

---

#### 🚩 Campaign Management

> *"Plan and track your campaigns."*

**Page type:** Database · **Default view:** By Status (board)

**Views:**

| View | Type | Filter / Sort |
|------|------|---------------|
| By Status | Board | Group by Status |
| All Campaigns ★ | Table | — |
| Calendar | Calendar | By Start date |

**Database properties:**

| Property | Type | Options |
|----------|------|---------|
| Campaign name | Title | — |
| Status | Select | `Blocked` · `Not started` · `Planning` · `On Hold` · `In Production` · `Launched` · `Done` |
| Channel | Multi-select | `X` · `LinkedIn` · `Instagram` · `Email` · `YouTube` · `Facebook` |
| Region | Multi-select | `EMEA` · `AMER` · `APAC` · `Global` |
| Campaign type | Multi-select | `Product launch` · `Sales promotion` · `Brand awareness` · `Event` |
| Start date | Date | — |

**Sample rows (3) — shown as board cards:**

| Campaign name | Status | Channel | Region | Campaign type |
|--------------|--------|---------|--------|---------------|
| New mobile app | Blocked | X | EMEA | Product launch |
| Engineering content | Not started | LinkedIn | AMER | Sales promotion |
| Win the market | Planning | Instagram | APAC | Brand awareness |

---

#### 📅 Content Calendar

> *"Plan and manage your content pipeline."*

**Page type:** Database · **Default view:** Calendar

**Views:**

| View | Type | Filter / Sort |
|------|------|---------------|
| Calendar | Calendar | By Publish date |
| All Content ★ | Table | — |
| By Status | Table | Group by Status |

**Database properties:**

| Property | Type | Options |
|----------|------|---------|
| Content title | Title | — |
| Status | Select | `Idea` · `Draft` · `In Review` · `Scheduled` · `Published` |
| Channel | Select | `Blog` · `Twitter/X` · `LinkedIn` · `Email` · `YouTube` · `Instagram` |
| Publish date | Date | used as the calendar date |
| Author | Person | single |
| Tags | Multi-select | `Product` · `Engineering` · `Marketing` · `Company` |

**Sample rows:** none pre-seeded — calendar opens empty so users start fresh.

---

#### 📅 Social Media Planner

> *"Plan and manage your social media content."*

**Page type:** Database · **Default view:** Calendar

**Views:**

| View | Type | Filter / Sort |
|------|------|---------------|
| Calendar | Calendar | By Scheduled date |
| All Posts ★ | Table | — |
| By Status | Table | Group by Status |

**Database properties:**

| Property | Type | Options |
|----------|------|---------|
| Post title | Title | — |
| Status | Select | `Idea` · `Draft` · `Scheduled` · `Published` |
| Platform | Select | `Instagram` · `Twitter/X` · `LinkedIn` · `Facebook` · `YouTube` · `TikTok` |
| Scheduled date | Date | used as the calendar date |
| Author | Person | single |
| Tags | Multi-select | freeform |

**Sample rows:** none pre-seeded — calendar opens empty.

---

#### 🗓️ Event Management

> *"Plan and manage your events."*

**Page type:** Database · **Default view:** All Events (table)

**Views:**

| View | Type | Filter / Sort |
|------|------|---------------|
| All Events ★ | Table | — |
| By Status | Table | Group by Status |
| Calendar | Calendar | By Event date |

**Database properties:**

| Property | Type | Options |
|----------|------|---------|
| Event name | Title | — |
| Event date | Date | — |
| Status | Select | `Registration open` · `Planning` · `Done` |
| Event owner | Person | single |
| Format | Select | `In person` · `Virtual` |
| Category | Select | `Community meetup` · `Internal event` · `Conference` · `Webinar` |
| Venue | Text | — |

**Sample rows (3):**

| Event name | Event date | Status | Format | Category | Venue |
|-----------|-----------|--------|--------|----------|-------|
| Make with Pagevo | Sep 16, 2025 | Registration open | In person | Community meetup | Venue 3 |
| Fireside chat | Mar 13, 2025 | Planning | In person | Internal event | Venue 2 |
| VIP dinner | Feb 12, 2025 | Done | Virtual | Community meetup | Venue 1 |

---

### Engineering & Docs

---

#### 📄 Document Hub

> *"Create and collaborate on documents in one place."*

**Page type:** Database · **Default view:** All Docs (table)

**Views:**

| View | Type | Filter / Sort |
|------|------|---------------|
| All Docs ★ | Table | — |
| My Docs | Table | Created by = me |

**Database properties:**

| Property | Type | Options |
|----------|------|---------|
| Doc name | Title | — |
| Category | Select | `Strategy doc` · `Proposal` · `Customer research` · `Report` · `Other` |
| Created by | Created by | auto |
| Created time | Created time | auto |
| Last edited by | Last edited by | auto |
| Last updated time | Last edited time | auto |

**Sample rows (3):**

| Doc name | Category |
|----------|----------|
| Company mission and strategy | Strategy doc |
| Proposal for new year campaign | Proposal |
| Customer feedback report | Customer research |

---

#### 📄 Engineering Docs

> *"Organize documents for transparent team communication."*

**Page type:** Database · **Default view:** All Docs (table)

**Views:**

| View | Type | Filter / Sort |
|------|------|---------------|
| All Docs ★ | Table | — |
| Published Docs | Table | Status = `Published` |
| Docs by Category | Table | Group by Category |

**Database properties:**

| Property | Type | Options |
|----------|------|---------|
| Doc name | Title | — |
| Author | Person | single |
| Status | Select | `Draft` · `In Review` · `Published` |
| Category | Multi-select | `PRD` · `Best Practices` · `Guide` · `RFC` · `Runbook` |
| Last edited time | Last edited time | auto |

**Sample rows (3):**

| Doc name | Status | Category |
|----------|--------|----------|
| New feature PRD | Draft | PRD |
| New engineering doc | Published | PRD, Best Practices |
| User guide | In Review | Guide |

---

### Sales & Finance

---

#### 🔵 Pipeline Tracking

> *"Track your sales pipeline."*

**Page type:** Database · **Default view:** By Deal Stage (board)

**Views:**

| View | Type | Filter / Sort |
|------|------|---------------|
| By Deal Stage | Board | Group by Deal Stage |
| All Deals ★ | Table | — |
| Active Deals | Table | Deal Stage not in `Won` · `Lost` · `No Deal` |

**Database properties:**

| Property | Type | Options |
|----------|------|---------|
| Deal name | Title | — |
| Deal Stage | Select | `New` · `Discovery` · `Negotiation` · `Won` · `Lost` · `No Deal` |
| Priority | Select | `High` · `Medium` · `Low` |
| Owner | Person | single |
| Company | Text | — |
| Value | Number | currency |

**Sample rows (3) — shown as board cards:**

| Deal name | Deal Stage | Priority |
|-----------|-----------|----------|
| Auto manufacturer | New | High |
| Software tech company | Discovery | Low |
| Consulting firm | Won | Medium |

---

#### 🏦 Fundraising Tracker

> *"Keep all information about potential investors in one place."*

**Page type:** Database · **Default view:** By Status (board)

**Views:**

| View | Type | Filter / Sort |
|------|------|---------------|
| By Status | Board | Group by Status |
| All Investors ★ | Table | — |
| Won | Table | Status = `Won` |

**Database properties:**

| Property | Type | Options |
|----------|------|---------|
| Investor name | Title | — |
| Status | Select | `Not started` · `Diligence` · `Pitched` · `Won` · `Lost` |
| Email | Email | — |
| Contact | Person | single |
| Fund size | Text | — |
| Notes | Text | — |

**Sample rows (3) — shown as board cards:**

| Investor name | Status | Email |
|--------------|--------|-------|
| VC firm 1 | Won | contact@vcfirm1.com |
| VC firm 2 | Pitched | contact@vcfirm2.com |
| VC firm 3 | Lost | contact@vcfirm3.com |

---

## How Built-in Templates Are Created and Managed

Built-in templates are authored and maintained by the **Pagevo team** through **Orbit Admin** at `/orbit/templates`. No direct database access or seed scripts are used — all template management goes through the admin UI so templates can be updated, previewed, and published without a deployment.

### Orbit Admin — Template Management (`/orbit/templates`)

This interface is only available to platform admins (Pagevo team). End users and workspace Admins have no access to it.

**Template list view:**
```
┌─────────────────────────────────────────────────────────┐
│ Built-in Templates                      [+ New Template] │
├──────────────────────┬──────────────────┬───────────────┤
│ Name                 │ Category         │ Status        │
├──────────────────────┼──────────────────┼───────────────┤
│ Tasks Tracker        │ Productivity     │ Published     │
│ Projects             │ Project Mgmt     │ Published     │
│ Campaign Management  │ Marketing        │ Draft         │
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

### Template Authoring Flow (Pagevo team)

1. Go to `/orbit/templates` → click **New Template**
2. Fill in: Name, Description, Category
3. Use the block editor to build the template content (all standard block types available, including databases, callouts, and template placeholder blocks)
4. Click **Preview** to verify how it looks to users
5. Click **Publish** — the template immediately appears in the user-facing gallery for all workspaces
6. To update: edit → re-publish. Changes take effect immediately; pages already created from the template are unaffected.

### Launch Templates

The following 16 built-in templates are authored by the Pagevo team via Orbit Admin before the product launches. They are in `published` state at launch:

**Productivity (4):** Meeting Notes, Tasks Tracker, Goals Tracker, Brainstorm Session
**Project Management (4):** Projects, Issue Tracking, Feature Requests, Creative Projects
**Marketing & Content (4):** Campaign Management, Content Calendar, Social Media Planner, Event Management
**Engineering & Docs (2):** Document Hub, Engineering Docs
**Sales & Finance (2):** Pipeline Tracking, Fundraising Tracker

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

### Orbit Admin (Pagevo team only)

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
5. Built-in templates are authored and managed exclusively by the Pagevo team via Orbit Admin (`/orbit/templates`). Workspace members and workspace Admins have no ability to create, edit, or delete built-in templates.
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
