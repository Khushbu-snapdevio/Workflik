# Pagevo — Database Schema (Drizzle ORM)

Every table required across the whole project, as Drizzle models. Built from [README.md](README.md) and all the [Features/](Features/) specs.

The schema is **split one file per domain** under `lib/db/schema/` (not a single `schema.ts`) — shared enums and helpers live in `lib/db/schema/types.ts`, and `lib/db/schema/index.ts` re-exports every file so the rest of the app imports from one place. See [Schema file layout](#schema-file-layout) for the full mapping. Each `##` section below corresponds to one file.

## Tables at a glance

| Domain | Tables |
|--------|--------|
| Auth (Better Auth) | `users`, `sessions`, `accounts`, `verifications` |
| Workspace | `workspaces`, `workspace_members`, `workspace_slug_redirects` |
| Pages & content | `pages`, `page_closure`, `page_versions`, `blocks` |
| Databases | `database_views`, `database_properties`, `property_values` |
| Sharing | `page_permissions`, `public_links`, `guest_invitations` |
| Collaboration | `comments`, `notifications`, `notification_preferences`, `email_outbox` |
| Search | `search_index` |
| Templates | `templates` |
| Files | `file_uploads`, `workspace_storage_usage` |
| Per-user state | `user_preferences`, `user_hint_states`, `user_favorites`, `user_recently_visited` |
| Platform admin | `platform_audit_log` |

## Key notes

- **Single-table page inheritance:** databases and database entries are rows in `pages`, discriminated by `pages.kind` (`page` / `database` / `entry`). Entries point to their database via `database_id`; databases point to their default view via `default_view_id`. This gives databases/entries every page feature (icon, cover, blocks, comments, versions, permissions, trash) for free.
- **Closure table** (`page_closure`) backs the page hierarchy so "all descendants" is one query (for permissions, search scope, bulk ops). `pages.parent_id` keeps the immediate parent.
- **Block content is `jsonb` with `schema_version`** so block shapes can be migrated later.
- **`updated_at` is refreshed on UPDATE, not just INSERT.** Every `updated_at` column uses the `updatedAt()` helper (`.defaultNow().$onUpdate(...)`) — a plain `.defaultNow()` only stamps on insert, which would leave "Last Edited Time", edited-recency search ranking, and version pruning stale. Equivalent enforcement: a `BEFORE UPDATE` trigger per table.
- **The database "Title" property is virtual — not a `database_properties` row.** Each entry's title lives in `pages.title` (entries are pages). Title is synthesized as a read-only property always rendered at column position 1: it cannot be deleted or reordered, does **not** count toward the 50-property limit, and is **never** written to `property_values`. Filters and sorts on Title resolve directly against `pages.title` (search weight A). Only user-created properties live in `database_properties` / `property_values`.
- **Inherited permissions are never stored** — resolved at runtime by walking `parent_id` up to the first explicit `page_permissions` row, then `workspaces.default_page_access`. **A private page (`is_private = true`) short-circuits this:** only the creator and explicit `page_permissions` grants apply — inheritance and the workspace default are skipped, and workspace Admins are denied too.
- **Search** is Postgres FTS: `search_index.search_vector` (`tsvector`, GIN index) kept current by triggers on blocks/property values/comments.
- **Deferred FK:** `pages.default_view_id → database_views.id` and `database_views.database_id → pages.id` are circular — add the `default_view_id` constraint in a follow-up migration `ALTER TABLE`.
- **Page tree order:** `pages.order_index` holds sibling order within a parent (sidebar drag-and-drop, "new pages at the bottom"). The page tree is read as `(parent_id, order_index)`.
- **Database property visibility:** ordering is shared across all views (`database_properties.order_index`), but show/hide is **per-view** (`database_views.hidden_property_ids`). `database_properties.is_hidden` is only the default at creation.
- **Soft delete:** pages use `is_deleted` + `deleted_at` (30-day Trash); comments use `deleted_at` (placeholder). Author/creator FKs are `ON DELETE SET NULL` → renders as "Former Member".
- **pg-boss** owns its own tables (job queue) — not defined here.
- **`uuid().defaultRandom()`** maps to Postgres `gen_random_uuid()` (built in since PG13 — no extension needed). The `tsvector` GIN index is emitted by `pnpm db:generate`; the FTS **triggers** that populate `search_vector` are hand-written SQL added to the generated migration.

---

## Schema file layout

The schema lives in `lib/db/schema/` — one file per domain. A single 800-line `schema.ts` is hard to navigate and review; splitting by domain keeps each file small and makes diffs readable.

| File | Tables / contents |
|------|-------------------|
| `lib/db/schema/types.ts` | Shared `customType` (`tsvector`), the `updatedAt()` helper, and **every `pgEnum`** — imported by the domain files below |
| `lib/db/schema/auth.ts` | `users`, `sessions`, `accounts`, `verifications` |
| `lib/db/schema/workspace.ts` | `workspaces`, `workspace_members`, `workspace_slug_redirects` |
| `lib/db/schema/pages.ts` | `pages`, `page_closure`, `page_versions`, `blocks` |
| `lib/db/schema/databases.ts` | `database_views`, `database_properties`, `property_values` |
| `lib/db/schema/sharing.ts` | `page_permissions`, `public_links`, `guest_invitations` |
| `lib/db/schema/collaboration.ts` | `comments`, `notifications`, `notification_preferences`, `email_outbox` |
| `lib/db/schema/search.ts` | `search_index` |
| `lib/db/schema/templates.ts` | `templates` |
| `lib/db/schema/files.ts` | `file_uploads`, `workspace_storage_usage` |
| `lib/db/schema/user-state.ts` | `user_preferences`, `user_hint_states`, `user_favorites`, `user_recently_visited` |
| `lib/db/schema/platform.ts` | `platform_audit_log` |
| `lib/db/schema/index.ts` | **Barrel** — `export * from "./auth"`, `"./workspace"`, … for every file above |

**Conventions:**
- Each domain file imports shared pieces from `./types` (`import { pageKind, updatedAt, tsvector, fileUploadKind } from "./types"`) and table refs it needs cross-domain (e.g. `pages.ts` imports `workspaces` from `./workspace`).
- **Drizzle relations co-locate with their tables** — each file declares its own `relations(...)` block. The [Relations](#relations-core-graph) section below shows them together only for readability.
- The app and `drizzle.config.ts` point at the **directory / barrel**, never a single file: `import * as schema from "@/lib/db/schema"`.
- `drizzle-kit` is configured with `schema: "./lib/db/schema"` so it picks up every file in the folder.

---

## Imports, custom types, enums — `lib/db/schema/types.ts`

```ts
// lib/db/schema/types.ts  —  shared by every domain file (imported via `./types`)
import {
  pgTable, pgEnum, uuid, text, varchar, boolean, integer, bigint,
  real, timestamp, jsonb, primaryKey, uniqueIndex, index, customType,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Postgres full-text search vector (GIN-indexed)
export const tsvector = customType<{ data: string }>({
  dataType() { return "tsvector"; },
});

// Convention: EVERY `updated_at` column uses this helper so the timestamp is
// refreshed on UPDATE, not just INSERT. `defaultNow()` alone fires only on
// insert — without `$onUpdate`, "Last Edited Time", edited-recency search
// ranking, and version logic silently go stale. Use `updatedAt()` everywhere
// a table has an `updated_at` column. (A BEFORE UPDATE trigger is the
// equivalent if you prefer enforcing it in the DB instead of the ORM.)
export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());

export const workspaceRole     = pgEnum("workspace_role", ["admin", "editor", "viewer"]);
export const memberStatus      = pgEnum("member_status", ["active", "invited", "expired"]);
export const defaultPageAccess = pgEnum("default_page_access", ["private", "shared"]);

export const pageKind   = pgEnum("page_kind", ["page", "database", "entry"]);
export const fontFamily = pgEnum("font_family", ["default", "serif", "mono"]);

export const blockType = pgEnum("block_type", [
  "paragraph", "h1", "h2", "h3", "bullet", "numbered", "toggle", "quote",
  "callout", "divider", "todo", "image", "video", "audio", "file",
  "toc", "table", "columns", "code", "equation", "linked_page",
  "database", "template_button",
]);

export const viewType        = pgEnum("view_type", ["table", "board", "calendar", "gallery"]);
export const galleryCardSize = pgEnum("gallery_card_size", ["small", "medium", "large"]);
export const entryOpenMode   = pgEnum("entry_open_mode", ["side_panel", "full_page"]);

export const propertyType = pgEnum("property_type", [
  "text", "number", "select", "multi_select", "date",
  "checkbox", "url", "email", "phone", "person", "relation",
]);

export const accessLevel       = pgEnum("access_level", ["full_access", "can_edit", "can_comment", "can_view"]);
export const publicAccessLevel = pgEnum("public_access_level", ["can_view", "can_comment"]);
export const guestAccessLevel  = pgEnum("guest_access_level", ["can_view", "can_comment", "can_edit"]);

export const notificationType = pgEnum("notification_type", [
  "mention", "comment", "reply", "resolved", "reopened",
  "access_granted", "workspace_invite", "guest_accepted", "trash_warning",
]);
export const emailFrequency    = pgEnum("email_frequency", ["realtime", "daily", "weekly", "off"]);
export const emailOutboxStatus = pgEnum("email_outbox_status", ["queued", "sending", "sent", "failed"]);
export const emailOutboxType   = pgEnum("email_outbox_type", ["notification_email", "digest_email"]);

export const templateStatus   = pgEnum("template_status", ["draft", "published"]);

// "page" = ordinary page; "entry" = database entry (its title + text property values are indexed together);
// "comment" = a comment thread root. Property values are NOT a separate source_type — they are
// aggregated into the "entry" row's search_vector by the property_values trigger.
export const searchSourceType = pgEnum("search_source_type", ["page", "entry", "comment"]);
export const auditTargetType  = pgEnum("audit_target_type", ["user", "workspace"]);

export const fileUploadKind = pgEnum("file_upload_kind", [
  "page_cover", "page_icon", "block_media", "user_avatar", "workspace_icon",
]);
```

## Auth (Better Auth: magic link + admin plugin) — `lib/db/schema/auth.ts`

```ts
export const users = pgTable("users", {
  id:             uuid("id").primaryKey().defaultRandom(),
  name:           text("name"),
  email:          text("email").notNull().unique(),
  emailVerified:  boolean("email_verified").notNull().default(false),
  image:          text("image"),
  jobTitle:       text("job_title"),       // optional "Role / Title" from onboarding
  timezone:       text("timezone"),        // IANA tz for digest delivery

  isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
  banned:          boolean("banned").notNull().default(false),
  bannedReason:    text("banned_reason"),
  banExpires:      timestamp("ban_expires", { withTimezone: true }),

  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  onboardingStep:      integer("onboarding_step").notNull().default(0),  // 0–4
  tourCompleted:       boolean("tour_completed").notNull().default(false),

  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    updatedAt(),
});

export const sessions = pgTable("sessions", {
  id:             uuid("id").primaryKey().defaultRandom(),
  userId:         uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token:          text("token").notNull().unique(),          // hashed
  expiresAt:      timestamp("expires_at", { withTimezone: true }).notNull(),  // 7-day sliding
  ipAddress:      text("ip_address"),
  userAgent:      text("user_agent"),
  impersonatedBy: uuid("impersonated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      updatedAt(),
}, (t) => ({
  userIdx: index("sessions_user_idx").on(t.userId),
}));

// Better Auth core table — unused for credentials in MVP (passwordless), kept for Phase-4 SSO/SAML.
export const accounts = pgTable("accounts", {
  id:           uuid("id").primaryKey().defaultRandom(),
  userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId:    text("account_id").notNull(),
  providerId:   text("provider_id").notNull(),
  accessToken:  text("access_token"),
  refreshToken: text("refresh_token"),
  idToken:      text("id_token"),
  expiresAt:    timestamp("expires_at", { withTimezone: true }),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    updatedAt(),
}, (t) => ({
  userIdx: index("accounts_user_idx").on(t.userId),
}));

// Magic-link tokens — single-use, 15-min TTL
export const verifications = pgTable("verifications", {
  id:         uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),   // email
  value:      text("value").notNull(),        // hashed token
  expiresAt:  timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  updatedAt(),
}, (t) => ({
  identifierIdx: index("verifications_identifier_idx").on(t.identifier),
}));
```

## Workspace — `lib/db/schema/workspace.ts`

```ts
export const workspaces = pgTable("workspaces", {
  id:        uuid("id").primaryKey().defaultRandom(),
  name:      text("name").notNull(),
  slug:      text("slug").notNull().unique(),
  icon:      text("icon"),
  defaultPageAccess: defaultPageAccess("default_page_access").notNull().default("shared"),

  inviteLinkToken:  text("invite_link_token").unique(),
  inviteLinkActive: boolean("invite_link_active").notNull().default(false),
  inviteLinkRole:   workspaceRole("invite_link_role").notNull().default("editor"),

  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: updatedAt(),
});

// Stores old slugs after a workspace slug change — serves 308 redirects for 30 days.
// On slug change: INSERT a row here with the old slug, then update workspaces.slug.
// The Next.js middleware (or a catch-all route) looks up old_slug → current workspace slug
// and issues a 308. Rows older than 30 days are swept by the delete-workspace job and can
// also be cleaned up manually; after 30 days the old URL returns 404.
export const workspaceSlugRedirects = pgTable("workspace_slug_redirects", {
  id:          uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  oldSlug:     text("old_slug").notNull(),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  oldSlugIdx: uniqueIndex("workspace_slug_redirects_old_slug_idx").on(t.oldSlug),
}));

// userId is null for pending email invites (account is created on first magic-link sign-in)
export const workspaceMembers = pgTable("workspace_members", {
  id:           uuid("id").primaryKey().defaultRandom(),
  workspaceId:  uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId:       uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  role:         workspaceRole("role").notNull().default("editor"),
  status:       memberStatus("status").notNull().default("invited"),

  invitedEmail:  text("invited_email"),
  inviteToken:   text("invite_token").unique(),
  inviteExpires: timestamp("invite_expires", { withTimezone: true }),  // 7 days

  invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
  joinedAt:  timestamp("joined_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqUserWorkspace: uniqueIndex("wm_user_workspace_idx").on(t.workspaceId, t.userId),
  workspaceIdx:      index("wm_workspace_idx").on(t.workspaceId),
}));
```

## Pages & content — `lib/db/schema/pages.ts`

```ts
// Universal container: ordinary pages, databases, and database entries (kind discriminates)
export const pages = pgTable("pages", {
  id:          uuid("id").primaryKey().defaultRandom(),
  shortId:     varchar("short_id", { length: 12 }).notNull().unique(),  // 7-char nanoid in URLs
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  parentId:    uuid("parent_id").references((): AnyPgColumn => pages.id, { onDelete: "cascade" }),

  kind:          pageKind("kind").notNull().default("page"),
  databaseId:    uuid("database_id").references((): AnyPgColumn => pages.id, { onDelete: "cascade" }), // when kind=entry
  defaultViewId: uuid("default_view_id"),  // when kind=database → database_views.id (deferred FK)

  orderIndex:    integer("order_index").notNull().default(0),  // sibling order in the page tree (drag-and-drop)

  title:         text("title").notNull().default("Untitled"),
  icon:          text("icon"),
  coverUrl:      text("cover_url"),
  coverPosition: real("cover_position").notNull().default(0.5),
  isFullWidth:   boolean("is_full_width").notNull().default(false),
  fontFamily:    fontFamily("font_family").notNull().default("default"),
  isSmallText:   boolean("is_small_text").notNull().default(false),

  isLocked:  boolean("is_locked").notNull().default(false),
  isPrivate: boolean("is_private").notNull().default(false),

  isDeleted:        boolean("is_deleted").notNull().default(false),
  deletedAt:        timestamp("deleted_at", { withTimezone: true }),
  deletedBy:        uuid("deleted_by").references(() => users.id, { onDelete: "set null" }),
  trashWarningSent: boolean("trash_warning_sent").notNull().default(false),

  createdBy:    uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  lastEditedBy: uuid("last_edited_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    updatedAt(),
}, (t) => ({
  shortIdIdx:   uniqueIndex("pages_short_id_idx").on(t.shortId),
  workspaceIdx: index("pages_workspace_idx").on(t.workspaceId),
  parentIdx:    index("pages_parent_order_idx").on(t.parentId, t.orderIndex),
  databaseIdx:  index("pages_database_idx").on(t.databaseId),
  liveTreeIdx:  index("pages_live_tree_idx").on(t.workspaceId, t.isDeleted),
}));

// Closure table — one row per (ancestor, descendant), incl. self at depth 0
export const pageClosure = pgTable("page_closure", {
  ancestorId:   uuid("ancestor_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  descendantId: uuid("descendant_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  depth:        integer("depth").notNull(),
}, (t) => ({
  pk:            primaryKey({ columns: [t.ancestorId, t.descendantId] }),
  descendantIdx: index("page_closure_descendant_idx").on(t.descendantId),
}));

// Version snapshots — auto-saved, 7-day retention
export const pageVersions = pgTable("page_versions", {
  id:              uuid("id").primaryKey().defaultRandom(),
  pageId:          uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  contentSnapshot: jsonb("content_snapshot").notNull(),
  schemaVersion:   integer("schema_version").notNull().default(1),
  label:           text("label"),
  createdBy:       uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pageIdx: index("page_versions_page_idx").on(t.pageId, t.createdAt),
}));

// Every piece of page content; content = jsonb + schema_version
export const blocks = pgTable("blocks", {
  id:            uuid("id").primaryKey().defaultRandom(),
  pageId:        uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  parentBlockId: uuid("parent_block_id").references((): AnyPgColumn => blocks.id, { onDelete: "cascade" }),
  type:          blockType("type").notNull(),
  content:       jsonb("content").notNull(),
  schemaVersion: integer("schema_version").notNull().default(1),
  orderIndex:    integer("order_index").notNull(),
  createdBy:     uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     updatedAt(),
}, (t) => ({
  pageOrderIdx: index("blocks_page_order_idx").on(t.pageId, t.orderIndex),
  parentIdx:    index("blocks_parent_idx").on(t.parentBlockId),
}));
```

## Databases (views, properties, values) — `lib/db/schema/databases.ts`

```ts
export const databaseViews = pgTable("database_views", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  databaseId:         uuid("database_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  name:               text("name").notNull(),
  type:               viewType("type").notNull(),
  groupByPropertyId:  uuid("group_by_property_id").references((): AnyPgColumn => databaseProperties.id, { onDelete: "set null" }),
  calendarPropertyId: uuid("calendar_property_id").references((): AnyPgColumn => databaseProperties.id, { onDelete: "set null" }),
  filters:            jsonb("filters").notNull().default(sql`'[]'::jsonb`),
  sorts:              jsonb("sorts").notNull().default(sql`'[]'::jsonb`),    // max 5
  cardDisplayProps:   jsonb("card_display_props").notNull().default(sql`'[]'::jsonb`),
  hiddenPropertyIds:  jsonb("hidden_property_ids").notNull().default(sql`'[]'::jsonb`), // per-view visibility (rules 9–10)
  galleryCardSize:    galleryCardSize("gallery_card_size"),
  entryOpenMode:      entryOpenMode("entry_open_mode").notNull().default("side_panel"),
  orderIndex:         integer("order_index").notNull().default(0),
  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:          updatedAt(),
}, (t) => ({
  databaseIdx: index("database_views_database_idx").on(t.databaseId),
}));

// Typed columns; max 50 user-created per db (system + back-relation excluded — enforce in app)
export const databaseProperties = pgTable("database_properties", {
  id:             uuid("id").primaryKey().defaultRandom(),
  databaseId:     uuid("database_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  name:           text("name").notNull(),
  type:           propertyType("type").notNull(),
  config:         jsonb("config").notNull().default(sql`'{}'::jsonb`),  // format / options / target db / etc.
  defaultValue:   jsonb("default_value"),
  isHidden:       boolean("is_hidden").notNull().default(false),  // default visibility; per-view override → database_views.hiddenPropertyIds
  isSystem:       boolean("is_system").notNull().default(false),
  isBackRelation: boolean("is_back_relation").notNull().default(false),
  orderIndex:     integer("order_index").notNull().default(0),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      updatedAt(),
}, (t) => ({
  databaseIdx: index("database_properties_database_idx").on(t.databaseId),
}));

// One value per (entry, property); entry_id = a page with kind='entry'
export const propertyValues = pgTable("property_values", {
  id:         uuid("id").primaryKey().defaultRandom(),
  entryId:    uuid("entry_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").notNull().references(() => databaseProperties.id, { onDelete: "cascade" }),
  value:      jsonb("value"),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  updatedAt(),
}, (t) => ({
  uniqEntryProp: uniqueIndex("property_values_entry_prop_idx").on(t.entryId, t.propertyId),
  propertyIdx:   index("property_values_property_idx").on(t.propertyId),
  // Filter/sort read path: a value is fetched per (entry, property), so the
  // unique index above already serves point lookups. For filtering a whole
  // database by one property's value (e.g. Status = "Done"), query is
  // property_id = ? AND value @> ? — covered by propertyIdx + this GIN index
  // on the jsonb. MVP scale (small teams) is fine on this; if a specific
  // property type needs range/sort speed at scale, add an expression index
  // (e.g. ((value->>'number')::numeric)) for that property — a clean, additive
  // upgrade that needs no data migration.
  valueGin:      index("property_values_value_gin_idx").using("gin", t.value),
}));
```

## Sharing & permissions — `lib/db/schema/sharing.ts`

```ts
export const pagePermissions = pgTable("page_permissions", {
  id:          uuid("id").primaryKey().defaultRandom(),
  pageId:      uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  userId:      uuid("user_id").references(() => users.id, { onDelete: "cascade" }),  // null if guest-by-email
  guestEmail:  text("guest_email"),
  accessLevel: accessLevel("access_level").notNull(),
  grantedBy:   uuid("granted_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   updatedAt(),
}, (t) => ({
  pageIdx:       index("page_permissions_page_idx").on(t.pageId),
  uniqPageUser:  uniqueIndex("page_permissions_page_user_idx").on(t.pageId, t.userId),
  uniqPageGuest: uniqueIndex("page_permissions_page_guest_idx").on(t.pageId, t.guestEmail),
}));

export const publicLinks = pgTable("public_links", {
  id:          uuid("id").primaryKey().defaultRandom(),
  pageId:      uuid("page_id").notNull().unique().references(() => pages.id, { onDelete: "cascade" }),
  token:       text("token").notNull().unique(),
  accessLevel: publicAccessLevel("access_level").notNull().default("can_view"),
  isActive:    boolean("is_active").notNull().default(false),
  createdBy:   uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   updatedAt(),
});

export const guestInvitations = pgTable("guest_invitations", {
  id:          uuid("id").primaryKey().defaultRandom(),
  pageId:      uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  email:       text("email").notNull(),
  accessLevel: guestAccessLevel("access_level").notNull(),
  token:       text("token").notNull().unique(),
  expiresAt:   timestamp("expires_at", { withTimezone: true }).notNull(),  // 7 days
  acceptedAt:  timestamp("accepted_at", { withTimezone: true }),
  invitedBy:   uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pageIdx:  index("guest_invitations_page_idx").on(t.pageId),
  tokenIdx: uniqueIndex("guest_invitations_token_idx").on(t.token),
}));
```

## Collaboration — `lib/db/schema/collaboration.ts`

```ts
// Block / text-level / page-level comments; one reply level deep
export const comments = pgTable("comments", {
  id:           uuid("id").primaryKey().defaultRandom(),
  pageId:       uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  blockId:      uuid("block_id").references(() => blocks.id, { onDelete: "set null" }),  // null = page-level
  parentId:     uuid("parent_id").references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
  anchorStart:  integer("anchor_start"),   // text-level offsets
  anchorEnd:    integer("anchor_end"),
  threadNumber: integer("thread_number"),  // per-page reference (#3)
  isResolved:   boolean("is_resolved").notNull().default(false),
  isOrphaned:   boolean("is_orphaned").notNull().default(false),
  authorId:     uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  content:      jsonb("content").notNull(),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  editedAt:     timestamp("edited_at", { withTimezone: true }),
  deletedAt:    timestamp("deleted_at", { withTimezone: true }),  // soft delete → "[Comment deleted]"
}, (t) => ({
  pageIdx:   index("comments_page_idx").on(t.pageId),
  blockIdx:  index("comments_block_idx").on(t.blockId),
  parentIdx: index("comments_parent_idx").on(t.parentId),
}));

// 90-day retention
export const notifications = pgTable("notifications", {
  id:             uuid("id").primaryKey().defaultRandom(),
  workspaceId:    uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  recipientId:    uuid("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  senderId:       uuid("sender_id").references(() => users.id, { onDelete: "set null" }),  // null = system
  type:           notificationType("type").notNull(),
  pageId:         uuid("page_id").references(() => pages.id, { onDelete: "cascade" }),
  sourceId:       uuid("source_id"),
  contentSnippet: text("content_snippet"),
  isRead:         boolean("is_read").notNull().default(false),
  readAt:         timestamp("read_at", { withTimezone: true }),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  recipientIdx:       index("notifications_recipient_idx").on(t.recipientId),
  recipientUnreadIdx: index("notifications_recipient_unread_idx").on(t.recipientId, t.isRead),
  createdIdx:         index("notifications_created_idx").on(t.createdAt),
}));

export const notificationPreferences = pgTable("notification_preferences", {
  id:              uuid("id").primaryKey().defaultRandom(),
  userId:          uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  emailFrequency:  emailFrequency("email_frequency").notNull().default("daily"),
  weeklyDigestDay: integer("weekly_digest_day").notNull().default(1),  // 0=Sun … 6=Sat
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       updatedAt(),
});

// Outbox for idempotent SMTP delivery — state machine: queued → sending → sent (terminal) / failed (terminal)
// The row id is passed as the SMTP Message-ID header so duplicate job runs never double-send.
// A nightly reaper (`cleanup-email-outbox`) sweeps rows stuck in `sending` > 10 min → `failed`
// and purges `sent` rows older than 30 days. Never auto-resend `failed` rows.
export const emailOutbox = pgTable("email_outbox", {
  id:             uuid("id").primaryKey().defaultRandom(),  // used as SMTP Message-ID for dedup
  recipientEmail: text("recipient_email").notNull(),
  subject:        text("subject").notNull(),
  htmlBody:       text("html_body").notNull(),
  type:           emailOutboxType("type").notNull(),
  status:         emailOutboxStatus("status").notNull().default("queued"),
  attemptCount:   integer("attempt_count").notNull().default(0),
  lastError:      text("last_error"),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      updatedAt(),
}, (t) => ({
  statusIdx: index("email_outbox_status_idx").on(t.status),
}));
```

## Search — `lib/db/schema/search.ts`

```ts
export const searchIndex = pgTable("search_index", {
  id:           uuid("id").primaryKey().defaultRandom(),
  workspaceId:  uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  sourceType:   searchSourceType("source_type").notNull(),
  sourceId:     uuid("source_id").notNull(),
  title:        text("title"),
  searchVector: tsvector("search_vector"),  // weighted A/B/C/D
  pageId:       uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),  // permission scoping
  updatedAt:    updatedAt(),
}, (t) => ({
  uniqSource:   uniqueIndex("search_index_source_idx").on(t.sourceType, t.sourceId),
  workspaceIdx: index("search_index_workspace_idx").on(t.workspaceId),
  vectorIdx:    index("search_index_vector_idx").using("gin", t.searchVector),
}));
```

## Templates, files, per-user state, platform admin

> These four domains are small, so each gets its own file: `templates.ts`, `files.ts`, `user-state.ts`, `platform.ts`. They're shown together here for brevity; the `// lib/db/schema/…` comments mark where one file ends and the next begins.

```ts
// lib/db/schema/templates.ts
// Categories are a managed table (not a fixed enum) so Orbit Admin can add
// new ones without a schema migration.
export const templateCategories = pgTable("template_categories", {
  id:         uuid("id").primaryKey().defaultRandom(),
  key:        text("key").notNull().unique(),
  label:      text("label").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Built-in (workspace_id NULL) + custom (workspace-scoped)
export const templates = pgTable("templates", {
  id:           uuid("id").primaryKey().defaultRandom(),
  workspaceId:  uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  name:         text("name").notNull(),
  description:  text("description"),
  categoryId:   uuid("category_id").notNull().references(() => templateCategories.id),
  isBuiltIn:    boolean("is_built_in").notNull().default(false),
  status:       templateStatus("status").notNull().default("published"),
  createdBy:    uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  pageSnapshot: jsonb("page_snapshot").notNull(),  // blocks + structure, no entries
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    updatedAt(),
}, (t) => ({
  workspaceIdx: index("templates_workspace_idx").on(t.workspaceId),
  categoryIdx:  index("templates_category_idx").on(t.categoryId),
}));

// lib/db/schema/files.ts
// (fileUploadKind enum is defined in types.ts — import it from there)
export const fileUploads = pgTable("file_uploads", {
  id:            uuid("id").primaryKey().defaultRandom(),
  // null for user_avatar — an avatar is global to the user, not workspace-scoped,
  // and does NOT count toward any workspace's 5 GB quota. All other kinds are
  // workspace-scoped and counted.
  workspaceId:   uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  kind:          fileUploadKind("kind").notNull(),
  pageId:        uuid("page_id").references(() => pages.id, { onDelete: "set null" }),
  blockId:       uuid("block_id").references(() => blocks.id, { onDelete: "set null" }),
  objectKey:     text("object_key").notNull().unique(),  // {workspaceId|"users"}/{pageId|userId}/{uuid}.{ext}
  fileUrl:       text("file_url").notNull(),             // CDN URL
  mimeType:      text("mime_type").notNull(),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
  uploadedBy:    uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  confirmedAt:   timestamp("confirmed_at", { withTimezone: true }),  // null until /confirm
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx:        index("file_uploads_workspace_idx").on(t.workspaceId),
  objectKeyIdx:        uniqueIndex("file_uploads_object_key_idx").on(t.objectKey),
  confirmedIdx:        index("file_uploads_confirmed_idx").on(t.confirmedAt),
  // Enforce the quota-exemption invariant: user_avatar MUST have workspace_id = NULL.
  // All other kinds MUST have workspace_id set (not NULL).
  avatarWorkspaceChk: check("file_uploads_avatar_workspace_chk",
    sql`(kind = 'user_avatar' AND workspace_id IS NULL) OR (kind != 'user_avatar' AND workspace_id IS NOT NULL)`
  ),
}));

// 1:1 with workspace — 5 GB quota. Row is inserted (bytes_used = 0) in the same
// transaction as workspace creation — never missing when an upload quota check runs.
export const workspaceStorageUsage = pgTable("workspace_storage_usage", {
  workspaceId:           uuid("workspace_id").primaryKey().references(() => workspaces.id, { onDelete: "cascade" }),
  bytesUsed:             bigint("bytes_used", { mode: "number" }).notNull().default(0),
  thresholdNotifiedAt:   timestamp("threshold_notified_at", { withTimezone: true }),  // null = not yet notified; set when 90% email is sent; clear when usage drops below 90%
  createdAt:             timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:             updatedAt(),
});

// lib/db/schema/user-state.ts
export const userPreferences = pgTable("user_preferences", {
  id:               uuid("id").primaryKey().defaultRandom(),
  userId:           uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  lastWorkspaceId:  uuid("last_workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
  sidebarWidth:     integer("sidebar_width").notNull().default(240),  // 200–480
  sidebarCollapsed: boolean("sidebar_collapsed").notNull().default(false),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        updatedAt(),
});

export const userHintStates = pgTable("user_hint_states", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  hintKey:     text("hint_key").notNull(),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqUserHint: uniqueIndex("user_hint_states_user_hint_idx").on(t.userId, t.hintKey),
  userIdx:      index("user_hint_states_user_idx").on(t.userId),
}));

export const userFavorites = pgTable("user_favorites", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pageId:      uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  orderIndex:  integer("order_index").notNull().default(0),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqUserPage:     uniqueIndex("user_favorites_user_page_idx").on(t.userId, t.pageId),
  userWorkspaceIdx: index("user_favorites_user_workspace_idx").on(t.userId, t.workspaceId),
}));

// Upsert on revisit; app keeps only latest 10 per (user, workspace)
export const userRecentlyVisited = pgTable("user_recently_visited", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  pageId:      uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  visitedAt:   timestamp("visited_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqUserPage: uniqueIndex("urv_user_page_idx").on(t.userId, t.pageId),
  recentIdx:    index("urv_recent_idx").on(t.userId, t.workspaceId, t.visitedAt),
}));

// Append-only Orbit Admin trail
// lib/db/schema/platform.ts
export const platformAuditLog = pgTable("platform_audit_log", {
  id:         uuid("id").primaryKey().defaultRandom(),
  actorId:    uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action:     text("action").notNull(),  // "user.banned", "session.impersonated", ...
  targetType: auditTargetType("target_type").notNull(),
  targetId:   uuid("target_id"),
  metadata:   jsonb("metadata"),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  actorIdx:   index("platform_audit_log_actor_idx").on(t.actorId),
  createdIdx: index("platform_audit_log_created_idx").on(t.createdAt),
}));
```

## Relations (core graph)

> **In code, each `*Relations` block lives in the same file as its table** (e.g. `usersRelations` in `auth.ts`, `pagesRelations` in `pages.ts`) — Drizzle resolves them through the `index.ts` barrel. They're collected here only to show the full graph in one place.

```ts
// auth.ts
export const usersRelations = relations(users, ({ one, many }) => ({
  sessions:          many(sessions),
  memberships:       many(workspaceMembers),
  notificationPrefs: one(notificationPreferences),
  preferences:       one(userPreferences),
  favorites:         many(userFavorites),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  creator:      one(users, { fields: [workspaces.createdBy], references: [users.id] }),
  members:      many(workspaceMembers),
  pages:        many(pages),
  templates:    many(templates),
  storageUsage: one(workspaceStorageUsage),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, { fields: [workspaceMembers.workspaceId], references: [workspaces.id] }),
  user:      one(users, { fields: [workspaceMembers.userId], references: [users.id] }),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  workspace:      one(workspaces, { fields: [pages.workspaceId], references: [workspaces.id] }),
  parent:         one(pages, { relationName: "page_parent", fields: [pages.parentId], references: [pages.id] }),
  children:       many(pages, { relationName: "page_parent" }),
  database:       one(pages, { relationName: "entry_database", fields: [pages.databaseId], references: [pages.id] }),
  entries:        many(pages, { relationName: "entry_database" }),
  defaultView:    one(databaseViews, { fields: [pages.defaultViewId], references: [databaseViews.id] }),
  creator:        one(users, { fields: [pages.createdBy], references: [users.id] }),
  blocks:         many(blocks),
  versions:       many(pageVersions),
  views:          many(databaseViews),
  properties:     many(databaseProperties),
  propertyValues: many(propertyValues),
  permissions:    many(pagePermissions),
  publicLink:     one(publicLinks),
  comments:       many(comments),
  files:          many(fileUploads),
}));

export const blocksRelations = relations(blocks, ({ one, many }) => ({
  page:        one(pages, { fields: [blocks.pageId], references: [pages.id] }),
  parentBlock: one(blocks, { relationName: "block_parent", fields: [blocks.parentBlockId], references: [blocks.id] }),
  children:    many(blocks, { relationName: "block_parent" }),
  comments:    many(comments),
}));

export const databaseViewsRelations = relations(databaseViews, ({ one }) => ({
  database:         one(pages, { fields: [databaseViews.databaseId], references: [pages.id] }),
  groupByProperty:  one(databaseProperties, { relationName: "view_group", fields: [databaseViews.groupByPropertyId], references: [databaseProperties.id] }),
  calendarProperty: one(databaseProperties, { relationName: "view_calendar", fields: [databaseViews.calendarPropertyId], references: [databaseProperties.id] }),
}));

export const databasePropertiesRelations = relations(databaseProperties, ({ one, many }) => ({
  database: one(pages, { fields: [databaseProperties.databaseId], references: [pages.id] }),
  values:   many(propertyValues),
}));

export const propertyValuesRelations = relations(propertyValues, ({ one }) => ({
  entry:    one(pages, { fields: [propertyValues.entryId], references: [pages.id] }),
  property: one(databaseProperties, { fields: [propertyValues.propertyId], references: [databaseProperties.id] }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  page:    one(pages, { fields: [comments.pageId], references: [pages.id] }),
  block:   one(blocks, { fields: [comments.blockId], references: [blocks.id] }),
  parent:  one(comments, { relationName: "comment_thread", fields: [comments.parentId], references: [comments.id] }),
  replies: many(comments, { relationName: "comment_thread" }),
  author:  one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  workspace: one(workspaces, { fields: [notifications.workspaceId], references: [workspaces.id] }),
  recipient: one(users, { relationName: "notif_recipient", fields: [notifications.recipientId], references: [users.id] }),
  sender:    one(users, { relationName: "notif_sender", fields: [notifications.senderId], references: [users.id] }),
  page:      one(pages, { fields: [notifications.pageId], references: [pages.id] }),
}));
```

## Inferred types — co-located in each domain file

Export row types straight off the tables — use these in queries and service signatures instead of re-declaring shapes:

```ts
export type User              = typeof users.$inferSelect;
export type NewUser           = typeof users.$inferInsert;
export type Workspace         = typeof workspaces.$inferSelect;
export type WorkspaceMember   = typeof workspaceMembers.$inferSelect;
export type Page              = typeof pages.$inferSelect;
export type NewPage           = typeof pages.$inferInsert;
export type Block             = typeof blocks.$inferSelect;
export type DatabaseView      = typeof databaseViews.$inferSelect;
export type DatabaseProperty  = typeof databaseProperties.$inferSelect;
export type PropertyValue     = typeof propertyValues.$inferSelect;
export type PagePermission    = typeof pagePermissions.$inferSelect;
export type Comment           = typeof comments.$inferSelect;
export type Notification      = typeof notifications.$inferSelect;
export type Template          = typeof templates.$inferSelect;
export type FileUpload        = typeof fileUploads.$inferSelect;
// …extend per table as needed
```

---

## Application-layer rules to enforce

Invariants the database **cannot** express as constraints. Enforce each in a service/transaction; they are pulled from the feature specs and are easy to forget once the schema exists.

**Auth & account** ([authentication.md](Features/authentication.md))
- Magic-link tokens are single-use and expire after 15 min; invalidate immediately on use.

- A banned user's sessions are revoked immediately; block re-auth until unbanned.
- A user cannot delete their account while sole `admin` of any workspace — require transfer first.
- Magic-link requests always return the same response whether or not the email exists (no enumeration).

**Workspace** ([workspace.md](Features/workspace.md))
- Exactly **one** `admin` (owner) per workspace at all times.
- `admin` role is assigned only via Transfer Ownership — never the role dropdown; admin can't be removed directly.
- Every user must belong to ≥1 workspace after onboarding (guests excepted).
- Email invites expire after 7 days; invite-link joins default to `editor`.
- **`workspace_storage_usage` row must be inserted (`bytes_used = 0`) in the same transaction as workspace creation.** The quota check before issuing a pre-signed upload URL reads this row — a missing row will cause a crash on the first upload.

**Pages & editor** ([pages.md](Features/pages.md), [editor.md](Features/editor.md))
- Title is never empty — default to `"Untitled"`.
- Delete → soft-delete to Trash; subpages cascade to Trash with the parent; permanent purge after 30 days.
- **Maintain `page_closure`** on every create / move / delete (insert self at depth 0; rebuild descendant rows on move).
- Duplicate copies blocks/subpages/icon/cover but **not** permissions or comments.
- Move inherits the new parent's permissions unless the page already has custom permissions.
- A locked page is read-only for everyone (incl. Admin); only Full Access can lock/unlock.
- Auto-save debounce ~1 s; one `page_versions` snapshot per 10-min window per user.

**Databases & properties** ([databases.md](Features/databases.md), [database-properties.md](Features/database-properties.md))
- A database must keep ≥1 view — the last view cannot be deleted.
- Board view requires a Select property to group by; Calendar requires a Date property.
- Built-in **Title** property is always position 1 and undeletable.
- Max **50 user-created properties** per database (system + back-relation properties excluded).
- Deleting a property deletes all its `property_values`; deleting a Select option clears it from all entries.
- Relation properties are **bidirectional** — writing A→B also writes the back-relation B→A; back-relations are auto-created and read-only. Relation values are stored as a list of entry IDs inside `property_values.value` (jsonb) on **both** sides; the two sides are kept in sync **in the same transaction** as any relation write (add/remove). Canonical pattern (pseudo-SQL for an "add B to A's relation" write — both sides in one transaction):
  ```sql
  BEGIN;
  -- 1. Upsert A's relation value: append B's id to the jsonb array
  INSERT INTO property_values (entry_id, property_id, value)
    VALUES (:entryA, :forwardPropId, jsonb_build_array(:entryB))
    ON CONFLICT (entry_id, property_id) DO UPDATE
      SET value = property_values.value || to_jsonb(:entryB::text);
  -- 2. Upsert B's back-relation value: append A's id
  INSERT INTO property_values (entry_id, property_id, value)
    VALUES (:entryB, :backPropId, jsonb_build_array(:entryA))
    ON CONFLICT (entry_id, property_id) DO UPDATE
      SET value = property_values.value || to_jsonb(:entryA::text);
  COMMIT;
  ```
  There is no FK from inside the jsonb, so:
  - **On entry delete:** the deleted entry's own `property_values` cascade away, but its id remains embedded in the *other* side's relation lists. The delete transaction (or the `auto-delete-expired-trash` job, for trashed entries) must scrub the deleted id from every back-referenced entry's relation value. Until scrubbed, the UI renders a stale id as a `"Deleted entry"` chip (acceptable, but the id must eventually be removed to keep counts/filters correct).
  - **On Relation property delete:** remove the property, its values, **and** the paired back-relation property + its values — all in one transaction.
- `@me` Person default resolves to a concrete `user_id` at entry-creation time.

**Permissions & sharing** ([permissions.md](Features/permissions.md))
- Workspace role is the **ceiling** — page permissions can restrict but never exceed it (a Viewer can only ever be Can View).
- Private pages are hidden from everyone else **including Admins** (sidebar, search, links).
- Resolve effective permission in a single recursive CTE; filter restricted rows in SQL, never after fetch.
- Disabling a public link revokes access; re-enabling generates a **new** token (old URL dead forever).
- Guest invitations expire after 7 days; guests reach only the invited page(s).

**Comments** ([comments.md](Features/comments.md))
- Replies are one level deep only.
- Only the author edits; author or Admin deletes. Deleting a thread-root with replies leaves a `"[Comment deleted]"` placeholder (soft delete); with no replies, remove the thread.
- @mention notifications fire once at mention time — not again on edit.

**Notifications** ([notifications.md](Features/notifications.md))
- Enqueue transactionally — only if the triggering write committed.
- Never notify a user of their own action.
- Digests include only **unread** items; skip empty digests; purge after 90 days; retry failed sends 3×.

**Search** ([search.md](Features/search.md))
- Filter every result by the caller's effective permission; never surface other users' private or trashed pages.
- Scope to a single workspace; cap at 50 results.

**Templates / files / misc**
- ≤5 custom templates per workspace; only creator or Admin edits a custom template; entries are never saved in `page_snapshot`. ([templates.md](Features/templates.md))
- Check the **5 GB** workspace quota before issuing a pre-signed URL; record only on `/confirm`; decrement `bytes_used` only when the orphaned-media job actually deletes the object. **`user_avatar` uploads (`workspace_id = null`) are exempt from the quota** — they are global to the user, not workspace-scoped; all other `file_upload_kind` values are workspace-scoped and counted. ([file-storage.md](Features/file-storage.md))
- `user_recently_visited`: keep only the latest 10 per (user, workspace). ([navigation.md](Features/navigation.md))
- **Slug change** → INSERT a `workspace_slug_redirects` row with the old slug **before** updating `workspaces.slug`, both in the same transaction. The middleware reads this table to serve 308 redirects. Rows older than 30 days can be deleted. ([settings.md](Features/settings.md))
- `is_platform_admin` is set only in the DB; the Orbit audit log is append-only; impersonation sessions are marked and capped at 2 h. ([admin-panel.md](Features/admin-panel.md))

---

## Project setup to start development

These three pieces make the schema runnable. They are **not** part of the schema files under `lib/db/schema/` — they live in their own files.

**1. Dependencies** (`pnpm add` / `pnpm add -D`)

```jsonc
// package.json (relevant entries)
{
  "scripts": {
    "db:generate": "drizzle-kit generate",   // build migration SQL from lib/db/schema/
    "db:migrate":  "drizzle-kit migrate",     // apply pending migrations
    "db:studio":   "drizzle-kit studio"       // browse data
  },
  "dependencies": {
    "drizzle-orm": "^0.36.0",
    "postgres":    "^3.4.0",                  // postgres.js driver
    "better-auth": "^1.2.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.28.0"
  }
}
```

**2. `drizzle.config.ts`** (repo root)

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema",   // directory — drizzle-kit reads every *.ts file in it
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  casing: "snake_case",   // camelCase TS → snake_case columns
  verbose: true,
  strict: true,
});
```

**3. `lib/db/index.ts`** — the client

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";   // resolves to lib/db/schema/index.ts (the barrel)

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client, { schema, casing: "snake_case" });
```

