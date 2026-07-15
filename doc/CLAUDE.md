# CLAUDE.md — WorkFlik

Guidance for Claude Code and all contributors working in this repository. This is the **authoritative short-form index**; detailed references live under [doc/](doc/) and [docs/](docs/).

---

## Project Overview

WorkFlik is an opinionated team workspace — "Notion's core, pre-assembled" — for small teams (3–15 people). Everything is a **block**; pages nest unlimitedly; databases are pages where each entry is itself a page.

**Status: active development.** The codebase is live and being iterated on. Keep these docs in sync with every meaningful change (Rule 1).

---

## User Actions & Flows

What users actually do in WorkFlik — with full context, sequence, and how each feature connects. Use this to understand intent when building or reviewing any feature. Nothing should be missing from this section.

---

### Overall User Journey

**First visit (new user):**
1. Receives a magic-link invite email OR signs in via Google → authenticated
2. New users go through the 4-screen onboarding wizard (mandatory, cannot be skipped)
3. Land on their first page inside their new workspace
4. Optional tooltip tour walks them through the sidebar and editor

**Returning user (daily use):**
1. Signs in via magic link or Google → lands on last visited page or workspace home
2. Uses the sidebar to navigate: browse the page tree, search (`Ctrl+K`), check notifications
3. Creates and edits pages, collaborates via comments, tracks work in databases
4. Receives in-app and email notifications when mentioned, replied to, or granted access

---

### Authentication

WorkFlik supports two sign-in methods: **magic link (passwordless)** and **Google OAuth**.

#### Magic Link (Passwordless)

1. User visits `/sign-in` → enters email → clicks "Email me a sign-in link"
2. Response always shows: *"If an account exists with this email, a sign-in link has been sent."* (prevents email enumeration)
3. User receives a one-time email link valid for **15 minutes**, single-use
4. Clicks the link →
   - **New email:** account auto-created, email marked verified, redirected to `/onboarding`
   - **Existing user:** session created, redirected to last active workspace
5. Link is immediately invalidated after use

#### Google OAuth

1. User clicks "Sign in with Google" on `/sign-in`
2. Google OAuth flow completes → user authenticated
3. Same outcome: new users go to `/onboarding`, existing users go to their workspace

#### Sessions

Sessions use a **7-day sliding window** — TTL resets on each authenticated request, keeping active users logged in.

From **Settings → Sessions** (`/settings/sessions`) a user can:
- View all active sessions: device type (Desktop/Mobile), browser, approximate location (city/country, IP-based), last active time, "Current session" badge on the active device
- Revoke any individual session (logs out that device)
- Revoke all other sessions (emergency log-out everywhere except the current device)

**Sign out:** User menu at the bottom of the sidebar → Sign out.

#### Account Deletion (`/settings/account` → Danger Zone)

- If the user is the sole Admin of any workspace, they must transfer ownership first — app blocks deletion and shows a message
- Requires typing their email address to confirm
- What happens to content:

| Content | Outcome |
|---|---|
| Pages in shared workspaces | Remain; `created_by` shown as "Former Member" |
| Comments | Remain visible; author shown as "Former Member" |
| Private pages | **Permanently deleted** — no one else can access them |
| Uploaded files on private pages | Deleted from object storage; workspace quota decremented |
| Workspace memberships | Removed from all workspaces |

---

### Onboarding (new users only — mandatory)

Triggered automatically when a user has no workspace. 4 linear screens, cannot be skipped:

**Screen 1 — Profile**
User sets display name, uploads avatar (optional), enters role/title. These appear everywhere: comments, member lists, mentions.

**Screen 2 — Workspace**
- Creates a new workspace: name + icon → becomes the Owner
- OR joins an existing workspace: pastes an invite link → added as member at the configured role

**Screen 3 — Invite team** *(skippable)*
Invites teammates by email. Invitees receive magic-link invite emails and go through onboarding themselves.

**Screen 4 — Starting template**
Picks from built-in templates (Meeting Notes, Project Tracker, Daily Journal, Team Wiki, Blank). Creates the workspace's first page. User lands inside it immediately after.

**Tooltip tour:** Optional guided highlight tour that plays after onboarding.
- Dismiss individual steps, skip the whole tour, or restart it from the Help menu
- Contextual hints (one-time callouts) — shown on first encounter with specific features (e.g. first time opening a database) — can each be individually dismissed

**Guest bypass:** A user who is invited as a guest to a specific page (not as a workspace member) skips the onboarding wizard entirely and is taken straight to the shared page they were invited to.

---

### Workspace

**Switching workspaces:** Click the workspace name/icon at the top-left of the sidebar → switcher opens → switch to any joined workspace or create a new one.

**Workspace settings:**

| Action | Who can do it |
|---|---|
| Edit workspace name, icon, URL slug | Admin |
| Set default page access for new pages (Shared / Private) | Admin |
| View storage usage with per-category breakdown | Admin |
| Delete workspace (all data erased, requires confirmation) | Admin |

**Member management (Admin only):**
1. Invite members by email → select role (Editor or Viewer) → invites sent
2. OR generate a shareable invite link (one link = one role) → anyone with the link joins
3. View all members, their roles, and join dates in the Members tab
4. View pending invitations; resend or cancel individual invites
5. Change a member's role (Editor ↔ Viewer) from their row dropdown
6. Remove a member → they lose workspace access immediately; the workspace invite link token is **automatically regenerated** so the removed user cannot silently rejoin via the old link
7. Transfer workspace ownership → triggers email confirmation from the recipient; takes effect only after they accept

---

### Pages

Pages are the core unit. Everything in WorkFlik is a page or lives inside one.

**Creating a page:**
- Click `+` in the sidebar → new untitled page at the workspace root
- Hover any existing sidebar page → click `+` that appears → creates a subpage nested under it
- Type `/page` inside the editor → inserts a linked subpage inline
- `Ctrl+N` → new page at root

**Personalizing:**
- Click the emoji area at the top of a page → emoji picker → set icon
- Click "Add cover" → image picker (upload or preset gallery) → cover set; drag to reposition vertically; click to remove
- Three-dot menu → Layout → toggle Full Width, Small Text, change font family

**Organizing:**
- Drag a page in the sidebar → reorders or nests it under another page
- Three-dot menu → "Move to" → searchable page picker → move to any location
- Three-dot menu → "Duplicate" → full copy with all content and subpages, placed under the same parent
- Double-click a page title in the sidebar → rename in place

**Lifecycle:**

| Action | What happens |
|---|---|
| Three-dot → "Delete" | Page moves to Trash (soft delete, 30-day recovery window) |
| Sidebar Trash → "Restore" | Page returns to its original location in the hierarchy |
| Trash → "Delete forever" | Permanent, irreversible removal of that page |
| Trash → "Empty Trash" | All trashed pages permanently deleted at once |
| Three-dot → "Lock page" | Page becomes read-only for all viewers |

**Breadcrumb:** Every page shows a breadcrumb at the top of the editor (Workspace → Parent → … → Current Page). Clicking an ancestor navigates to it. The breadcrumb updates automatically if the page is moved.

**Trash notes:**
- Pages nearing the 30-day auto-deletion limit show a warning banner when viewed from Trash (within the last 7 days before expiry)
- "Empty Trash" scope: Admins empty the entire workspace Trash; non-Admins empty only the pages they personally have permission to permanently delete

**Additional page actions:**
- Three-dot → "Version history" → side panel shows auto-saved snapshots with timestamps → click any to preview → "Restore this version" to roll back
- Three-dot → "Export" → choose format: Markdown, PDF, or HTML → file downloads
- Star icon on hover in sidebar → adds to personal Favorites (top of sidebar, visible only to that user; not shared)

---

### Editor

The editor is a block-based canvas. Every piece of content is a block.

