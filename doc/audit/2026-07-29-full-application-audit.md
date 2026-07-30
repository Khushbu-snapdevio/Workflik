# WorkFlik — Full Application Functionality Audit

**Date:** 2026-07-29
**Method:** Static/code-level audit against `doc/CLAUDE.md` (the acceptance spec) and the 40 Hard Rules / 28 UI Rules, cross-referenced against the ~45 already-fixed bugs in `doc/bugs/`, plus mechanical checks (`pnpm typecheck`, `pnpm lint`, targeted greps). No live browser session was used — see [Methodology note](#methodology-note) at the bottom.

Every finding below cites `file:line` evidence. Findings that duplicate an already-fixed `doc/bugs/` entry are omitted unless the fix looks incomplete or regressed — those are called out explicitly where relevant.

## Summary

| | Count |
|---|---|
| ✅ Working correctly | ~48 |
| ⚠️ Partially working | ~17 |
| ❌ Broken | ~14 |
| 🚧 Incomplete (never built) | ~12 |
| 💡 UX / consistency improvement | ~15 |

Two findings are **Critical** (security-relevant, affect the golden path for a whole user class). Everything else is High/Medium/Low as marked.

---

## Critical Issues

### 1. Page read/write API routes bypass the permission resolver entirely (BOLA)
**Severity:** Critical
**Problem:** `app/api/pages/[id]/route.ts` (GET/PATCH/DELETE), `app/api/blocks/batch/route.ts`, `app/api/pages/[id]/duplicate/route.ts`, and the server-rendered page view (`app/app/[workspace]/[pageId]/page.tsx:63-64`) only call `requireWorkspaceMember(...)` — none of them call `requirePagePermission`/consult `pagePermissions` or `pages.isPrivate`. Only the ancillary endpoints (permissions, public-link, guest-invite, comments) use the real resolver.
**Expected:** Hard Rule 3 — "Always resolve permissions through the shared resolver at the SQL level... Never filter restricted rows in application code after a broad fetch." Auth order must be `requireSession → requireWorkspaceMember → requirePagePermission`.
**Actual:** Any workspace member who knows or guesses a page ID can view/edit/delete/duplicate it — including private pages and pages where they've been explicitly downgraded to Can View — because the permission-ceiling and private-page checks never run on the hot path. `lib/permissions/resolver.ts` itself is correctly built; it's just not wired into these routes.
**Suggested Fix:** Add `requirePagePermission(userId, pageId, minLevel)` to the page GET/PATCH/DELETE, block-batch, and duplicate routes, and to the server-rendered page view, before returning or mutating content.

### 2. Guest page-invite bypass flow is broken end-to-end
**Severity:** Critical
**Problem:** Three compounding bugs make "invite a guest to one page" — a documented, load-bearing flow — non-functional: (1) an unauthenticated guest gets a raw "Unauthorized" error instead of a sign-in redirect; (2) the post-accept redirect is built from the wrong ID (a page's `shortId` used where a workspace slug is expected) and 404s; (3) even if navigation worked, `WorkspaceLayout` requires real `workspaceMembers` membership, which page-only guests never get, so they'd be funneled into the mandatory onboarding wizard the spec says they must skip.
**Expected:** `doc/CLAUDE.md` Onboarding section — "Guest bypass: ... skips the onboarding wizard entirely and is taken straight to the shared page they were invited to."
**Actual:** `app/invite/guest/[token]/page.tsx:46-56` has no sign-in-first handling (contrast with the working pattern in `app/invite/[token]/page.tsx:79,145`); `app/api/invite/guest/[token]/route.ts:112` returns `shortId: page?.shortId` and `page.tsx:55` does `router.push(`/app/${data.shortId}`)` — missing the workspace slug segment every other navigation call site includes (e.g. `library-client.tsx:471`); `users.onboardingCompleted` is never set for guest-only accounts.
**Suggested Fix:** Redirect unauthenticated guest visitors through `/auth/login?next=/invite/guest/${token}`; fix the redirect to include the workspace slug; either grant guests a restricted access path that doesn't require `workspaceMembers`, or set `onboardingCompleted = true` on accept.

---

## Broken Features

### Sidebar — type-to-filter page tree (regression)
**Status:** ❌ Broken · **Severity:** High
The filter input was deleted from the sidebar header during an unrelated restructure (`git log -S setFilter` → commit `5e544b1`, 2026-06-22), leaving `const [filter] = useState("")` with no setter and no `<input>` anywhere (`components/sidebar/sidebar.tsx:106,570`). The ancestor-preserving filter logic itself (`components/sidebar/page-tree.tsx:87-104`) is correct but unreachable — this is dead code, not a design gap.
**Fix:** Re-add the filter `<input>` in the Pages section header, wired to `setFilter`.

### Page lock is not server-enforced
**Status:** ❌ Broken · **Severity:** High
`isLocked` disables the TipTap editor DOM client-side (`components/editor/editor.tsx:312`) but neither `app/api/pages/[id]/blocks/route.ts` nor `app/api/blocks/[id]/route.ts` check `isLocked` before accepting a mutation. Any editor-role member can still edit a "locked" page via a direct API call — the same category of gap as Critical Issue #1.
**Fix:** Add an `isLocked` check to `resolvePage`/`resolveBlock` in the blocks routes, mirroring the existing `isDeleted` check.

### Storage-threshold admin notification never fires
**Status:** ❌ Broken · **Severity:** High
`lib/jobs/handlers/notify-storage-threshold.ts:26-32` marks `thresholdNotifiedAt` immediately after a `// TODO: enqueue notification to workspace admins` comment — no notification or email is ever sent to any admin. A workspace crossing 90% usage is silently marked "notified" for 7 days with nobody actually told.
**Fix:** Call a new `triggerStorageThresholdNotification` for each workspace admin before/with the `thresholdNotifiedAt` update.

### Guest invite — access-level selector missing from Share panel
**Status:** ❌ Broken · **Severity:** Medium
`components/pages/share-panel.tsx:347` hardcodes `accessLevel: "can_edit"` for every guest invite — there's no dropdown in the JSX, so every guest is over-granted edit access regardless of intent. The backend (`app/api/pages/[id]/guests/invite/route.ts:14-15`) already validates all three levels correctly; only the UI control is missing.
**Fix:** Add a permission-level dropdown defaulting to `can_view`.

### Guest invite resend (on expiry) not implemented
**Status:** ❌ Broken · **Severity:** Medium
No endpoint or UI exists to resend an expired/pending page-level guest invite. `app/api/pages/[id]/guests/[guestId]/route.ts` only exports `DELETE`; the Share panel never even fetches pending `guestInvitations`. (Workspace-member invite resend exists and is unrelated.)
**Fix:** Add a pending-invites list to the Share panel plus a resend endpoint that regenerates the token/expiry.

### Sidebar — right-click context menu missing
**Status:** ❌ Broken · **Severity:** Medium
No `onContextMenu` handler exists in `components/sidebar/page-tree.tsx`; right-clicking a page does nothing. The only way to reach page actions is the `⋯` button.

### Sidebar — double-click rename missing
**Status:** ❌ Broken · **Severity:** Medium
No `onDoubleClick` and no "Rename" menu item exist anywhere in `components/sidebar/page-tree.tsx`.

### Sidebar — `Ctrl+\` collapse shortcut missing
**Status:** ❌ Broken · **Severity:** Medium
`toggleCollapse` (`sidebar.tsx:315-323`) is only invoked from `onClick`; no keydown listener for `\` exists anywhere in the app.

### Breadcrumb collapsing for >4 segments missing
**Status:** ❌ Broken · **Severity:** Medium
`components/pages/page-breadcrumbs.tsx:88-102` renders every ancestor unconditionally with per-segment CSS truncation only — no ellipsis-collapse logic, contradicting Hard Rule 39 / UI Rule 28.

### Search — "Inside a specific page" location filter missing
**Status:** ❌ Broken · **Severity:** Medium
`FilterLocation` (`components/search/search-dialog.tsx:57`) only has `"all" | "shared" | "private"` — the fourth documented option doesn't exist.

### Editor — `Ctrl+K` link shortcut missing
**Status:** ❌ Broken · **Severity:** Medium
Only the toolbar button opens the link input; `@tiptap/extension-link` has no built-in `Mod-k` binding and none was added in `components/editor/editor.tsx:408`. Bold/Italic/Underline/Code shortcuts all work correctly by contrast.

### 10-level block nesting limit not enforced
**Status:** ❌ Broken · **Severity:** Medium
No depth check exists at drag/drop or Tab-indent time anywhere in `components/editor/`. A block can be nested arbitrarily deep.

### Notification center `Ctrl+Shift+N` shortcut missing
**Status:** ❌ Broken · **Severity:** Medium
`components/notifications/notification-bell.tsx` only wires `onClick`; no global keydown listener for the documented shortcut exists.

### Table row drag-reorder not disabled during active sort
**Status:** ❌ Broken · **Severity:** Medium
Neither `components/database/table-view.tsx` nor `components/templates/views/template-table-view.tsx` gate the row drag handle on whether a sort rule is active — dragging works identically either way, contradicting the documented behavior.

### Workspace slug 308 redirect never implemented
**Status:** ❌ Broken · **Severity:** High
A `workspaceSlugRedirects` row is written on slug change (`app/api/workspaces/[id]/route.ts:66-69`) but nothing ever reads it. `app/app/[workspace]/layout.tsx:26-34` 404s on an old slug instead of issuing a 308 within the documented 30-day window. There's no `middleware.ts` in the project at all.
**Fix:** Add a lookup against `workspaceSlugRedirects` (created within 30 days) before `notFound()`, and issue a 308.

### Account deletion (Danger Zone) missing `<AlertDialog>`
**Status:** ❌ Broken · **Severity:** High
`components/settings/profile-section.tsx:810-883` uses an inline expanding `<div>` with Cancel/Delete buttons directly in the page instead of an `<AlertDialog>` — the exact anti-pattern already fixed for workspace deletion (`workspace-general-section.tsx:520`, which is correct). This is a direct Hard Rule 23 violation on the most destructive action in the app.

### `window.confirm()` on a destructive Orbit action
**Status:** ❌ Broken · **Severity:** Low
`components/orbit/seed-templates-button.tsx:13` uses bare `confirm(...)` to gate a "delete all built-in templates and re-seed" action instead of an `<AlertDialog>` — a Hard Rule 23 violation.

---

## Incomplete Features (never built, not regressed)

### Storage awareness UI entirely absent
**Severity:** High
The backend (`app/api/workspaces/[id]/storage/route.ts`) correctly computes usage, quota %, and per-category breakdown, and uploads are correctly blocked server-side at 100% (`app/api/uploads/sign/route.ts:53-65`). But there is no `Settings → Workspace → Storage` page at all (`app/app/[workspace]/settings/` has only `general, members, notifications, profile, sessions`), no usage bar, no 90%/100% banner, and no component anywhere consumes the storage endpoint. Users get no warning before hitting the upload wall.
**Fix:** Build the Storage settings section per `doc/CLAUDE.md`'s File Storage section (amber@90%/red@100% bar, per-category breakdown, workspace-wide banner at ≥90%).

### Offline auto-save queue not implemented
**Severity:** High
`components/editor/editor.tsx:328-373` sets a `"offline"` UI state on save failure but never persists the pending document (no IndexedDB/localStorage anywhere in the repo) and never listens for the `online` event to retry. An edit made offline with no further typing before the tab closes is silently lost — directly contradicting "edits queue locally and sync when connection restores."

### Block handle — Move to / Turn into / Color / multi-select missing
**Severity:** High
`components/editor/block-handle.tsx:377-409` implements only Comment/Duplicate/Delete. There is no "Turn into" type-picker, no "Move to" page-picker, no Color option, and no Shift+click range-select for bulk operations anywhere in the editor — roughly half of the documented block-operations menu doesn't exist.

### Text-level comment anchor adjustment / partial-delete orphaning
**Severity:** High
`components/editor/extensions/comment-highlight.ts:36-54` renders decorations at raw stored offsets with no re-mapping or fuzzy re-matching. The only orphaning path (`app/api/blocks/batch/route.ts:50-54`) fires only on whole-block deletion — deleting just the anchored substring within a surviving block never orphans the comment, and edited anchors never "adjust to nearest match" as documented.

### Custom template placeholder blocks not implemented
**Severity:** Medium
There is no `isPlaceholder` concept anywhere in the schema or editor (`grep` for `isPlaceholder|placeholderBlock` returns nothing). Custom templates are a verbatim block snapshot with no faded/italic guidance-text capability.

### Trash — per-page expiry banner is static, not day-count-aware
**Severity:** Medium
`components/pages/trash-banner.tsx:6-56` always renders the identical "will be permanently deleted in 30 days" text regardless of actual days elapsed — it takes no `deletedAt` prop, unlike the Trash *list* view (`trash-client.tsx:341-342,375-376`), which correctly computes and highlights urgency.

### Empty-Trash lacks Admin/non-Admin scoping
**Severity:** Medium
`DELETE /api/pages/[id]/route.ts:145` only requires editor-role membership — any editor can select-all-and-permanently-delete every trashed page in the workspace, including pages they didn't create or trash, contradicting the documented Admin-vs-personal-permission split.

### Private pages invisible to explicitly-granted non-creators
**Severity:** High (self-acknowledged as deferred in code)
`app/api/workspaces/[id]/pages/tree/route.ts:10-11` and `app/api/search/route.ts:62-64` both carry comments admitting the private-page filter only checks `isPrivate=false OR createdBy=me` — "Full BOLA enforcement deferred to Phase 12." A member explicitly granted access to someone else's private page never sees it in the sidebar or search, contrary to "lock icon shown to those with access."

---

## Partially Working

- **Account deletion doesn't actually delete private-page content.** The UI (confirmation, typed-email check, blocking-workspace list, spinner) is well built, but `app/api/user/account/route.ts:79` does a bare `db.delete(users)`; private pages/files use `onDelete: "set null"` FKs, not cascade, so they're orphaned with a null owner instead of permanently deleted and storage quota is never decremented — contradicting the documented data-retention promise. *(High)*
- **Onboarding wizard is 7 steps, not the documented 4** — three extra profiling-survey screens (`app/platform/onboarding/_onboarding-ui.tsx:19-68`) were added without updating `doc/CLAUDE.md`. Functional, just undocumented drift (Hard Rule 1). *(Medium)*
- **Session revoke swallows failures silently** — `components/settings/sessions-section.tsx:59-78` has empty `catch {}` blocks; a failed revoke shows no error, just no-ops. *(Medium)*
- **Session location never captured** — only raw IP is shown; no city/country geo lookup exists anywhere, despite being explicitly documented. *(Low, both Settings→Sessions and Orbit)*
- **Editor save failures while online are silently swallowed** — `editor.tsx:371-373` reverts straight to `"idle"` on a non-connectivity failure (e.g. a 500), with no error affordance and no retry queue. *(Medium)*
- **Drag-and-drop can't nest a page under a different parent** — each sibling group gets an isolated `DndContext` (`page-tree.tsx:300-334`); dnd-kit can't drag across separate contexts, so only same-parent reordering works. *(Medium)*
- **Invite-link "Disable" has no confirmation dialog**, unlike the adjacent "Regenerate" button in the same settings row (`workspace-general-section.tsx:474-476` vs `:471`). *(Medium)*
- **Undo/redo is capped at 100 steps, not 200** — no `history: { depth: 200 }` override on `StarterKit.configure(...)` (`editor.tsx:382`), so ProseMirror's default applies. *(Low)*
- **Real-time toasts stack individually instead of batching** — `notification-provider.tsx:82-87` pushes each notification as its own toast card (capped at 5) rather than one summarized toast. *(Low)*
- **Embedded (inline) database views don't survive back-navigation** — the fix for this landed only in the full-page template renderer; `components/database/database-page.tsx` has no `?view=` URL sync at all. *(Low)*
- **Revoke-guest has a dead-code ordering bug** — `DELETE /api/pages/[id]/guests/[guestId]/route.ts:23-40` deletes the invitation row, then selects it by the same ID to find the email for cleanup — always empty. Not currently reachable in practice since the real revoke path goes through a different endpoint, but worth fixing. *(Low)*
- **Orphaned-media cleanup ignores recent version snapshots** — a documented TODO gap in `cleanup-orphaned-media.ts:41-42`; currently dormant because nothing writes `page_versions` yet, but will become a real data-loss risk once version history ships. *(Low, latent)*
- **Trash actions aren't hidden from Viewers in the UI** — the server correctly enforces editor-minimum role, but `trash-client.tsx` shows Restore/Delete buttons to everyone regardless of role; a Viewer only discovers the block via a failed request. *(Low)*
- **`filter-bar.tsx` (real databases) still blocks reusing a property across filter rows**, while the template database's filter panel was just fixed to allow it — an intentional-looking but undocumented divergence between the two filter implementations. *(Low)*

---

## UX Improvements

- **Search has no custom date-range picker** — only fixed 24h/7d/30d buckets exist; the documented "Custom date range" option is missing. *(Low)*
- **Sidebar doesn't auto-collapse at ≤1024px** as documented — no `matchMedia` listener exists. *(Low)*
- **Sidebar minimum resize width is 260px, not the documented 200px** (`sidebar.tsx:84-85`). *(Low)*
- **Favorites renders above Recently Visited**, reversed from the documented section order. *(Low, cosmetic)*
- **Hover-star is only reachable via the `⋯` dropdown**, not as a standalone hover icon alongside it as documented. *(Low)*
- **"Empty Trash" is really a two-step "Delete all → confirm" flow**, not a single named action — functionally equivalent, just relabeled/split from the spec's phrasing. *(Low)*
- **Workspace Members settings page is viewable by any role**, not gated to Admin-only as documented (mutations are still correctly admin-gated server-side, so this is visibility-only). *(Low)*
- **Built-in template count is 18, not the documented 16** (`app/api/orbit/templates/seed/route.ts`, corroborated by `doc/bugs/2026-07-23-solution-win1252-encoding-blocks-template-seed.md`). *(Low, doc/code mismatch)*
- **Gantt view is a fully-built, undocumented view type** — real feature, just missing from CLAUDE.md's view-type table. *(Low, doc gap — not a bug)*
- **A vestigial, half-implemented async page-export job handler still exists** (`lib/jobs/handlers/export-page.ts`) with a "TODO Phase 7" comment, even though the live export path (`app/api/pages/[id]/export/route.ts`) is a separate, working synchronous route. The dead handler is never enqueued but will mislead anyone grepping for "export." *(Low — recommend deleting it)*

---

## Inconsistencies (design-system / Hard Rule compliance)

Mechanical grep + `pnpm lint` sweep across `app/`, `components/`, `lib/`:

- **Shadows (Hard Rule 19 — "no shadows anywhere"):** ~19 files use `shadow-sm`/`shadow-lg`/`shadow-2xl`/arbitrary shadow values outside the approved design-token shadow system, e.g. `app/page.tsx:163,331`, `components/database/date-value-editor.tsx:502,550`, `components/database/cells/cell-editor.tsx:1003,1074`, `components/ui/sidebar.tsx:478`. Some are in landing-page marketing sections (lower priority); several are in core app chrome (popovers, cell editors) and should be cleaned up.
- **Raw `<img>` instead of `next/image` (Hard Rule 26):** 31 confirmed instances across ~16 files (`components/editor/mention-list.tsx:301`, `comment-card.tsx` ×3, `comment-composer.tsx:292`, `media-blocks.tsx:224`, `bookmark-block.tsx` ×4, `notification-card.tsx`, `sidebar.tsx`, `admin-sidebar.tsx`, `icon-picker.tsx` ×2, `page-icon.tsx`, `gallery-view.tsx` ×2, `cell-display.tsx`, `cell-comment-popover.tsx` ×2, `cell-editor.tsx`, `page-comment-button.tsx`, `settings-top-bar.tsx` ×2, `user-hover-card.tsx`, `workspace-members-section.tsx`, `profile-section.tsx`). Root cause: `next.config.mjs` has no `images.remotePatterns` configured, so `next/image` can't currently load the app's own upload/storage domain at all — this needs a config change before most of these can be migrated. A few (bookmark favicons/OG images from arbitrary external sites, and one base64 preview) are defensible exceptions and already carry an eslint-disable comment.
- **Non-lucide icons (Hard Rule 27):** 13 `components/ui/*` shadcn primitives (`command.tsx`, `checkbox.tsx`, `breadcrumb.tsx`, `pagination.tsx`, `navigation-menu.tsx`, `dropdown-menu.tsx`, `accordion.tsx`, `sheet.tsx`, `sidebar.tsx`, `dialog.tsx`, `menubar.tsx`, `sonner.tsx`, `context-menu.tsx`) import from `@phosphor-icons/react` instead of `lucide-react` — this is the vendored shadcn baseline, not app code, but it's a systemic deviation from the project's own stated rule.
- **`process.env` read outside `lib/env.ts` (Hard Rule 9):** `lib/storage/index.ts:12` reads `process.env.STORAGE_DRIVER` directly even though `STORAGE_DRIVER` is already defined and Zod-validated in `lib/env.ts:41` — a genuine, easily-fixed violation. (The other 3 grep hits are all `NODE_ENV` checks, a reasonable Node-builtin exception, not violations.)
- **Hardcoded hex colors (Hard Rule 20):** `components/templates/views/template-board-view.tsx:35-55` and `components/templates/save-as-template-modal.tsx:163` hardcode ~30 hex values for category-color swatches and an error banner instead of CSS variables. The board-category swatches are arguably a deliberate, fixed palette for user-chosen tag colors (similar to Notion's fixed color chips) rather than themable UI — worth a design decision either way, since it's a literal rule violation today. The Google "G" logo brand colors in `auth-form.tsx`/`app/orbit-admin/orbit/settings/page.tsx` are a legitimate, already-acknowledged exception (official multi-color brand mark).
- **`pnpm typecheck` is clean** — 0 errors, a good signal for overall type-safety.
- **`pnpm lint` reports 5,705 issues**, but ~5,500 of them are purely cosmetic and auto-fixable via `pnpm lint:fix` (`useBlockStatements`, `useSortedAttributes`/`useSortedProperties`/`useSortedInterfaceMembers`, import ordering). The remainder has real signal worth triaging separately:
  - **101 `useExhaustiveDependencies`** (missing `useEffect`/`useCallback` deps) — concentrated in `components/database/gantt-view.tsx`, `edit-property-panel.tsx`, `components/templates/template-page-client.tsx`, `database-page.tsx`, `profile-section.tsx`, `page-comment-button.tsx`, `library-client.tsx`, `cell-editor.tsx`. This is the same stale-closure pattern behind several already-fixed "stale data" bugs in `doc/bugs/` — worth a dedicated pass since it's clearly a recurring anti-pattern, not fully eradicated.
  - **72 `noArrayIndexKey`** (array index used as React `key`) — concentrated in `template-gallery-modal.tsx`, `template-gantt-view.tsx`, `template-calendar-view.tsx`, `workspace-setup.tsx`, `lib/email/components/digest.tsx`. This is the same class of bug as the already-fixed "mention-date-duplicate-key" issue — likely still causing subtle list-reconciliation bugs elsewhere.
  - **31 `noImgElement`** — corroborates the raw-`<img>` finding above.
  - **21 unused imports, 12 unused variables, 10 unused function parameters** — dead-code hygiene, low risk but worth a cleanup pass.
  - **12 `noExplicitAny`** — type-safety erosion in a strict-mode TypeScript codebase.
  - **3 `noNestedComponentDefinitions`** (`components/database/date-value-editor.tsx:215,225`, `components/pages/emoji-grid-picker.tsx:285`) — components defined inside other components' render bodies cause needless remounts; worth hoisting.
  - **1 `noAlert`** — the `seed-templates-button.tsx:13` finding already listed under Broken Features.

---

## Nice-to-have Improvements

- Add a geo-IP lookup for session "approximate location" (currently just shows raw IP) in both Settings→Sessions and Orbit's per-user session view.
- Delete the vestigial `PAGE_EXPORT` pg-boss job/handler (`lib/jobs/handlers/export-page.ts`) since the live export path doesn't use it — or wire it up if an async large-export flow is actually planned.
- Consider consolidating the two independent database-filter implementations (`components/database/filter-bar.tsx` for real DBs vs. the template client's inline filter panel) so property-reuse/AND-OR semantics don't silently diverge again.
- Document the Gantt view type and its start/end Date-property configuration in `doc/CLAUDE.md`, consistent with how Calendar's Date-property config is documented.
- Reconcile the "16 built-in templates" claim in `doc/CLAUDE.md` with the actual seeded count (18).

---

## Methodology Note

This audit did not drive a live browser session. Auth is magic-link/Google OAuth (not scriptable), and forging a session by reading tokens directly from the database was denied by the permission classifier — appropriately, since that's live credential material. Per an explicit choice made at the start of this audit, verification was done by reading the actual route handlers, components, and job/lib code and diffing behavior against `doc/CLAUDE.md` (which is detailed enough to serve as a genuine acceptance spec), supplemented by `pnpm typecheck`/`pnpm lint` and targeted greps for Hard Rule compliance. Every finding above is backed by a concrete code citation; nothing here is inferred from UI screenshots or manual clicking. Areas most likely to still hide UI-only issues (visual glitches, hover-state timing, exact pixel spacing) that this method can't catch are the editor's rich-text interactions and the database views' drag/resize interactions — a follow-up pass with actual browser automation (e.g., against a seeded test account) would be the natural next step if that's valuable.