**First run**

```bash
pnpm db:generate      # → drizzle/0000_*.sql
# then, in that generated SQL, add by hand the four hand-written SQL blocks below
pnpm db:migrate
```

**Hand-written SQL to add to the generated migration** (add each block verbatim after the Drizzle-generated DDL):

**1. Deferred FK — circular reference between `pages` and `database_views`**

```sql
-- pages.default_view_id → database_views.id is circular so it cannot be declared inline.
-- Add it after both tables exist.
ALTER TABLE pages
  ADD CONSTRAINT pages_default_view_fk
  FOREIGN KEY (default_view_id) REFERENCES database_views(id) ON DELETE SET NULL;
```

**2. FTS triggers — keep `search_index.search_vector` current**

```sql
-- Function called by all three triggers below.
CREATE OR REPLACE FUNCTION pagevo_search_upsert() RETURNS trigger AS $$
BEGIN
  -- Upsert the search_index row for the affected source.
  -- The trigger must be customised per table (see per-trigger COMMENT below).
  -- Weights: title = A, entry-title = B, block content = C, comments = D
  INSERT INTO search_index (id, workspace_id, source_type, source_id, title, search_vector, page_id, updated_at)
  SELECT
    gen_random_uuid(),
    p.workspace_id,
    'page',
    p.id,
    p.title,
    setweight(to_tsvector('english', coalesce(p.title, '')), 'A'),
    p.id,
    now()
  FROM pages p
  WHERE p.id = NEW.page_id AND p.is_deleted = false
  ON CONFLICT (source_type, source_id) DO UPDATE
    SET search_vector = EXCLUDED.search_vector,
        title = EXCLUDED.title,
        updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on blocks: re-index the page (all block text is weight C in the full index).
-- For full block-content indexing, update the function body to aggregate all block text
-- for the page and produce a weighted tsvector: title A + block text C.
CREATE OR REPLACE TRIGGER blocks_search_update
AFTER INSERT OR UPDATE OF content ON blocks
FOR EACH ROW EXECUTE FUNCTION pagevo_search_upsert();

-- Trigger on property_values: re-index the entry (entry title = B, property text values = C).
-- A separate trigger function aggregates all text-type property values for the entry.
CREATE OR REPLACE FUNCTION pagevo_entry_search_upsert() RETURNS trigger AS $$
DECLARE
  v_entry   pages%ROWTYPE;
  v_prop_text text;
BEGIN
  SELECT * INTO v_entry FROM pages WHERE id = NEW.entry_id AND is_deleted = false;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Aggregate all text-type property values for this entry into a single string.
  -- Includes: text, select option names, multi-select option names (from config jsonb),
  --           url, email, phone values stored as plain text in property_values.value.
  SELECT string_agg(pv.value::text, ' ')
    INTO v_prop_text
    FROM property_values pv
    JOIN database_properties dp ON dp.id = pv.property_id
   WHERE pv.entry_id = NEW.entry_id
     AND dp.type IN ('text', 'select', 'multi_select', 'url', 'email', 'phone');
  -- number, date, checkbox, person, and relation are intentionally excluded from
  -- full-text search: they carry no meaningful natural-language content to index.
  -- If a use-case for searching these arises post-MVP, add an expression index
  -- on the specific property type rather than widening this trigger.

  INSERT INTO search_index (id, workspace_id, source_type, source_id, title, search_vector, page_id, updated_at)
  SELECT
    gen_random_uuid(),
    v_entry.workspace_id,
    'entry',
    v_entry.id,
    v_entry.title,
    setweight(to_tsvector('english', coalesce(v_entry.title, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(v_prop_text, '')), 'C'),
    v_entry.id,
    now()
  ON CONFLICT (source_type, source_id) DO UPDATE
    SET search_vector = EXCLUDED.search_vector,
        title = EXCLUDED.title,
        updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER property_values_search_update
AFTER INSERT OR UPDATE OF value ON property_values
FOR EACH ROW EXECUTE FUNCTION pagevo_entry_search_upsert();

-- Trigger on comments: re-index the comment (source_type = 'comment', weight D).
-- Uses a dedicated function so source_type is set correctly (pagevo_search_upsert hardcodes 'page').
CREATE OR REPLACE FUNCTION pagevo_comment_search_upsert() RETURNS trigger AS $$
BEGIN
  INSERT INTO search_index (id, workspace_id, source_type, source_id, title, search_vector, page_id, updated_at)
  SELECT
    gen_random_uuid(),
    p.workspace_id,
    'comment',
    NEW.id,
    p.title,
    setweight(to_tsvector('english', coalesce(NEW.content::text, '')), 'D'),
    p.id,
    now()
  FROM pages p
  WHERE p.id = NEW.page_id AND p.is_deleted = false
  ON CONFLICT (source_type, source_id) DO UPDATE
    SET search_vector = EXCLUDED.search_vector,
        title = EXCLUDED.title,
        updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER comments_search_update
AFTER INSERT OR UPDATE OF content ON comments
FOR EACH ROW EXECUTE FUNCTION pagevo_comment_search_upsert();
```