**Inserting blocks:**
- Type `/` on any empty line → slash command menu → search or scroll to pick a type → Enter to insert
- Markdown shortcuts inline: `##` + space = Heading 2, `-` + space = bullet, `1.` + space = numbered list, ` ``` ` = code block, `>` + space = quote, `---` = divider

**Block types:**

| Category | Blocks available |
|---|---|
| Text | Paragraph, Heading 1, Heading 2, Heading 3, Bulleted list, Numbered list, Toggle, Quote, Callout, Divider |
| Media | Image, Video, Audio, File |
| Structured | Code (syntax-highlighted), Table, Columns, Equation, Table of Contents |
| Reference | Linked page, Inline database, Template button |

**Text formatting** (select text → toolbar appears, or keyboard shortcuts):

| Format | Shortcut |
|---|---|
| Bold | `Ctrl+B` |
| Italic | `Ctrl+I` |
| Underline | `Ctrl+U` |
| Strikethrough | — |
| Inline code | `Ctrl+E` |
| Link | `Ctrl+K` |
| Text color / Highlight | toolbar only |
| Comment on selection | toolbar only |

**Block operations** (via `⋮⋮` drag handle that appears on hover):
- Drag handle → drag to reorder block or nest it inside another
- Click handle → options: Comment, Duplicate, Move to (another page), Delete, Turn into (change block type), Color
- Multi-select: click block + Shift+click another → selects a range → bulk operations apply to all
- `Ctrl+Z` / `Ctrl+Shift+Z` → Undo / Redo (up to 200 steps)

**Mentions and references:**
- `@username` → mentions that person → they get a notification
- `@page title` → inserts a live link to a page in the workspace
- `@date` → inserts a formatted, hoverable date chip

**Nesting:** Blocks can be nested up to **10 levels deep**. The editor enforces this limit — deeper indentation is not allowed.

**Table of Contents block** (`/toc`): Auto-generates a linked outline from all H1/H2/H3 headings on the page. Updates live as headings are added or changed.

**Auto-save:** Saves continuously. Topbar shows "Saving…" → "Saved". If offline, edits queue locally and sync when connection restores.

---

### Databases

A database is a special page where every entry is itself a full page with properties and block content inside it.

**Creating a database:**
- `/database` in the editor → inline database embedded within a page
- New page → select "Database" → full-page standalone database

**Views:** A single database can have multiple views, each with its own independent filters, sorts, and grouping.

| View type | Best for |
|---|---|
| Table | Spreadsheet-style rows and columns |
| Board | Kanban-style cards grouped by a Select property |
| Calendar | Entries positioned on dates using a Date property |
| Gallery | Card grid with cover images and key properties |

View actions: "+ Add view" → name it → choose type. Rename / Duplicate / Delete any view from the view's three-dot menu.

**Creating entries:**

| View | How to add an entry |
|---|---|
| Table | Click "+ New" at the bottom row |
| Board | Click "+ New" inside a column (status group) |
| Calendar | Click a date cell → entry created with that date |
| Gallery | Click "+ New" button |

Click any entry → opens as a side panel (quick edit) or full page, depending on the database's entry-open setting. Three-dot on row/card → Delete → moves entry to Trash.

**Properties** (see full detail in Database Properties section below):
- Click a column header → edit property name, type, or settings
- Click `+` at the right edge of column headers (Table view) → add a property
- Toolbar "Properties" button → show/hide, reorder, resize columns per view

**Filtering:**
- "Filter" button → add filter rules per property → combine multiple rules with AND / OR logic

**Sorting:**
- "Sort" button → add up to 5 sort rules → each with a direction → drag to change priority order

**Grouping (Board / Table):**
- Group entries by a Select property → entries appear in columns by option value

**Board view extras:**
- Board columns can be hidden (data is preserved) or collapsed to header-only
- Columns can be reordered by dragging

**Calendar view extras:**
- The Date property used for positioning entries is configurable per view — if the database has multiple Date properties, each view can use a different one

**Row reorder (Table view):**
- Drag the row handle to reorder entries — only available when **no sort rule is active**; dragging is disabled while a sort is applied

---

### Database Properties

Properties define the structure of a database — typed columns that every entry in that database has.

**Managing properties:**
- **Add:** Click `+` in table column headers or "+ Add a property" in entry detail → pick type → name it → configure
- **Edit:** Click column header → "Edit property" → change name, type, format, or options
- **Rename:** Click header → rename inline
- **Change type:** Click header → "Edit property" → change type → existing values converted where possible; destructive conversions (→ Relation, → Person) require explicit confirmation and clear all existing values
- **Reorder:** Drag the column header (Table view) or the property row in the entry detail panel
- **Hide/Show:** Toggle visibility per-view from the "Properties" toolbar button; hidden properties still store values — they just aren't shown in that view
- **Delete:** Removes that property and **all its values across every entry** permanently — requires confirmation
- Maximum: **50 user-created properties** per database

**Property types:**

| Type | Stores | Notes |
|---|---|---|
| Text | Plain text, multi-line | Searchable in global search |
| Number | Integer or decimal | Format options: plain, USD ($), EUR (€), percentage (%), scientific |
| Select | One option from a predefined list | Options are color-coded badges; add new options inline |
| Multi-Select | Multiple options from a list | Multiple colored badges per entry |
| Date | Date or date range, with optional time | Stored in UTC, displayed in user's local timezone |
| Checkbox | Boolean (checked / unchecked) | Clickable directly in Table view and Board cards |
| URL | Web URL | Displays as a clickable link, opens in a new tab |
| Email | Email address | Displays as a `mailto:` link |
| Phone | Phone number | Displays as a `tel:` link |
| Person | One or more workspace members | `@me` resolves to the creating user at the moment of entry creation |
| Relation | Links to entries in another (or the same) database | Bidirectional — a back-relation property is auto-created in the linked database |

**System properties** (auto-generated, read-only, hidden by default — show per-view from Properties panel):
- Created Time · Last Edited Time · Created By · Last Edited By
- Can be used in filters and sorts; do not count toward the 50-property limit

**Default values:** Text, Number, Select, Multi-Select, Date, Checkbox, and Person properties can have a default value that is pre-filled when a new entry is created.

---

### Comments & Mentions

**Three places to add comments:**
- **Block-level:** Hover a block → comment icon appears → click → write → thread pins to that block
- **Text-level:** Select text in the editor → formatting toolbar → Comment → comment anchors to that text span
- **Page-level:** Scroll to the bottom of any page → write in the page-level comments section

**Thread actions:**
- Reply to a comment thread (one level of nesting only)
- Edit own comment (pencil icon on hover) — edited comments show an "(edited)" label with the last edit time on hover
- Delete own comment (three-dot → Delete)
- Resolve thread (checkmark) → collapses and is marked resolved; can be reopened
- Copy link to a specific comment thread

**Text-level comment anchor behavior:** If the highlighted text is slightly edited, the anchor adjusts to the nearest match. If the anchored text is entirely deleted, the comment becomes "orphaned" and moves to the page-level comments section with a note indicating the original text was removed.

**Mentions — work in both comments and editor body:**
- `@username` → notifies that person with a mention notification
- `@page title` → inserts a live-updated link to that page
- `@date` → inserts a formatted, hoverable date chip

---

### Notifications

**In-app notification center** (bell icon in sidebar or `Ctrl+Shift+N`):

A user receives notifications for:
- Being @mentioned in a comment or page content
- Receiving a reply on a comment thread they are part of
- Being granted access to a page
- A page they own approaching its 30-day Trash expiry
- Another workspace member creating a new page or database (excludes private pages — not visible to others — and database entries, which are created too often to announce workspace-wide)

Actions in the notification center:
- Filter by type: All / Mentions / Comments / Updates
- Click a notification → navigates directly to the source (page, block, or comment)
- Mark a single notification as read (checkmark on hover)
- Mark all notifications as read (button at the top)
- Unread count badge on the bell icon; clears as items are read
- New notifications also appear as a **real-time toast** in the bottom-right corner (auto-dismisses after 5 seconds); multiple simultaneous notifications are batched into one toast
- Notifications are delivered in real-time via Server-Sent Events (SSE) while the app is open

**Email notification preferences** (Settings → Notifications):

| Option | Behaviour |
|---|---|
| Real-time | One email sent immediately per event |
| Daily digest | One summary email per day |
| Weekly digest | One summary email per week; user picks the delivery day (Mon–Sun) |
| Off | No email notifications at all |

---

### Search

Global search covers all pages, database entries, block content, and comments the user has permission to see.

**Opening:** `Ctrl+K` or the Search icon in the sidebar.

- No query typed → shows recently visited pages
- Type a query → real-time results: page title, breadcrumb path, content excerpt, last updated timestamp

**Filters available in the search panel:**
- **Type:** Pages / Database entries / Comments
- **Location:** All workspace / Shared pages / Private pages / Inside a specific page
- **Date:** Last 7 days / Last 30 days / Custom date range
- **Title only toggle:** Matches only page titles — ignores body content

**Sort options:** Default order is relevance (title exact match first, title contains second, content matches third). Can also sort by: Last edited, Created date.

**Author filter:** Filter results by the member who created or last edited the content.

**Keyboard navigation:** `↑` / `↓` to move between results · `Enter` to open · `Esc` to close.

---

### Templates

WorkFlik ships with **16 built-in templates** authored by the WorkFlik team. Workspace members can also create their own custom templates.

**Using a template when creating a page:**
1. "+ New page" in sidebar → "Browse templates" button appears on the blank page
2. Template gallery opens → filter by category → preview any template
3. "Use template" → page content is populated from the template structure

**Custom templates (workspace-scoped, visible to all workspace members — limit: 5 per workspace):**
1. Build a page with the structure and content to reuse
2. Three-dot menu → "Save as template" → name it → appears in gallery under the "Workspace" category
3. Any workspace member can create pages from it
4. The creator or an Admin can rename, edit, or delete it
5. Templates can contain **placeholder blocks** — styled with faded, italicised text to guide users on what to fill in

**Template button block** (for repeating in-page patterns like checklists or agendas):
1. `/template-button` in the editor → inserts a clickable button
2. Configure: set button label, define the block structure it inserts, choose where (below button or bottom of page)
3. Any team member clicks the button → the predefined block structure is inserted at that location

---

### File Storage

Files are stored in S3-compatible object storage. The app server never proxies file bytes — uploads go direct from the browser via pre-signed PUT URLs. **Workspace quota: 5 GB.**

**Where users upload files:**
- **Page cover:** "Add cover" → drag-drop or file picker → cover set; drag to reposition vertically
- **Page icon:** Click icon area → "Upload image" tab → upload a custom icon image
- **User avatar:** Settings → Account → upload avatar image
- **Workspace icon:** Settings → Workspace → upload workspace icon
- **Editor media blocks:** `/image`, `/video`, `/audio`, `/file` → drag-drop or file picker → uploads to S3 directly, displayed inline

**Quota notes:**
- User avatars are **user-scoped** and do **not** count toward the workspace quota
- Workspace icon **does** count toward workspace quota
- Page covers, page icons, and editor media blocks all count toward workspace quota

**Storage awareness:**
- Settings → Workspace → Storage: total usage vs. 5 GB quota, bar chart (amber at 90%, red at 100%), per-category breakdown (File blocks, Page covers, Page icons, Workspace icon)
- At 90% usage: warning banner appears across the workspace
- At 100%: all new uploads are blocked until storage is freed (existing files remain accessible)

---

### Permissions & Sharing

WorkFlik has a two-layer access system: workspace role (Editor or Viewer) sets the default, and per-page permissions can override it for individual members or guests.

**Share panel** (Share button in page topbar):

**Workspace members:**
- Add a member to a page → assign access: Full Access / Can Edit / Can Comment / Can View
- Change an existing member's access level from the dropdown in the Share panel
- Remove a member's page-level access → they fall back to their workspace-level role

**Public link sharing:**
- Toggle "Share to web" → generates a public URL
- Access level for the public link: Can View or Can Comment (never Can Edit)
- Copy link · Disable (deactivates the URL immediately) · Regenerate (creates a new URL; the old one stops working)

**Guest access (external users, not workspace members):**
- Enter an external email → select Can View / Can Comment / Can Edit → guest receives an invite email
- Guests can only see pages they are explicitly invited to — no workspace sidebar access
- Revoke guest access at any time from the Share panel

**Private pages:**
- Toggle a page to Private → only explicitly added members can access it; workspace default role no longer applies
- Private indicator (lock icon) shown in the sidebar for members who have access
- Private pages are **completely hidden** from the sidebar and search results for all other users — including workspace Admins (no placeholder is shown)

**Guest invite expiry:** Guest invitations expire after **7 days** if not accepted. Expired invites can be resent from the Share panel.

**Permission ceiling rule:** Page-level permissions can restrict but never expand beyond a user's workspace role. An Editor can be downgraded to Can View on a specific page, but a Viewer cannot be upgraded to Can Edit via page permissions.

---

### Settings

**My Account (`/settings/account`) — all users:**
- Update display name, avatar image, role/title, preferred timezone (IANA; auto-detected from browser on first sign-in) — each field **auto-saves on blur** (no submit button needed)
- Delete account: must transfer workspace ownership first if sole Admin; type email to confirm; private pages permanently deleted; shared content remains with "Former Member" attribution

**Sessions (`/settings/sessions`) — all users:**
- View all active sessions: device, browser, approximate location, last active time
- Revoke any individual session (logs out that device)
- Revoke all other sessions (stays logged in on current device only)

**Notifications (`/settings/notifications`) — all users:**
- Set email frequency: Real-time / Daily digest / Weekly digest / Off
- If Weekly: choose which day of the week to receive the digest

**Workspace — General (`/settings/workspace`) — Admin only:**
- Change workspace name, icon, and URL slug *(slug change requires confirmation; old slug redirects via 308 for 30 days, then goes dead)*
- Set default page access for new pages: Shared with workspace or Private

**Workspace — Members (`/settings/workspace/members`) — Admin only:**
- Invite members by email → choose Editor or Viewer role
- View all members, their roles, and join dates
- Change a member's role (Editor ↔ Viewer)
- Remove a member from the workspace
- View and manage the invite link: copy, disable, or regenerate
- View pending invitations: resend or cancel individual invites

**Workspace — Danger Zone — Admin only:**
- Transfer workspace ownership → recipient confirms via email before it takes effect
- Delete workspace → all data permanently erased; text confirmation required

---

### Navigation & Sidebar

The sidebar is the persistent navigation hub — always visible, never re-renders during page changes.

**Sidebar sections (top to bottom):**
1. **Workspace switcher** — workspace name and icon; click to switch workspaces or create a new one
2. **Quick actions:** Search · New page · Notifications · Settings
3. **Recently Visited** — last 10 unique pages visited in this workspace (shown below the search button); revisiting a page updates its position, no duplicates
4. **Favorites** — personal starred pages (not shared with the team); shown only when at least one page is starred; can be reordered via drag-and-drop
5. **Page tree** — full workspace page hierarchy, expandable and collapsible
6. **Trash** — soft-deleted pages awaiting permanent deletion or restoration

**Page tree interactions:**

| Interaction | Result |
|---|---|
| Click a page | Navigate to it (hard cut, instant, no animation) |
| Click `▶` arrow | Expand or collapse children |
| Hover a page | Star icon (Favorites) and `⋯` three-dot menu appear |
| Right-click a page | Context menu — same options as the three-dot menu |
| Double-click page title | Rename the page in place |
| Drag a page | Reorder within the same parent or nest under a different page |
| Hover page + click `+` | Create a subpage directly under that page |
| Type in sidebar search bar | Filters the visible tree by title (client-side, instant, case-insensitive) |

**Sidebar filter note:** When filtering the tree by title, a page that matches keeps its full ancestor chain visible — parent pages are shown even if they don't match the query.

**Sidebar layout controls:**
- `Ctrl+\` → collapse / expand the sidebar
- Drag the right edge → resize the sidebar (min: 200px, max: 480px)
- Collapsed sidebar shows a thin icon-only strip; hovering it opens a floating peek panel
- At ≤ 1024px viewport, sidebar auto-collapses to icon-only mode

**Trash section:**
- Lists all soft-deleted pages with their deletion timestamps
- "Restore" → page returns to its original location in the hierarchy
- "Delete forever" → permanently removes that specific page
- "Empty Trash" → permanently removes all trashed pages at once

---

### Orbit Admin (Platform Team Only)

Orbit Admin (`/orbit`) is WorkFlik's internal operations dashboard. **Not accessible to any end user, including workspace Admins.** Access requires `is_platform_admin = true` set directly in the database — no UI exists to self-assign this role. Every action taken in Orbit is logged to an append-only audit trail.

**Dashboard (`/orbit`):**
- Platform-wide metrics: total users, active workspaces (any login in last 30 days), new signups (7d / 30d), current active sessions

**User Management (`/orbit/users`):**
- List and search all registered users (paginated; filter by name or email)
- View user detail: profile, linked workspaces, active sessions, account status
- Ban a user → immediately revokes all sessions; banned user cannot sign in (optional ban reason)
- Unban a user → restores sign-in access
- Impersonate a user → opens a marked support session logged in as that user (2-hour hard TTL, logged to audit trail)
- Revoke all sessions for a user → signs them out of every device
- View all active sessions for any user with device, IP, and last-active info

**Workspace Management (`/orbit/workspaces`):**
- List and search all workspaces (paginated; filter by name or ID)
- View workspace detail: members list, page count, storage usage
- Force-delete a workspace → permanently removes all data (text confirmation required; irreversible)

**Built-in Template Management (`/orbit/templates`):**
- List all built-in templates: name, category, status (Draft / Published)
- Create a new template using the block-based editor
- Edit template content, name, description, or category
- Categories are admin-managed (`template_categories` table), not a fixed list — from the template form, an admin can add a new category inline in addition to picking an existing one. A category can't be deleted while any template still references it.
- Preview a template as users see it in the gallery
- Publish → sets status to published; template appears in the user-facing gallery
- Unpublish → sets status to draft; template hidden from users
- Delete a template permanently (pages already created from it are unaffected)

**Analytics (`/orbit/analytics`):**
- Aggregated, anonymized platform metrics: signups over time, activation rate, feature usage by workspace, notification open rate, search usage and no-result rate

**Audit Trail (`/orbit/audit`):**
- Read-only, append-only log of every Orbit Admin action
- Each entry: timestamp, actor (platform admin), action type (e.g. `user.banned`, `session.impersonated`), target (user or workspace), optional notes
- Records cannot be deleted or modified

---

## Commands



| Command | Purpose |
|---|---|
| `pnpm dev` | Next.js dev server |
| `pnpm worker` | pg-boss background-job worker (separate process) |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm db:generate` | Generate SQL migration from Drizzle schema diff |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Browse data in Drizzle Studio |
| `pnpm lint` | ESLint / type-check |

---

## Tech Stack

Next.js 15 (App Router, React 19, TypeScript strict) · Tailwind CSS v4 · shadcn/ui · TipTap (ProseMirror) editor · PostgreSQL + Drizzle ORM v0.45 · Better Auth (magic-link + admin) · pg-boss (background jobs) · Nodemailer (SMTP) · SSE for real-time notifications · pnpm monorepo.

---

## Architecture

Two processes share one PostgreSQL database: **Next.js** (web UI + API routes + SSE) and **pg-boss worker** (`worker/`, background jobs — email, digests, trash purge). **All slow, retryable, or scheduled work goes through the worker via pg-boss — never inline in a Next.js request** (Rule 2).

- **Backend overview, worker scaling, service layer, registries** → [docs/architecture/backend-overview.md](docs/architecture/backend-overview.md)
- **Background jobs** → [docs/architecture/background-jobs.md](docs/architecture/background-jobs.md)
- **Database schema** → [DATABASE-PLAN.md](DATABASE-PLAN.md)
- **Security model** → [docs/security.md](docs/security.md)
- **API endpoints** — each `Features/*.md` spec lists endpoints for its feature

---

## Conventions

- **Path alias — always `@/`** for in-repo imports, never relative `./`/`../`.
- **Job handlers** live in `lib/jobs/handlers/{job-name}.ts` — registered once in `lib/jobs/register.ts`.
- **Schema** is split one file per domain under `lib/db/schema/`, shared enums in `lib/db/schema/types.ts`.
- **Auth/permission order**: `requireSession` → `requireWorkspaceMember` → `requirePagePermission`. Never reimplement inline.
- **`updated_at` always uses the `updatedAt()` helper** so the timestamp refreshes on UPDATE.
- **Timestamps are UTC in the DB**; render in the browser's local timezone.
- **All env vars** validated with Zod in `lib/env.ts` — never read `process.env` directly elsewhere (Rule 9).