> **Note:** `pagevo_search_upsert()` re-indexes pages and blocks (source_type `page`). `pagevo_entry_search_upsert()` handles property value changes (source_type `entry`). `pagevo_comment_search_upsert()` handles comments (source_type `comment`, weight D) — a separate function is required because source_type differs. Before building search, expand `pagevo_search_upsert()` to aggregate **all** block text for the triggering page (not just the triggering row) and produce a properly weighted `tsvector`: title (A), block content (C). All triggers fire per-row so bulk operations (import, mass edit) must batch writes to avoid firing them thousands of times in one transaction (see CLAUDE.md Rule 6).

**3. Closure table maintenance — reference SQL patterns (enforce in app transactions)**

```sql
-- INSERT a new page (call inside the same transaction that inserts the pages row):
INSERT INTO page_closure (ancestor_id, descendant_id, depth)
  -- Self-reference at depth 0
  SELECT NEW.id, NEW.id, 0
  UNION ALL
  -- Inherit all ancestors of the parent
  SELECT ancestor_id, NEW.id, depth + 1
  FROM page_closure
  WHERE descendant_id = NEW.parent_id;

-- MOVE a page to a new parent (run all three steps in one transaction):
-- Step 1: Remove old ancestor paths (keep self-row at depth 0)
DELETE FROM page_closure
WHERE descendant_id IN (SELECT descendant_id FROM page_closure WHERE ancestor_id = :pageId)
  AND ancestor_id NOT IN (SELECT descendant_id FROM page_closure WHERE ancestor_id = :pageId);
-- Step 2: Re-insert paths through the new parent for the page and all its descendants
INSERT INTO page_closure (ancestor_id, descendant_id, depth)
  SELECT p.ancestor_id, c.descendant_id, p.depth + c.depth + 1
  FROM page_closure p, page_closure c
  WHERE p.descendant_id = :newParentId
    AND c.ancestor_id = :pageId;
-- Step 3: Re-insert self-rows for all descendants at depth 0 (already exist, skip if using ON CONFLICT DO NOTHING)

-- DELETE a page tree (cascade via ON DELETE CASCADE on page_closure FKs handles this automatically).
-- The FK cascade on pages.id → page_closure.ancestor_id/descendant_id deletes all closure rows
-- when a page is permanently deleted. For soft-delete (is_deleted = true) the closure rows remain
-- and are used for permission checks on trashed pages.
```