---

## UI & Design System

> **These rules apply to every component, page, and PR. No exceptions.**

### 1 — Use CSS variables. Never hardcode values.

All colors, radii, and shadows must come from the design token system defined in `app/globals.css`. Using a hardcoded hex, rgb, or px value where a token exists is a bug.

**Colors — always use semantic Tailwind classes or CSS variables:**
```
✅  bg-background      text-foreground      border-border
✅  bg-card            text-muted-foreground bg-primary
✅  text-primary       bg-accent            bg-muted
✅  var(--primary)     var(--foreground)    var(--border)

❌  bg-[#F8FBFF]       text-[#0C2340]       border-[#DAEAF5]
❌  color: #0284C7     background: white    border: 1px solid #ddd
```

**Radius — only the five defined steps:**
```
rounded-[var(--radius-xs)]   →  4px   (chips, badges, tiny pills)
rounded-[var(--radius-sm)]   →  6px   (buttons, inputs, tags)
rounded-[var(--radius-md)]   →  8px   (cards, panels, dropdowns)
rounded-[var(--radius-lg)]   →  10px  (modals, sidebars, page sections)
rounded-[var(--radius-xl)]   →  14px  (hero cards, full-width banners)

❌  rounded-lg  rounded-xl  rounded-2xl  rounded-[12px]  (Tailwind defaults bypass the scale)
```

**Spacing — use Tailwind's standard scale only:**
```
✅  px-4  py-3  gap-2  mt-6
❌  px-[13px]  py-[7px]  gap-[18px]  (arbitrary values scatter the grid)
```

### 2 — No shadows anywhere in the app

WorkFlik uses border + background contrast for depth, not drop shadows. Remove all shadow utilities from every component.

```
❌  shadow-[var(--shadow-card)]
❌  shadow-[var(--shadow-raised)]
❌  shadow-[var(--shadow-float)]
❌  shadow-sm  shadow-md  shadow-lg  shadow-xl
❌  drop-shadow-*  filter: drop-shadow(...)
❌  box-shadow: ...  (inline styles)
```

Depth hierarchy without shadows:
- **Default surface** → `bg-background`
- **Raised surface (cards, panels)** → `bg-card` + `border border-border`
- **Overlay surface (dropdowns, popovers)** → `bg-popover` + `border border-border`
- **Active / selected** → `bg-accent` or `bg-primary/10`

### 3 — Border width: always 1px (`border`)

Never use `border-2`, `border-4`, or `border-[Npx]` for standard UI. The only exception is accent lines (e.g., active tab indicator), which use `border-b-2 border-primary`.

```
✅  border border-border          (standard card / input border)
✅  border-b-2 border-primary     (active tab underline only)
❌  border-2  border-4  border-[3px]
```

### 4 — Typography: font variables only, consistent scale

The app font is **Inter** (sans) and **Geist Mono** (mono), loaded via `next/font/google` in `app/layout.tsx` and exposed as CSS variables `--font-sans` / `--font-mono`. Never reference a font family by name in component code — always use the Tailwind utility classes.

```
✅  font-sans   font-mono   (Tailwind classes → var(--font-sans) / var(--font-mono))
❌  font-['Inter']  fontFamily: 'Inter, ...'  style={{ fontFamily: '...' }}
```

**Size scale for UI text (use these, not arbitrary sizes):**
```
text-[10px] / text-[10.5px]   →  micro labels, eyebrows, table meta
text-xs  (12px)               →  captions, secondary labels, descriptions
text-sm  (14px)               →  body text, list items, inputs
text-base (16px)              →  primary body, card titles
text-lg / text-xl             →  page headings
text-2xl / text-3xl+          →  hero / section headings only
```

**Weight scale:**
```
font-medium  (500)   →  UI labels, nav items
font-semibold (600)  →  card titles, section headers, button text
font-bold    (700)   →  page titles, column headers
font-black   (900)   →  hero headlines only (landing page)
```

**Letter-spacing:** use only `tracking-tight` (`-0.025em`) for headings. Leave body at default. Never use positive tracking in UI.

### 5 — TipTap editor follows the design system

The ProseMirror editor must use CSS variables for all colors. Hard-coded hex values in editor styles are treated as bugs.

```
✅  color: var(--foreground)       background: var(--muted)    border-color: var(--border)
❌  color: #1e1e1e                 background: #F8FAFC         border-color: #ddd
```

The code-block background (`#1e1e1e`) and syntax token colors are the one approved exception — they are part of the VS Code Dark syntax theme and intentionally fixed. Everything else in `.ProseMirror` must use tokens.

### 6 — Design consistency checklist

Before every PR that touches UI, verify:

- [ ] All colors are semantic tokens — no hex/rgb hardcoded
- [ ] All radii use `var(--radius-*)` — no `rounded-lg`, `rounded-xl`, or `rounded-[Npx]`
- [ ] No shadow utilities anywhere in the diff
- [ ] Border is `border border-border` (1px) — no `border-2+`
- [ ] Font classes are `font-sans` or `font-mono` — no hardcoded family names
- [ ] Text sizes follow the defined scale
- [ ] Spacing uses Tailwind standard scale — no `px-[Npx]` arbitrary values
- [ ] Interactive states (hover, focus, active, disabled) are defined for every interactive element
- [ ] Focus ring uses `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- [ ] All images use `<Image>` from `next/image` — no raw `<img>` tags
- [ ] All icons from `lucide-react` — no other icon library, no inline SVG
- [ ] Icon-only buttons have `aria-label`
- [ ] Every empty state shows a message and a CTA
- [ ] Every destructive action goes through `<AlertDialog>`
- [ ] Buttons that trigger network requests show a spinner + disabled state while in flight
- [ ] No `"use client"` added higher than necessary in the tree
- [ ] All hover states use `bg-accent` or approved variants — no arbitrary colors
- [ ] All color-changing hover interactions have `transition-colors duration-150`
- [ ] No `duration-300+` transitions on any interactive element
- [ ] Tooltips use shadcn `<Tooltip>` with `delayDuration={400}` — no custom tooltip
- [ ] Single-line text contexts use `truncate` + `min-w-0` on flex parent
- [ ] Contextual menus use `<DropdownMenu>` or `<ContextMenu>` — destructive items at bottom with `text-destructive`
- [ ] Timestamps shown in browser local timezone, relative < 7 days, absolute ≥ 7 days
- [ ] Avatars use the defined size scale and `rounded-full` — no square avatars
- [ ] Drag handles use `<GripVertical>`, visible on hover only
- [ ] Breadcrumb present on all page views, current page non-clickable

### 7 — The UI must not look "AI-generated"

AI-generated UIs share predictable tells: over-rounded corners on everything, gradient backgrounds layered on gradients, excessive padding, arbitrary spacing that breaks the grid, no visual hierarchy, and components that hover between "too much decoration" and "no personality." Avoid all of these.

**What WorkFlik UI should feel like:**
- Clean, calm, spacious — like Linear or Notion
- Consistent rhythm — same spacing unit repeated, not eyeballed per-component
- Strong typographic hierarchy — sizes and weights do the work, not color noise
- Borders and backgrounds create depth — no shadows, no glass-morphism
- Interactions are subtle and immediate — hover states, not animations on idle elements

**Anti-patterns to never introduce:**
- Multiple gradient layers stacked on a single element
- `backdrop-blur` on anything except modals/overlays (creates GPU compositing bugs)
- Icons inside icons, badges on badges, decoration on decoration
- Different border radius on adjacent elements of the same type
- Inline styles for spacing, color, or radius — use Tailwind classes

### 8 — Delete actions always require a confirmation popup

Every destructive delete action anywhere in the app **must** show a confirmation dialog before executing. No exceptions — not even for "obviously safe" deletes.

**Required confirmation dialog anatomy:**
- Title: clear statement of what will be deleted (e.g. "Delete this page?", "Remove member?")
- Body: one sentence describing what will be lost and whether it is reversible (e.g. "This page and all its sub-pages will be moved to Trash." or "This cannot be undone.")
- Buttons: **Cancel** (left, `variant="outline"`) and **Delete** (right, `variant="destructive"`)
- Dialog must use `<AlertDialog>` from shadcn/ui — never a plain `<Dialog>` for destructive actions

```
✅  <AlertDialog> with AlertDialogCancel + AlertDialogAction (destructive)
❌  window.confirm()   inline onClick delete without confirmation   toast with undo
```

**Applies to:** page delete, block delete, workspace delete, member remove, template delete, property delete, comment delete, database row delete, file/attachment delete — any action that removes data.

### 9 — Modal layout: close icon right, actions left

In every modal, dialog, sheet, and drawer:

- **Close button (X)** is always in the **top-right corner** — use the shadcn/ui `DialogClose` or `SheetClose` component placed in the header's right slot.
- **Title and primary context** are on the **left** of the header.
- **Action buttons** (Save, Confirm, Apply) appear at the **bottom-right** of the dialog footer; secondary/cancel buttons are to their left.
- Never put a close icon on the left. Never put settings icons or action menus on the right of the header (that slot belongs to close only).

```
✅  [Title / breadcrumb]                           [X]   ← header
    [content]
    [Cancel]  [Primary Action]                           ← footer