> **Auth ↔ schema mapping (settled — do this before writing any auth code):**
> Better Auth's Drizzle adapter and its Magic-Link / Admin plugins assume their own
> table and column names. We keep the snake_case schema above and bridge with the
> adapter config rather than renaming our tables. Concretely:
>
> 1. **Table names:** pass an explicit table map to the adapter so Better Auth's
>    logical models (`user`, `session`, `account`, `verification`) resolve to our
>    plural tables (`users`, `sessions`, `accounts`, `verifications`).
> 2. **Field names:** set `usePlural: true` and `casing: "snake_case"` on the
>    Drizzle adapter so camelCase model fields map to our snake_case columns; for
>    any field whose meaning differs (e.g. our `is_platform_admin` vs the Admin
>    plugin's `role`), add an explicit `fields` override in the plugin/user config.
> 3. **Admin plugin** expects `banned` / `ban_reason` / `ban_expires` — these exist
>    on `users` (note our column is `banned_reason`; map it via `fields`).
> 4. **Verifications** backs magic-link tokens; ensure `identifier` / `value` /
>    `expires_at` line up with the plugin's expectations (they do, as named).
>
> Lock this mapping in `lib/auth/` once and never rename auth columns afterward —
> changing them after sessions/accounts exist forces a data migration.