❌  [X]  [Title]                                         ← close on wrong side
❌  [Title]  [⚙ settings]  [X]                           ← settings crowding close slot
```

### 10 — Logical UI: every element must make sense to a first-time user

The UI must be self-explanatory. A user who has never seen WorkFlik before should be able to figure out what any button, label, or section does without reading docs, hovering for tooltips, or asking for help.

**Placement must match expectation:**
- Primary actions (Create, Save, Apply) go where users look first — top-right of a panel, or bottom-right of a form.
- Destructive actions (Delete, Remove) are always visually separated from safe actions — never adjacent to "Save" with the same weight.
- Navigation always lives in the same place — sidebar for pages, topbar for workspace-level controls. Never move nav into content areas.

**Labels describe the outcome, not the mechanism:**
```
✅  "Delete page"        "Move to Trash"       "Invite member"
❌  "Submit"             "Execute"             "Perform action"
```

**Every action has immediate feedback:**
- Clicking a button must produce a visible response within 100 ms (spinner, disabled state, optimistic update, or state change).
- Silence after a click = broken UI in the user's mind.

**Group related things together. Separate unrelated things:**
- Settings for an entity (page, workspace, member) live in one place, not scattered across multiple menus.
- Filters, sorts, and view controls for a list are always together — never split across different toolbars.

**No hidden functionality:**
- If a feature exists, the user must be able to discover it without guessing. Use visible buttons, clear menus, or explicit empty states with a call-to-action.
- Keyboard shortcuts are additive — they speed up power users but never the only way to do something.

**Consistency is logic:**
- If "rename" is in the right-click menu for pages, it must be in the right-click menu for every entity that can be renamed.
- Same action = same icon + same label everywhere. Never use different wording for the same operation in different parts of the app.

### 11 — `use client` boundary: push it as deep as possible

Every `"use client"` directive added high in the component tree forces its entire subtree to ship as client JS and re-render on navigation. Keep the boundary as deep as possible.

```
✅  Server component fetches data → passes props to a small "use client" interactive leaf
❌  "use client" on a page-level layout that wraps the whole content area
```

- Page-level components (`page.tsx`, `layout.tsx`) must be Server Components unless there is no alternative.
- Extract only the interactive parts (dropdowns, forms, live counters) into `"use client"` components.
- Never add `"use client"` to a component just to use `useState` for a toggle — lift that state to a tiny wrapper.

### 12 — Skeleton screens must match page layout

`loading.tsx` skeletons must mirror the shape of the actual content they replace. A generic spinner is not acceptable — it causes layout shift when real content loads.

```
✅  Sidebar skeleton = list of lines matching page-item height
✅  Page editor skeleton = title bar placeholder + paragraph lines
✅  Database skeleton = table header + N grey rows
❌  <Spinner /> centered on the page
❌  Blank white area while data loads
```

- Use `bg-muted animate-pulse rounded-[var(--radius-sm)]` for skeleton blocks.
- Match the number of items to the expected content (3–5 rows for lists, full-width bar for titles).
- The sidebar and topbar must never be part of any skeleton — they stay painted at all times.

### 13 — Always use Next.js `<Image>` for images

Never use a raw `<img>` tag for any image in the app. Always use `next/image` `<Image>`.

```
✅  import Image from "next/image"  →  <Image src={url} alt="..." width={40} height={40} />
❌  <img src={url} />
```

- Set explicit `width` and `height` to prevent layout shift.
- Use `priority` for above-the-fold images (workspace icons, user avatars in header).
- For user-generated cover images, use `fill` with a sized container and `object-cover`.

### 14 — Icon library: lucide-react only

All icons must come from `lucide-react`. Never import from a different icon library, use raw SVGs inline, or use emoji as icons in UI chrome.

```
✅  import { Trash2, Plus, ChevronRight } from "lucide-react"
❌  import { FaTrash } from "react-icons/fa"
❌  <svg>...</svg> inline in JSX
❌  🗑️ as a UI icon
```

- Icon size in UI chrome: `size={14}` or `size={16}`. Never use px values directly — pass the `size` prop.
- Icons inside buttons: always paired with a visible label OR an `aria-label` on the button.

### 15 — Empty states: always show a message and a call-to-action

Every list, grid, or section that can be empty must show a meaningful empty state — never a blank area.

**Required empty state anatomy:**
- Icon or illustration (optional but preferred)
- Title: one short sentence describing what's missing (e.g. "No pages yet")
- Subtitle: one sentence on what the user can do (e.g. "Create your first page to get started.")
- CTA button (where applicable): primary action to fill the empty state

```
✅  Empty pages list → "No pages yet" + "Create page" button
✅  Empty members list → "No members" + "Invite someone" button
❌  Empty area with nothing — looks broken
❌  "No data found" with no next step
```

### 16 — Error states: always show a recovery UI

When an API call or data fetch fails inside a page, never show a blank area or silently swallow the error. Always render an error state with a recovery action.

```
✅  "Something went wrong" message + "Try again" button (retries the fetch)
✅  Toast for transient errors on mutations (save failed, upload failed)
❌  Blank area where content should be
❌  Console.error only, no visible feedback to the user
```

- Use `error.tsx` at each route segment for unrecoverable page-level errors.
- For in-component fetch errors, show an inline error state in place of the content.
- Never show raw error messages or stack traces to the user.

### 17 — Toast usage policy

Toasts are for **transient, non-blocking feedback** only. They must not be the only feedback mechanism for critical outcomes.

```
✅  "Link copied"          (clipboard, auto-dismisses)
✅  "Saved"                (after auto-save, subtle)
✅  "Invitation sent"      (success after async action)
✅  "Failed to save — try again"  (mutation error with retry)
❌  Validation errors      (show inline under the field)
❌  Loading state          (use button spinner or skeleton)
❌  Confirmation of destructive actions  (use AlertDialog)
```

- Max one toast visible at a time. Never stack multiple toasts.
- Auto-dismiss after 4 seconds for success toasts. Error toasts stay until dismissed.
- Toast position: bottom-right. Never top-center or top-right (blocks navigation).

### 18 — Mutation loading states

Every button that triggers a network request must show a loading state while the request is in flight. The user must always know something is happening.

```
✅  Button shows spinner + disabled while submitting
✅  Optimistic update (show result immediately, revert on error)
❌  Button does nothing visually until server responds
❌  Double-submit possible because button stays enabled
```

- Disable the submit button and show a spinner (`<Loader2 className="animate-spin" />`) during the request.
- For optimistic updates, immediately update the UI and show an error toast + revert if the server returns an error.
- Never leave a user wondering if their click registered.

### 19 — Accessibility basics (a11y)

WorkFlik must be usable with a keyboard and screen reader. These are the minimum requirements — not optional.

**Required for every interactive element:**
- All buttons, links, and inputs must have a visible label or `aria-label`.
- Icon-only buttons must have `aria-label` describing the action (e.g. `aria-label="Delete page"`).
- Focus ring must be visible: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.
- Never remove focus styles with `outline-none` alone — always pair with `focus-visible:ring-*`.

**Required for modals and drawers:**
- Focus must move into the modal when it opens (`autoFocus` on the first interactive element or the dialog itself).
- Focus must return to the trigger element when the modal closes.
- Modal must be closeable with the `Escape` key (shadcn/ui `<Dialog>` handles this automatically).

**Required for forms:**
- Every `<input>` and `<textarea>` must have an associated `<label>` (via `htmlFor` / `id` or `aria-label`).
- Error messages must be linked to their field with `aria-describedby`.

### 20 — Responsive scope

WorkFlik is a **desktop-first** application. The primary supported viewport is 1280px and above.

- Layouts must not break at 1024px (laptop screens). Test at this width before every PR.
- Below 768px (mobile): the app does not need to be fully functional, but it must not show broken layouts or overlapping text. Show a "best viewed on desktop" notice if needed.
- Never use fixed pixel widths that cause horizontal scroll at 1280px.
- Sidebars collapse to icon-only at ≤ 1024px where the layout would otherwise overflow.

### 21 — Hover, active, and transition conventions

Every interactive element must have a consistent hover and active state. Never leave a clickable element with no visual response.

**Hover state — use these, nothing else:**
```
bg-accent            →  default hover for list items, nav items, menu rows
bg-accent/80         →  hover for already-selected/active items
bg-primary/10        →  hover for items on a primary-colored surface
text-foreground      →  hover text color (from muted-foreground baseline)
```

**Active / pressed state:**
```
bg-accent/70         →  pressed state (mousedown) for list items
bg-primary/20        →  pressed state on primary-tinted surfaces
```

**Focus state — always use the ring system:**
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
Never use `outline` or `border` to simulate focus. Never suppress focus with just `outline-none`.

**Transition timing — one rule for the whole app:**
```
✅  transition-colors duration-150    (color/background changes — nav, buttons, list items)
✅  transition-opacity duration-150   (fade in/out for overlays, tooltips)
✅  transition-all duration-150       (only when multiple properties change together)
❌  duration-300  duration-500        (too slow — feels laggy)
❌  no transition on interactive elements  (feels broken/abrupt)
```

- Every `hover:` class that changes a color must be paired with `transition-colors duration-150`.
- Modals and sheets use the shadcn/ui default animation (already tuned) — do not override it.
- Never animate layout properties (`width`, `height`, `padding`, `margin`) on hover — they cause reflow.

### 22 — Tooltips: when and how to use them

Tooltips are for **icon-only buttons and truncated text** — not for explaining features or adding descriptions that should be in the label.

```
✅  Icon-only button → tooltip shows the action name ("Delete page")
✅  Truncated sidebar title → tooltip shows the full title on hover
✅  Keyboard shortcut hint → shown inside the tooltip alongside the label
❌  Tooltip explaining what a visible-label button does — the label should be clear enough
❌  Tooltip on disabled elements — show the reason inline or not at all
```

- Use shadcn/ui `<Tooltip>` with `<TooltipProvider>` — never a custom tooltip.
- Delay: `delayDuration={400}` — tooltips must not flash instantly on hover.
- Max width: `max-w-xs`. Never let a tooltip wrap to more than 2 lines.
- Never put interactive elements (buttons, links) inside a tooltip.

### 23 — Text truncation: long names never wrap in single-line contexts

Page titles in the sidebar, member names in lists, database property values in table cells — all single-line contexts must truncate with an ellipsis, never wrap.

```
✅  <span className="truncate">Long page title that goes on forever...</span>
✅  <p className="truncate">Member name</p>
❌  long titles wrapping to 2 lines inside a sidebar nav item
❌  overflow-hidden without truncate (hides text but leaves no ellipsis)
```

- Sidebar page titles: `truncate` + `min-w-0` on the parent flex container (required for truncate to work inside flex).
- Table cells: `truncate max-w-[200px]` (or the column's defined width).
- Topbar breadcrumb: truncate middle segments, always show the last segment (current page) in full.
- Full title is always accessible via tooltip (Rule 22).

### 24 — Contextual menus: three-dot and right-click

Every entity that can be acted on (page, block, member, template, database row) must expose its actions via a consistent menu — either a three-dot `⋯` button or a right-click context menu.

**Three-dot button (`⋯`):**
- Appears on hover of the row/item — hidden at rest to keep UI clean.
- Icon: `<MoreHorizontal size={16} />` from lucide-react. Never use a gear icon for this.
- Opens a `<DropdownMenu>` from shadcn/ui.
- Position: right side of the row, vertically centered.

**Menu item order — always this sequence:**
```
1. Primary action (Open, View)
2. Edit actions (Rename, Edit, Duplicate)
3. Move / organizational actions
4. ─── divider ───
5. Destructive actions (Delete, Remove, Archive) — with red text (text-destructive)
```

**Right-click context menu:**
- Use `<ContextMenu>` from shadcn/ui for page items in the sidebar and database rows.
- Same item order as the three-dot menu — never different content in the two menus for the same entity.

### 25 — Date and time display

Timestamps appear throughout the app (page updated, comment posted, notification received). Use the correct format for the context.

```
Relative (< 7 days ago):    "just now"  "5 minutes ago"  "yesterday"  "3 days ago"
Absolute (≥ 7 days ago):    "Jun 19, 2025"
Absolute with time:         "Jun 19, 2025 at 2:30 PM"  (use for comments and notifications)
```

- Always render timestamps in the **browser's local timezone** (timestamps are UTC in DB — Rule 9 of Conventions).
- Relative timestamps must update live — use a client component that recalculates on a timer or on re-render.
- Never show raw ISO strings (`2025-06-19T14:30:00Z`) to the user.
- Hovering a relative timestamp must show the full absolute datetime in a tooltip.

### 26 — Avatars and member initials

Member avatars appear in page headers, comments, member lists, and notification items. All avatar instances across the app must be visually consistent.

**Size scale — use only these:**
```
size-5  (20px)  →  inline mentions, compact lists
size-6  (24px)  →  table cells, notification items
size-7  (28px)  →  sidebar member list, comment threads
size-8  (32px)  →  page header, member cards
size-10 (40px)  →  profile/settings page only
```

**Fallback initials (when no avatar image):**
- Show first letter of first name + first letter of last name (or first 2 letters of display name).
- Background color: derived from the user's name deterministically (same name = same color every time) — use a fixed palette of `bg-*` semantic colors, never random.
- Text: `text-xs font-semibold text-white` (or dark variant for light backgrounds).

**Shape:** always `rounded-full`. Never square avatars.

### 27 — Drag and drop visual feedback

Blocks in the editor and pages in the sidebar support drag-to-reorder. The visual feedback during a drag must be clear and consistent.

**During drag:**
- The dragged item shows reduced opacity (`opacity-50`) to indicate it has been "lifted."
- A drop indicator line (`bg-primary h-0.5`) appears between items at the valid drop position — not a highlighted zone, just a thin line.
- Cursor: `cursor-grabbing` while dragging, `cursor-grab` on the drag handle at rest.

**Drag handle:**
- Use `<GripVertical size={14} />` from lucide-react.
- Visible only on hover of the item (`opacity-0 group-hover:opacity-100 transition-opacity duration-150`).
- Never show the drag handle on non-draggable items.

**Invalid drop zones:**
- No visual change — do not highlight invalid targets in red or show error states.
- Simply prevent the drop silently.

### 28 — Breadcrumb navigation

The topbar breadcrumb shows the path from the workspace root to the current page. It must always be present on page views and reflect the actual nesting path.

**Rules:**
- Segments are separated by `<ChevronRight size={14} className="text-muted-foreground" />`.
- Each ancestor segment is a clickable `<Link>` that navigates to that page.
- The current page (last segment) is non-clickable, `text-foreground font-medium`.
- All ancestor segments use `text-muted-foreground` and `hover:text-foreground transition-colors duration-150`.
- If the path is too long (> 4 segments), collapse the middle segments into `…` with a dropdown showing the hidden ancestors on click.
- Workspace name is always the first segment.

```
✅  WorkFlik  >  Projects  >  Q3 2025  >  Current Page
✅  WorkFlik  >  …  >  Sub-sub  >  Current Page   (collapsed middle)
❌  Current Page   (no path context)
❌  Full path wrapping to two lines
```

---

## Navigation & Page Rendering (Performance)

### Instant navigation — no visible loading on page changes

WorkFlik pages must feel instant. A user clicking a sidebar link must see the new page content immediately — no spinner, no blank white flash, no layout shift.

**Core rules:**
- **Use React Server Components** for all initial data fetching. Data must arrive with the HTML, not after a `useEffect`.
- **Add `loading.tsx`** at each route segment that has meaningful async work. The skeleton must match the page layout (see UI Rule 12) — never a centered spinner.
- **Never fetch data in a client component `useEffect`** when that data is needed for the initial render. Move it to the server component.
- **Prefetch links** — all sidebar and navigation links must use Next.js `<Link>`. Never use `<a href>` for internal navigation.
- **No full-page loading states for navigation** — sidebar and topbar must remain painted at all times during route transitions.

**Layout hierarchy during navigation:**
```
RootLayout (never re-renders)
  └── WorkspaceLayout: sidebar + topbar (stays painted)
        └── page.tsx + loading.tsx (only this swaps on navigation)
```
Only the innermost content area should ever change. The sidebar and topbar are part of the layout — they must never flash, reload, or disappear.

**Transition style:** Hard cut — no fade, no slide, no animation between pages. The skeleton appears instantly and is replaced by real content as soon as the server responds. Animation on page transitions adds perceived latency.

**Suspense boundaries for in-page sections:** If one section of a page loads slower than the rest (e.g. a large database view), wrap it in `<Suspense fallback={<SectionSkeleton />}>` so the rest of the page renders immediately.

```tsx
// ✅ Stream slow sections independently
<Suspense fallback={<DatabaseTableSkeleton />}>
  <DatabaseTable pageId={pageId} />
</Suspense>

// ❌ Block the whole page on the slowest query
const [pageData, databaseRows] = await Promise.all([...])
```

**Client component data fetching during navigation:** When a `"use client"` component needs data on mount, use SWR or React Query with a pre-fetched initial value passed from the server — never a bare `useEffect` fetch that causes a waterfall.

### When to use a modal vs. a new page

**Use a modal / sheet / popover for:**
- Confirmation dialogs (delete forever, leave workspace)
- Quick inline edits (rename, change icon, set due date)
- Contextual pickers (color picker, emoji picker, date picker, member selector)
- Short forms with ≤ 3 fields that don't navigate away
- Notification panel, command palette, search overlay

**Navigate to a new page for:**
- Settings (account, workspace, billing) — any form with > 3 fields
- Detailed views of entities (page editor, database entry, template detail)
- Onboarding flows
- Any workflow where the user may want to bookmark or share the URL

**Never use a modal for:**
- Displaying a full page of content
- Multi-step wizards longer than 2 steps
- Any action that creates a significant artifact (new workspace, template apply → goes to the new page)
- Error states that require reading long text

---

## Bug Fix Documentation

Whenever a reported bug is diagnosed and fixed, record it as a matched pair of docs under `doc/bugs/` (create the folder if it doesn't exist yet):

- **`doc/bugs/{YYYY-MM-DD}-bug-{slug}.md`** — written once the bug is understood. Contents: what's broken (from the user's perspective), how to reproduce it, and the root cause.
- **`doc/bugs/{YYYY-MM-DD}-solution-{slug}.md`** — written once the fix lands. Contents: what changed, which file(s), and why that fixes the root cause — not just the symptom.

`{slug}` is a short kebab-case description of the issue (e.g. `sidebar-favorite-toggle-race`), reused **identically** across both files in the pair so they sit next to each other alphabetically and are easy to match up. `{YYYY-MM-DD}` is the date the bug was fixed, not when it was reported.

This applies to real functional/logic bugs — not routine styling tweaks, copy changes, or net-new features with no prior broken behavior.

---

## Hard Rules

These are derived from architecture decisions that are hard to change after data exists. Follow them from the first commit.

1. **Keep docs current.** When you add a feature, change architecture, add a rule, or alter the schema, update this file AND the relevant detailed doc (`docs/architecture/`, `DATABASE-PLAN.md`, or `Features/*.md`).
2. **Never do slow/IO/scheduled work inline in a Next.js route** — enqueue a pg-boss job and handle it in the worker. The only real-time exception is the SSE notification stream.
3. **Always resolve permissions through the shared resolver at the SQL level.** Use `requireSession` / `requireWorkspaceMember` / `requirePagePermission`. Never filter restricted rows in application code after a broad fetch.
4. **Page hierarchy is a closure table.** Maintain `page_closure` in the same transaction as any `parent_id` change. All mutations go through `lib/pages/closure.ts` — never update `parent_id` directly.
5. **Block content is JSONB with an explicit `schema_version`.** Never change a block's content shape without bumping its version and providing a migration path.
6. **Search index is maintained by PostgreSQL triggers** on block/property/comment changes — not just title changes. Bulk operations must batch writes.
7. **No raw SQL** except FTS triggers, closure-table maintenance, DDL, or operations with no Drizzle equivalent.
8. **Schema changes go through `pnpm db:generate`** — never hand-write migration files. Edit `lib/db/schema/*.ts` → generate → review → commit → migrate.
9. **All env vars validated with Zod in `lib/env.ts`** — never read `process.env` directly elsewhere.
10. **All background job handlers must be idempotent** (pg-boss is at-least-once). Cron jobs use `policy: "exclusive"`.
11. **Notifications are transactional** — only enqueue inside the same transaction that saved the triggering event. A user never receives a notification for their own action.
12. **Extend the registries, don't scatter switches** — Block, Property, Notification, Job. One registry entry per new type, not edits across ten files.
13. **File uploads use pre-signed direct-to-S3 PUT URLs.** Validate type + size server-side before issuing the URL; never proxy bytes through the app server.
14. **The database "Title" property is virtual** — lives in `pages.title`, always column 1, never deletable, never written to `property_values`.
15. **Soft delete via `is_deleted` + `deleted_at`** (30-day Trash). Hard deletion only through `auto-delete-expired-trash` job.
16. **Magic-link tokens are short-lived and single-use** — deleted on use by Better Auth's token lifecycle.
17. **Every Orbit (platform-admin) mutation writes to `platform_audit_log`** — append-only, with actor, action, target, and metadata.
18. **All forms validate with Zod**; show errors inline, never via toast for validation. Disable submit until valid (and dirty, for edit forms).
19. **No shadows anywhere in the app.** (See UI Rule 2.) Removing a shadow utility is always correct.
20. **No hardcoded colors, radii, or font families in component code.** (See UI Rules 1 & 4.) Always use CSS variables or Tailwind semantic classes.
21. **Every UI element must be logical and self-explanatory.** A first-time user must understand what any button, label, or section does without reading docs. (See UI Rule 10.)
22. **UI-only tasks must never touch functionality.** When a task is scoped to UI changes (styling, layout, spacing, colors, typography, animations, component structure), do NOT alter: API calls, fetch logic, state management, business logic, data transformations, backend handlers, database queries, permission checks, or job enqueueing. If a UI change seems to require a logic change, stop and ask. The rule is: **change only what is visible — never what executes.**
23. **Delete confirmation is mandatory everywhere.** Every delete action must route through an `<AlertDialog>` before executing. (See UI Rule 8.) Never bypass with a direct onClick handler on a destructive operation.
24. **Modal close icon is always top-right.** No exceptions. (See UI Rule 9.)
25. **`use client` boundary must be as deep as possible.** Page and layout components are Server Components by default. Only extract a `"use client"` wrapper for the interactive leaf. (See UI Rule 11.)
26. **All images use `next/image` `<Image>`.** Never use a raw `<img>` tag. (See UI Rule 13.)
27. **Icons from `lucide-react` only.** No other icon library. Icon-only buttons require `aria-label`. (See UI Rule 14.)
28. **Every empty state shows a message and a CTA.** A blank area is never acceptable. (See UI Rule 15.)
29. **Every API error must surface a recovery UI.** Never swallow errors silently — always show the user what went wrong and how to recover. (See UI Rule 16.)
30. **Every mutation button shows a spinner and is disabled while in flight.** Double-submit is never possible. (See UI Rule 18.)
31. **Page navigation is a hard cut — no transition animation.** Sidebar and topbar never re-render during navigation. Only the innermost content area swaps. (See Navigation section.)
32. **Hover = `bg-accent`, transition = `duration-150`.** Every interactive element must have a consistent hover state and a `transition-colors duration-150` paired with it. No arbitrary hover colors, no slow transitions. (See UI Rule 21.)
33. **Tooltips via shadcn `<Tooltip>` only, `delayDuration={400}`.** No custom tooltip implementations. (See UI Rule 22.)
34. **All single-line text contexts must truncate — never wrap.** Use `truncate` + `min-w-0` on the flex parent. (See UI Rule 23.)
35. **Contextual menus follow the fixed item order** — primary → edit → move → divider → destructive. Destructive items always `text-destructive` at the bottom. (See UI Rule 24.)
36. **Timestamps render in browser local timezone** — relative for < 7 days, absolute for ≥ 7 days. Never show raw ISO strings. (See UI Rule 25.)
37. **Avatars are always `rounded-full`, sized from the defined scale only.** Fallback initials derived deterministically from name. (See UI Rule 26.)
38. **Drag handles are `<GripVertical>`, hover-only visible.** Drop indicator is a thin `bg-primary h-0.5` line — no zone highlighting. (See UI Rule 27.)
39. **Breadcrumb is present on all page views.** Current segment non-clickable. Collapse > 4 segments to `…`. (See UI Rule 28.)
40. **Every diagnosed bug gets a matched `doc/bugs/{date}-bug-{slug}.md` + `{date}-solution-{slug}.md` pair.** Write the bug doc once the root cause is understood; write the solution doc once the fix lands. (See Bug Fix Documentation.)

---

> **When you introduce a new subsystem, rule, or invariant, add it here and to its detailed doc.** This file is the map; the territory is in [docs/](docs/).
