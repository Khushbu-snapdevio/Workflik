# Full-Codebase daisyUI / Headless UI Migration Audit — 2026-08-04

**Companion to [daisyui-migration-plan.md](./daisyui-migration-plan.md).** That doc tracks the `components/ui/` primitive-by-primitive conversion (button, dialog, select, sheet, popover, tooltip, accordion, card, etc. — see its Revision section for current state). This doc is the audit the plan's Revision section didn't cover: **every feature-level component outside `components/ui/`** — database views, the editor, sidebar/admin shells, settings, orbit admin, pages/workspace/templates, notifications/search/onboarding — evaluated against the same locked policy.

## Scope & method

Six parallel read-only audits covered ~170 files across `components/database/`, `components/editor/`, `components/sidebar/` + `components/layout/` + `components/admin/`, `components/settings/` + `components/orbit/`, `components/pages/` + `components/workspace/` + `components/templates/`, and `components/notifications/` + `components/search/` + `components/onboarding/` + `components/landing/` + `components/auth/`. `components/ui/*` files themselves were out of scope (already tracked in the main plan); only how feature code **uses or reimplements** similar patterns was audited.

**Locked priority order** (from the main plan's Revision, 2026-08-04): 1) native HTML, 2) daisyUI CSS classes, 3) Headless UI (`@headlessui/react` v2.2.10) for real interactive behavior, 4) hand-rolled only with a stated concrete technical reason (viewport collision, cursor-anchored positioning, cascading multi-popup coordination, virtualization, browser limitation, unmet a11y need).

**Existing precedents assumed and not re-litigated:** `components/database/{cell-action-overlay,entry-context-menu,card-context-menu,cell-comment-popover,group-header-menu,option-submenu,user-hover-card}.tsx`, `icon-tooltip.tsx`/`icon-tooltip-button.tsx`/`reaction-tooltip.tsx`, sidebar "N more" flyouts, and `tabs.tsx`'s hand-rolled value-based API were all already evaluated and kept custom in prior work — this audit confirms those verdicts still hold and, where relevant, **extends the same precedent** to newly-found sibling cases (noted inline).

---

## Cross-cutting problems found in multiple places

These aren't single-file findings — they're patterns repeated across the codebase, worth fixing as one initiative rather than file-by-file.

| # | Pattern | Where | Fix |
|---|---|---|---|
| X1 | **Three parallel tooltip systems** coexist: (a) shared daisy CSS `tooltip` (`components/ui/tooltip.tsx`), (b) hand-rolled `createPortal`+`getBoundingClientRect` (`icon-tooltip.tsx`/`useHoverTooltip`), (c) one-off CSS `group-hover` divs reimplemented per-file. | `sidebar.tsx` (3rd variant), `home-favorites-section.tsx`, `notification-bell.tsx`, `hint.tsx`, `sign-out-button.tsx`, board/gallery-view card tooltips, dozens more via `IconTooltip` | (b) is justified only where a tooltip must escape a scroll-clipped container (dense table/list rows — e.g. `notification-card.tsx`). Everywhere else — static buttons in normal flow — consolidate onto (a), the shared daisy tooltip. |
| X2 | **Hand-rolled dropdown/menu** (`useState` + `mousedown` outside-click ref + `absolute`/portal panel, no keyboard nav, frequently no Escape) reimplemented dozens of times instead of Headless UI `Menu`. | `sidebar.tsx` (New menu, user menu), `admin-sidebar.tsx` (user menu, exact dup), `workspace-switcher.tsx`, `page-actions-menu.tsx`, `table-view.tsx` row menu, `toolbar.tsx` (6+ menus sharing one 245-line listener), `block-handle.tsx`, `comment-card.tsx` (`SimpleDropdown` with a `cloneElement` close-prop hack), `cell-editor.tsx` (`FileThumbnailMenu`), `search-dialog.tsx` (`FilterChip`) | Standardize on Headless UI `Menu` (and `Popover.Group` where several menus share one outside-click coordinator, e.g. `toolbar.tsx`). |
| X3 | **Hand-rolled searchable single/multi-select** (`useState` + filter + portal list) reimplemented instead of Headless UI `Listbox`/`Combobox`, despite `components/ui/select.tsx` already establishing the Listbox pattern in-repo. | `profile-section.tsx` `TimezoneDropdown`, `workspace-general-section.tsx` `ChevronSelect`, `share-panel.tsx` (`SelectField`, `GeneralAccessControl`), `group-settings-panel.tsx` (2 pickers), `relation/formula/rollup-config-picker.tsx`, `filter-bar.tsx` `MultiOptionPicker`, `cell-editor.tsx` (`PersonEditor`/`RelationEditor`), `reference-blocks.tsx` (`BlockTypeSelect`, `LinkedPageView` search) | Standardize on Headless UI `Listbox` (fixed option list) or `Combobox` (needs filter-as-you-type). |
| X4 | **Hand-rolled modal/overlay** (`createPortal` + `fixed inset-0` backdrop + manual Escape listener, usually missing focus trap) instead of the already-adopted native `<dialog>` pattern (`components/ui/dialog.tsx`/`sheet.tsx`). | `settings-shell.tsx`, `categories-manager.tsx` (new-category modal), `template-preview-modal.tsx`, `invite-members-modal.tsx`, `save-as-template-modal.tsx`, `template-gallery-modal.tsx`, `template-page-client.tsx` `CoverPicker`, `entry-side-panel.tsx`, `comment-card.tsx` `ImageLightbox`/`bookmark-block.tsx` `EmbedLightbox`, `editor.tsx` floating `CommentCard` | Standardize on `components/ui/dialog.tsx` or `sheet.tsx`. Several of these fix a real a11y gap (no focus trap) for free. |
| X5 | **Destructive action skips `AlertDialog`.** | `trash-banner.tsx` (hand-rolled delete-permanently modal), `seed-templates-button.tsx` (native `confirm()`), `user-actions.tsx` `UserBanForm` (no confirmation at all) | Direct violation of Hard Rule 23. Route through the existing `ConfirmDialog`/`AlertDialog` — trivial, no design work needed. |
| X6 | **Hardcoded hex colors**, bypassing the token system. | `page-tree.tsx` Draft badge, 5× sidebar flyout header gradients (`#0369A1`→`#38BDF8`), `page-draft-pill.tsx`, `page-privacy-pill.tsx`, `gallery-view.tsx` option-color pills (also a **rendering bug** — hex interpolated into `className` instead of `style`), `tooltip-tour.tsx` (`shadow-[var(--shadow-float)]` + `#0284C7` hex fallback) | Replace with semantic tokens/daisy badge variants. Gallery-view's is a functional bug, not just a style nit — fix first. |
| X7 | **Non-lucide icons** (raw inline `<svg>` or `@phosphor-icons/react`), violating Hard Rule 27. | `workspace-switcher.tsx`, `admin-sidebar.tsx` (~10 nav icons), `mobile-nav.tsx` (hamburger/close), `components/ui/command.tsx`, `sonner.tsx`, `pagination.tsx`, `breadcrumb.tsx` (all phosphor-icons) | Swap to `lucide-react` equivalents. |
| X8 | **Missing mutation-in-flight spinners** on buttons that trigger network requests (Hard Rule 30). | board-view "Add option", table-view bulk-delete/upload, toolbar new-entry/upload buttons, cell-editor upload | Add `Loader2` spinner + disabled state. |
| X9 | **Missing/incomplete empty states** (Hard Rule 28). | `entry-properties-panel.tsx` (renders `null`, no message at all), `entry-side-panel.tsx` (message, no CTA), `database-page.tsx` "No views configured" (no CTA) | Add message + CTA per rule. |
| X10 | **Uncoordinated z-index magic numbers** scattered per-popup (200/260/300/400/500/560/600/800/810/820/9999), some undocumented. | Sidebar flyouts, database toolbar/table/pickers, search-dialog `FilterChip`, cell-editor `FileThumbnailMenu` | Extract a shared z-index constants module — a real "whichever mounted last wins" bug class today, independent of any daisy/Headless migration. |
| X11 | **`shadow-*` utility violations** (Hard Rule 19 — no shadows anywhere). | `cell-editor.tsx` (`shadow-sm`, `shadow-lg`), `tooltip-tour.tsx` (`shadow-[var(--shadow-float)]`) | Remove. |
| X12 | **Duplicate toast pipelines.** `NotificationProvider`'s hand-rolled 5-stacked toast queue and the app's `sonner` `<Toaster position="bottom-right">` both render in the same corner, independently, with different one-at-a-time/duration policies. | `notification-provider.tsx`, `notification-toast.tsx` | Consolidate onto `sonner` via `toast.custom()`; drop the bespoke `NotificationToast` animation/lifecycle code. |
| X13 | **Missing `aria-expanded`/focus trap** on disclosure and mobile-drawer patterns. | Sidebar section headers (Favorites/Private/Recently Visited), `workspace-shell.tsx`/`admin-shell.tsx` mobile drawers (near-duplicate files, neither traps focus or closes on Escape) | Headless UI `Disclosure` for section headers; reuse the `Sheet`/native-`<dialog>` pattern for mobile drawers. |

---

## Complete migration table

Grouped by directory. Verdict legend: ✅ Ready · 🟡 Minor customization · 🔵 Better with Headless UI · 🔴 Better with native HTML · ⚪ Keep custom.

### `components/database/*`

| Component | File | Recommended | Complexity | Verdict |
|---|---|---|---|---|
| "Add option" popover | board-view.tsx | Headless UI `Popover` | Low | 🔵 |
| Color swatch picker | board-view.tsx | Headless UI `RadioGroup` | Low | 🔵 |
| Card hover-tooltip (duplicated) | board-view.tsx, gallery-view.tsx | reuse existing `useHoverTooltip()` | Low | ✅ |
| Group/option color pills (gallery bug) | gallery-view.tsx | fix `className`→`style` interpolation | Low | 🟡 |
| Group/option color pills (rest) | board-view, edit-property-panel, entry-properties-panel, cell-display, cell-editor | token migration, out of scope for interaction patterns | High | ⚪ persisted data value |
| Group-header/context/comment/hover-card popups | all 4 views + edit-property-panel shell + group-settings-panel shell | — | — | ⚪ matches named precedent, extend precedent list to include these two shells |
| "+N more" calendar overflow popup | calendar-view.tsx | — | — | ⚪ hover-intent + viewport-collision combo, no tier covers it |
| Gantt bar drag/resize | gantt-view.tsx | — | — | ⚪ continuous pointer drag math |
| Gantt scale toggle (day/week/month) | gantt-view.tsx | native radio group + daisy `join` | Low | 🔴 |
| Row select checkbox / select-all | table-view.tsx | daisy `checkbox` class on real input | Low | ✅ |
| Row "⋯" context menu | table-view.tsx | Headless UI `Menu` | Medium | 🔵 |
| Column header menu → property-picker handoff chain | table-view.tsx, toolbar.tsx | — | — | ⚪ cross-component chain handoff, matches precedent |
| Column resize handle | table-view.tsx | — | — | ⚪ raw pointer drag math |
| Static pills (comment count, quick actions) | table-view.tsx | daisy `badge`/`badge-sm` | Low | ✅ |
| Toolbar: view menu, "Add a view"/"Layout" grids, property-picker dropdowns (6 popovers, one shared listener) | toolbar.tsx | Headless UI `Menu`/`Popover`/`Listbox` per case, `Popover.Group` for the shared coordinator | Medium–High | 🔵 |
| Gallery card-size / entry-open-mode segmented controls | toolbar.tsx | native radio group + daisy `join` | Low | 🔴 |
| `MultiOptionPicker` filter value picker | filter-bar.tsx | Headless UI `Listbox multiple`/`Combobox` | Medium | 🔵 |
| And/or, asc/desc toggles | filter-bar.tsx, sort-bar.tsx | none — already correct native HTML | — | ⚪ already correct |
| Property/operator selects | filter-bar.tsx, sort-bar.tsx | none — already Headless UI Listbox | — | ✅ already done |
| Entry side-panel slide-over | entry-side-panel.tsx | reuse `components/ui/sheet.tsx` | Medium | 🔴 |
| Checkbox property toggle | entry-properties-panel.tsx | reuse existing shared `Checkbox` | Low | ✅ |
| `EditPropertySidePanel` outer shell | edit-property-panel.tsx | — | — | ⚪ matches precedent, add to precedent list |
| "Display as" 2-option dropdown | edit-property-panel.tsx | shared `select.tsx` (Listbox) | Low | ✅ |
| `SimpleIconPicker` | edit-property-panel.tsx | Headless UI `Popover` (keep exemption marker) | Medium | 🟡 |
| Sortable option rows (3 files) | edit-property-panel, group-settings-panel, cell-editor | — | — | ⚪ dnd-kit reorder, no primitive covers it |
| Group-settings inline pickers | group-settings-panel.tsx | Headless UI `Listbox` | Low | 🔵 |
| Group-by search sub-view | group-settings-panel.tsx | Headless UI `Combobox` | Low–Med | 🔵 |
| Relation/Formula/Rollup picker shells + change-type list | relation/formula/rollup-config-picker.tsx, change-property-type-picker.tsx | Headless UI `Popover`+`Combobox`/`Listbox` (needs virtual-reference adapter) | Medium | 🔵 |
| Date-value-editor calendar | date-value-editor.tsx | none — react-day-picker, range mode needed | — | ⚪ range mode not native-capable |
| Date-value-editor TimeInput | date-value-editor.tsx | none | — | ⚪ documented: native time input unthemeable |
| SimpleFlyout/TimezoneFlyout shell | date-value-editor.tsx | keep shell custom; Combobox for internal search list only | Low–Med | ⚪ (shell) / 🔵 (internal list) |
| Database-page loading skeletons | database-page.tsx | daisy `skeleton` class | Low | ✅ |
| "No views configured" empty state | database-page.tsx | add CTA | Low–Med | ✅ |
| `<main>` overflow lock (Gantt) | database-page.tsx | — | — | ⚪ imperative ancestor DOM override |
| `CheckboxGlyph` (select/status/multi_select display) | cell-display.tsx | native `<input type=checkbox>`, peer-styled | Medium | 🔴 |
| `CellEditorPopover` shell | cell-editor.tsx | — | — | ⚪ viewport-collision + cross-component ref-counted coordination |
| `SelectEditor` | cell-editor.tsx | — | — | ⚪ dnd-kit reorder + inline-create fused with search |
| `PersonEditor`/`RelationEditor` search lists | cell-editor.tsx | Headless UI `Combobox multiple` | Low–Med | 🔵 |
| `FileThumbnailMenu` | cell-editor.tsx | Headless UI `Menu` | Medium | 🔵 |
| `FileEditor` Tabs | cell-editor.tsx | none — shared `tabs.tsx`, already-justified precedent | — | ⚪ |

### `components/editor/*`

| Component | File | Recommended | Complexity | Verdict |
|---|---|---|---|---|
| `InlineToolbar` (BubbleMenu) | inline-toolbar.tsx | none | — | ⚪ already TipTap's own selection-anchored utility |
| `ColorPicker` inside toolbar | inline-toolbar.tsx | Headless UI `Popover` | Low | 🔵 |
| `SlashMenu` | slash-menu.tsx | — | — | ⚪ anchored to ProseMirror text-caret, no DOM trigger exists |
| `MentionList` | mention-list.tsx | — | — | ⚪ same as SlashMenu |
| `ImageLightbox` shell | comment-card.tsx | native `<dialog>`+`showModal()` | Low | 🔴 |
| ImageLightbox zoom/pan | comment-card.tsx | — | — | ⚪ cursor-driven wheel-zoom/pan, no primitive covers it |
| `EmojiPicker` | comment-card.tsx | Headless UI `Popover` | Medium | 🔵 |
| `SimpleDropdown`/`DropdownItem` (thread/reply actions) | comment-card.tsx | Headless UI `Menu` | Medium | 🔵 |
| Row/column context menu | table-controls.tsx | Headless UI `Menu` | Medium | 🔵 |
| Row/column hover-handle tracking | table-controls.tsx | — | — | ⚪ mousemove-driven geometry resolution |
| Block dropdown menu | block-handle.tsx | Headless UI `Menu` | Low–Medium | 🔵 |
| Block grip hover+drag tracking | block-handle.tsx | — | — | ⚪ wired into ProseMirror's `view.dragging` internals |
| `EmbedLightbox` | bookmark-block.tsx | native `<dialog>`+`showModal()` | Low | 🔴 |
| `UrlPicker`/`MediaPicker` raw inputs | bookmark-block.tsx, media-blocks.tsx | shared `Button`/`Input` | Low | 🟡 |
| `BlockTypeSelect` | reference-blocks.tsx | Headless UI `Listbox` | Low | 🔵 |
| `LinkedPageView` search dropdown | reference-blocks.tsx | Headless UI `Combobox` | Medium | 🔵 |
| `InlineDatabaseView` "Link existing" search | reference-blocks.tsx | Headless UI `Combobox` | Low–Med | 🔵 |
| `SubPageBlockView` hover preview card | reference-blocks.tsx | — | — | ⚪ no Headless UI `HoverCard` equivalent exists |
| Floating `CommentCard` (block/selection-anchored) | editor.tsx | native `<dialog>` shell, keep clamp math custom | Medium | 🟡 |

### Sidebar / Layout / Admin

| Component | File | Recommended | Complexity | Verdict |
|---|---|---|---|---|
| "New" create menu | sidebar.tsx | Headless UI `Menu` | Medium | 🔵 |
| User account menu (footer) | sidebar.tsx | Headless UI `Menu` | Medium | 🔵 |
| Collapsed-rail "Favorites" flyout | sidebar.tsx | — | — | ⚪ matches precedent |
| Collapsed-rail hover labels (3rd tooltip variant) | sidebar.tsx | shared Tooltip | Low | 🟡 |
| "N more" pages popup | page-tree.tsx | — | — | ⚪ matches precedent |
| Draft badge (hardcoded hex) | page-tree.tsx | shared `Badge` semantic variant | Low | 🟡 |
| Section header expand/collapse (4 files) | favorites/private/recently-visited-section.tsx, sidebar.tsx | Headless UI `Disclosure` (keep grid-rows CSS for animation) | Medium | 🔵 |
| "N more" flyouts (3 files) | favorites/private/recently-visited-section.tsx | — | — | ⚪ matches precedent |
| Flyout header hardcoded gradient (5×) | all flyout files | theme-token gradient | Low | 🟡 |
| Workspace switcher dropdown | workspace-switcher.tsx | Headless UI `Menu`/`Listbox` | Medium | 🔵 |
| Chevron/checkmark raw SVG icons | workspace-switcher.tsx | lucide-react | Low | 🟡 |
| Mobile sidebar drawer (2 near-dup files) | workspace-shell.tsx, admin-shell.tsx | reuse `Sheet` (native `<dialog>`) | Medium | 🔴 |
| Admin user menu (footer, exact dup of sidebar's) | admin-sidebar.tsx | Headless UI `Menu`, share one component | Medium | 🔵 |
| Nav icons (~10 raw SVG) | admin-sidebar.tsx | lucide-react | Low–Medium | 🟡 |

### Settings / Orbit admin

| Component | File | Recommended | Complexity | Verdict |
|---|---|---|---|---|
| `TimezoneDropdown` | profile-section.tsx | Headless UI `Combobox` w/ `anchor` | Medium | 🔵 (centerpiece finding — ~50 LOC deleted) |
| `SettingsShell` modal wrapper | settings-shell.tsx | native `<dialog>` (existing `Dialog`) | Medium | 🔴 |
| Settings search dropdown | settings-top-bar.tsx | Headless UI `Combobox` | Low–Medium | 🔵 |
| Avatar hover card | settings-top-bar.tsx | add `focus-within:` or Headless UI `Popover` | Low | 🟡 |
| `ChevronSelect` (default page access) | workspace-general-section.tsx | reuse existing `Select`/`RoleSelect` | Low | 🔵 |
| `SeedTemplatesButton` re-seed confirm | seed-templates-button.tsx | `ConfirmDialog` | Low | ✅ |
| "New category" modal | categories-manager.tsx | native `Dialog` | Low–Medium | ✅ |
| `TemplateDeleteButton` confirm | template-delete-button.tsx | `ConfirmDialog`/`AlertDialog` | Low | ✅ |
| `TemplatePreviewButton` modal | template-preview-modal.tsx | native `Dialog` | Medium | ✅ |
| `UserBanForm` (no confirmation today) | user-actions.tsx | wrap in `ConfirmDialog`/`AlertDialog` | Low–Medium | ✅ |
| `AuditActionPill` | audit-action-pill.tsx | shared `Badge` | Low | 🟡 |
| `WorkspaceIconPicker` / `TemplateForm` icon flyout | workspace-general-section.tsx, template-form.tsx | — | — | ⚪ matches precedent (cross-component z-index) |
| `CategoriesManager` icon grid | categories-manager.tsx | none — already optimal | — | ⚪ plain button grid, no overlay involved |
| `PaginationControls` | pagination-controls.tsx | none — already correct | — | ⚪ deliberately server-driven `<Link>` nav |
| `ThemeToggle` | theme-toggle.tsx | none — already correct | — | ⚪ native fieldset/button segmented control |

### Pages / Workspace / Templates

| Component | File(s) | Recommended | Complexity | Verdict |
|---|---|---|---|---|
| Hand-rolled hover tooltip (dup ×~10 files) | copy-link-button, favorite-button, new-page-button, emoji-grid-picker, share-panel, template board/gallery/calendar/table-view, template-page-client | shared `Tooltip` | Medium | 🟡 |
| Action menu (page-actions, column-header "⋯") | page-actions-menu.tsx, template-table-view.tsx | Headless UI `Menu` | Medium | 🔵 |
| `SelectField` | share-panel.tsx | native `<select>` (simple enough) | Low | 🔴 |
| `GeneralAccessControl` select | share-panel.tsx | Headless UI `Listbox` | Medium | 🔵 |
| Anchored share popover | share-button.tsx, workspace-share-button.tsx | Headless UI `Popover`/native Popover API | Medium | 🔵 |
| Centered modals (4 files) | invite-members-modal, save-as-template-modal, template-gallery-modal, template-page-client `CoverPicker` | native `<dialog>`+`showModal()` | Low–Medium each | ✅ |
| "Delete permanently?" modal | trash-banner.tsx | `AlertDialog` | Low | ✅ |
| Icon/Emoji picker composite | icon-picker.tsx, emoji-grid-picker.tsx | Headless UI `Popover` + `Tab` | High | 🔵 |
| Comment Open/Resolved tabs | page-comment-button.tsx | Headless UI `Tab` | Low | 🔵 |
| Gantt scale switch | template-gantt-view.tsx | native buttons + `aria-pressed` (not Tab — it's a value toggle) | Low | 🔴 |
| Personal/Teamspace, question-step "radio" button lists | new-workspace-form.tsx, workspace-setup.tsx | native `<input type=radio>` | Low–Medium | 🔴 |
| Filter/Sort/Properties toolbar popovers | template-page-client.tsx | Headless UI `Popover` | Medium–High | 🔵 |
| Calendar "+N more" overflow popup | template-calendar-view.tsx | — | — | ⚪ cursor-anchored, no DOM trigger |
| Gantt bar drag/resize | template-gantt-view.tsx | — | — | ⚪ no primitive for edge-resize+move |
| Board/Gallery/Calendar DnD | template-board/gallery/calendar-view.tsx | — | — | ⚪ dnd-kit, no native/Headless equivalent |
| Draft/Privacy pills (hardcoded hex) | page-draft-pill.tsx, page-privacy-pill.tsx | daisy semantic badge tokens | Low | 🟡 |
| `home-favorites-section` unfavorite tooltip | home-favorites-section.tsx | shared `Tooltip` | Low | 🟡 |

### Notifications / Search / Onboarding / Landing / Auth

| Component | File | Recommended | Complexity | Verdict |
|---|---|---|---|---|
| Collapsed-sidebar bell tooltip | notification-bell.tsx | daisy `tooltip` | Low | 🟡 |
| Unread badge pill | notification-bell.tsx | none needed, or `Badge` | Low | ✅ optional |
| Row hover actions tooltip | notification-card.tsx | — | — | ⚪ needs scroll-dismiss inside its own scroll container |
| Toast delivery pipeline | notification-provider.tsx | consolidate onto `sonner` (`toast.custom()`) | Medium | 🔴 |
| Toast card | notification-toast.tsx | fold into sonner migration | Medium | 🔴 |
| Filter dropdowns (Type/Date/Location/Author/Sort) | search-dialog.tsx `FilterChip` | Headless UI `Listbox` (reuse `select.tsx`) | Medium | 🔵 |
| Search dialog modal shell | search-dialog.tsx | native `<dialog>` | High | 🔴 |
| Search loading spinner | search-dialog.tsx | daisy `loading loading-spinner` | Low | ✅ |
| Search result type pill | search-dialog.tsx | `Badge` | Low | ✅ optional |
| Dismiss-hint tooltip | hint.tsx | shared daisy `tooltip` | Low | 🟡 |
| Onboarding walkthrough spotlight | tooltip-tour.tsx | keep positioning custom; **fix shadow + hardcoded-hex violations** | — | ⚪ target-anchored spotlight has no equivalent |
| Mobile nav toggle | mobile-nav.tsx | lucide `Menu`/`X` icons; optional `Disclosure` for `aria-expanded` | Low | 🔵 |
| Sign-out button tooltip | sign-out-button.tsx | shared daisy `tooltip` | Low | 🟡 |
| `ScrollReveal`/`SmoothScroll` | landing/*.tsx | none — no dropdown/menu/modal pattern present | — | ✅ no action |

**`components/ui/*` primitives spot-checked via usage (not full audit, informational):**
- `command.tsx` (cmdk) — **zero consumers anywhere**, dead code; the real search UI (`search-dialog.tsx`) is 100% hand-rolled and never imports it. Decide: delete, or keep for a future quick-action palette (fix its `@phosphor-icons/react` import either way).
- `tabs.tsx` — hand-rolled, 3 real consumers (`bookmark-block.tsx`, `media-blocks.tsx`, `cell-editor.tsx`); Headless UI `TabGroup` rejection already documented and confirmed still correct (index- vs value-based mismatch).
- `sonner.tsx` — actively used (10+ call sites); daisy has no promise/queue/stacking toast API, correctly kept. Its 5 status icons are `@phosphor-icons/react` — swap to lucide (`CheckCircle2`, `Info`, `AlertTriangle`, `XCircle`, `LoaderCircle`).
- `pagination.tsx` — **zero current consumers**, also phosphor-icons. Fix icons when it gets a real usage.
- `breadcrumb.tsx` — one consumer (`reference-blocks.tsx`), phosphor-icons (`CaretRightIcon`, `DotsThreeIcon` → lucide `ChevronRight`, `MoreHorizontal`), otherwise structurally sound native `<nav>/<ol>/<li>`.

---

## Grouped by migration priority

### ✅ Ready to migrate (~20 items)
Straight swaps onto already-adopted primitives (`AlertDialog`, `Dialog`, `Sheet`, daisy classes, shared `Checkbox`/`Badge`) with no new dependency and no ambiguous design decision: `SeedTemplatesButton` confirm, `CategoriesManager` new-category modal, `TemplateDeleteButton` confirm, `TemplatePreviewButton` modal, `UserBanForm` confirmation wrap, the 4 centered-modal files (invite-members, save-as-template, template-gallery, cover-picker), `trash-banner.tsx` delete-permanently, table-view row checkbox/select-all, table-view static pills, database-page skeletons, database-page empty-state CTA, entry-properties-panel checkbox toggle, edit-property-panel "Display as" dropdown, search-dialog loading spinner, board/gallery-view tooltip dedup, entry-side-panel/database-page empty states.

### 🟡 Migrate with minor customization (~20 items)
Token/class-level fixes and small wrapper adjustments: tooltip consolidation across ~15 files (X1), hardcoded-hex badges/pills/gradients (X6), missing-spinner buttons (X8), z-index constants (X10), shadow violations (X11), non-lucide icon swaps (X7), `UrlPicker`/`MediaPicker` raw-input→shared-component swaps, `AuditActionPill`→`Badge`, gallery-view color-pill bug fix, `SimpleIconPicker`, floating `CommentCard` shell.

### 🔵 Better with Headless UI (~40 items — the largest bucket)
Every hand-rolled dropdown/menu/select/combobox/popover/tab pattern with a genuine DOM trigger element and no viewport-collision complexity beyond simple flip/clamp: sidebar/admin user+create menus, workspace switcher, page-actions-menu, table-view row menu, toolbar's 6 popovers (`Popover.Group` candidate), `TimezoneDropdown` (centerpiece), settings search dropdown, `ChevronSelect`, `GeneralAccessControl`, share popovers, icon/emoji picker composite, comment Open/Resolved tabs, template-page-client's Filter/Sort/Properties panels, search-dialog `FilterChip`, editor's `ColorPicker`/`EmojiPicker`/`SimpleDropdown`/table-controls context menu/block-handle menu/`BlockTypeSelect`/`LinkedPageView`, database's group-settings pickers, relation/formula/rollup picker family, `PersonEditor`/`RelationEditor`, `FileThumbnailMenu`.

### 🔴 Better with native HTML (~12 items)
Segmented/toggle controls masquerading as independent buttons, and modal shells with no interaction complexity beyond backdrop+Escape: Gantt scale toggle, gallery card-size/entry-open-mode toggles, `CheckboxGlyph`, entry-side-panel (→`Sheet`), `SettingsShell` (→`Dialog`), mobile sidebar drawers (→`Sheet`), `SelectField`, personal/teamspace + onboarding radio lists, `ImageLightbox`/`EmbedLightbox` shells, notification toast pipeline (→sonner), search-dialog modal shell.

### ⚪ Keep custom (~25 items) — see justification section below

---

## Quick wins (low effort, high value)

Do these first — each is a small, isolated, low-risk change with a clear compliance or bug-fix payoff:

1. **X5 — destructive-action compliance gap.** `trash-banner.tsx`, `seed-templates-button.tsx`, `user-actions.tsx` `UserBanForm` all skip `AlertDialog`/`ConfirmDialog`, a direct Hard Rule 23 violation. Trivial swap, sibling files in the same directories already show the correct pattern.
2. **Gallery-view color-pill rendering bug** (`gallery-view.tsx:236,238`) — hex is interpolated into `className` instead of `style`, likely renders no color at all. This is a functional bug hiding inside a styling audit, not a preference.
3. **`TemplateDeleteButton`** has no Escape-to-close today — migrating to `AlertDialog` fixes a real a11y gap for free while also being the compliance fix from #1's category.
4. **Non-lucide icon swaps** (X7) — `workspace-switcher.tsx`, `mobile-nav.tsx`, `admin-sidebar.tsx`, and the 4 `components/ui/*` phosphor-icons files. Mechanical, zero behavior change.
5. **Hardcoded hex colors** (X6) — Draft badge, 5× flyout gradients, draft/privacy pills. Mechanical token swaps.
6. **Missing mutation spinners** (X8) and **missing empty-state CTAs** (X9) — both are one-line-per-file Hard Rule fixes, no design decisions needed.
7. **`components/ui/command.tsx` / `pagination.tsx` dead-code decision** — zero consumers each; either delete or explicitly park for future use. Costs nothing either way but should be a deliberate call, not silent drift.
8. **The 4 centered-modal files** (invite-members, save-as-template, template-gallery, cover-picker) — straight swap onto the already-proven native-`<dialog>` pattern, each in isolation, no shared risk.

## Medium-complexity migrations

- **`TimezoneDropdown` → Headless UI `Combobox`** (`profile-section.tsx`) — the single highest-value individual conversion found: deletes ~50 lines of `computePos`/scroll/resize/outside-click code for behavior `Combobox`'s `anchor` prop gives for free. Already has a proven in-repo precedent (`select.tsx`).
- **Sidebar/admin user menus + workspace switcher + page-actions-menu → Headless UI `Menu`.** Same shape repeated across ~6 files; migrating them together (shared review, shared testing) is more efficient than one-off.
- **`toolbar.tsx`'s 6-popover family + shared 245-line outside-click listener → `Popover.Group`.** High-leverage single change but must move together — the listener coordinates all 6, so piecemeal migration would break the "close siblings first" behavior.
- **Relation/Formula/Rollup picker family → Headless UI `Popover`+`Combobox`/`Listbox`.** Needs a virtual-reference adapter since these currently take an externally-passed `rect` rather than anchoring to their own trigger — a real but bounded technical task.
- **Icon/Emoji picker composite (`icon-picker.tsx`, `emoji-grid-picker.tsx`) → `Popover` + `Tab`.** Largest single stateful picker audited (3 tabs, upload, drag-and-drop, nested skin-tone sub-popover) — budget accordingly.
- **Notification toast consolidation onto `sonner`.** Two independent bottom-right toast stacks today; needs `toast.custom()` to preserve the richer card content (avatar, snippet, View button) and the progress-bar shrink animation.
- **Search dialog modal shell → native `<dialog>`.** High-value (removes hand-built z-index tiers and a documented `flushSync` navigation-blink workaround) but must preserve custom ↑/↓ list navigation and the `FilterChip` portal layering above the dialog's own top-layer — needs careful manual QA.

## High-risk migrations

- **Search dialog modal shell** (above) — the `flushSync`/`style.display=none` blink-prevention hack is load-bearing and undocumented-elsewhere; regressing it would be a visible, easy-to-miss bug. Needs manual QA on Escape/Ctrl+K interplay specifically, not just a visual check.
- **`toolbar.tsx`'s `Popover.Group` migration** — touches 6 findings at once by design; a partial/sequential migration would leave the shared listener in an inconsistent state (some panels coordinated by the old listener, some by the new group), so this must ship as one unit, not incrementally.
- **`CheckboxGlyph` → native checkbox** (`cell-display.tsx`) — duplicated in `entry-properties-panel.tsx` too; must pixel-match via peer-styling across both call sites simultaneously or the two diverge visually.
- **Notification toast consolidation** — content is rich enough (avatar, snippet, action button) that `toast.custom()` needs a genuinely custom render, not the plain string API; the existing de-dup/seen-id logic also needs re-verification once it moves to sonner's queue.
- **`entry-side-panel.tsx` → `Sheet`** — must verify `CellEditorPopover` (a rect-anchored custom popup) still layers correctly above the sheet's native top-layer once the panel itself becomes a `<dialog>`.

---

## Components that should remain custom — technical justification

Grouped by the concrete reason, per the audit brief's requirement that "no dependency reduction" never be the stated reason:

**Cursor/caret-anchored, no DOM trigger element exists:**
`SlashMenu`, `MentionList` (editor — anchored to a ProseMirror text-caret `clientRect()`, not a DOM ref), `calendar-view.tsx`/`template-calendar-view.tsx` "+N more" overflow popup (anchored to raw `clientX/clientY`), database `<main>` overflow lock (imperative ancestor DOM override, not a widget pattern at all).

**Continuous pointer-drag interaction (move/resize), no primitive models it:**
Gantt bar drag/resize (both `gantt-view.tsx` and `template-gantt-view.tsx`), `table-view.tsx` column resize handle, editor `table-controls.tsx`/`block-handle.tsx` hover-handle tracking (mousemove-driven geometry resolution), `block-handle.tsx`'s drag integration with ProseMirror's own `view.dragging` protocol (a hard technical dependency, not a stylistic choice).

**Drag-and-drop reordering (dnd-kit), no native/Headless UI equivalent exists:**
Board/Gallery/Calendar view drag-and-drop (both live and template variants), sortable option rows (edit-property-panel, group-settings-panel, cell-editor `SelectEditor`).

**Nested/cascading multi-popup coordination with cross-component z-index or Escape-layering contracts:**
The original 7 database overlay files (precedent), extended by this audit to include `edit-property-panel.tsx`'s outer shell, `group-settings-panel.tsx`'s outer shell, `cell-editor.tsx`'s `CellEditorPopover`, `table-view.tsx`'s column-header-menu → property-picker handoff chain, `date-value-editor.tsx`'s `SimpleFlyout`/`TimezoneFlyout` shells, and (in sidebar/settings) the "N more" flyouts + `WorkspaceIconPicker`/`TemplateForm` icon flyouts, all pinned to specific z-indexes relative to `workspace-shell.tsx`'s sidebar wrapper.

**Hover-triggered with viewport-flip collision detection:**
`icon-tooltip.tsx` family (existing precedent), `notification-card.tsx`'s row-action tooltip (needs scroll-dismiss inside its own scroll container — daisy's CSS tooltip would clip), calendar "+N more" popup (hover-intent + collision combination no tier covers together).

**No equivalent primitive exists in Headless UI or native HTML:**
`SubPageBlockView` hover-preview card (Headless UI has no `HoverCard` equivalent — Radix's is gone and nothing replaced its category), zoom/pan inside `ImageLightbox` (cursor-driven wheel-zoom + clamped pointer-drag pan), onboarding `tooltip-tour.tsx`'s target-anchored spotlight overlay (viewport spotlight cutout has no native/daisy/Headless UI primitive — but its `shadow-[var(--shadow-float)]` and hardcoded hex fallback are real rule violations to fix independently of the positioning decision).

**Documented browser/technical limitation:**
`date-value-editor.tsx`'s `TimeInput` (native `<input type=time>` explicitly can't be themed to match the design system — already documented in-file), `date-value-editor.tsx`'s calendar (range-mode selection isn't expressible via a native date input).

**Already-justified precedent, reconfirmed, not re-opened:**
`components/ui/tabs.tsx`'s hand-rolled value-based API (Headless UI `TabGroup`'s index-based contract was evaluated and rejected — still correct), `FileEditor` Tabs in `cell-editor.tsx` (consumer of the above), `CategoriesManager`'s icon grid (already optimal — plain button grid, no overlay involved), `PaginationControls` (deliberately server-driven `<Link>` navigation per its own in-file Hard-Rule-31 comment), `ThemeToggle` (already native fieldset/button segmented control — nothing to migrate).

**Persisted user-data value, out of scope for an interaction-pattern migration:**
Group/option color hex tables (`property-registry.ts`'s `OPTION_COLORS`) — these are literal color IDs persisted per-entry in the database across board/gallery/edit-property/entry-properties/cell-display/cell-editor. A token migration here is a real, separate, larger project (backward-compat with saved `option.color` values), not a component-styling swap.

---

## Recommended implementation order

1. **Quick-wins pass** (above) — destructive-action compliance, the gallery-view color bug, icon/hex/spinner/CTA fixes, dead-code decisions on `command.tsx`/`pagination.tsx`. No design risk, immediate Hard Rule compliance, builds momentum.
2. **Tooltip consolidation (X1)** — touches the most files of any single cross-cutting item; doing it early stops the 3rd tooltip variant from spreading further as other work lands.
3. **`TimezoneDropdown` → Combobox** — highest-value single conversion, already scoped in detail above; do it as the "spike" for the Headless UI `Combobox` pattern the way `button.tsx` was the spike for daisy parity in the main plan, then reuse the learnings for the rest of the Combobox-family items (X3).
4. **Menu-family batch** (sidebar/admin user menus, workspace switcher, page-actions-menu, table-view row menu, `FileThumbnailMenu`, editor's `SimpleDropdown`/`ColorPicker`/block-handle/table-controls menus) — one pattern, many files; batch for shared review once the first 1-2 establish the house style.
5. **`toolbar.tsx`'s `Popover.Group` migration** — do this as its own dedicated unit (per the High-Risk note above) once the Menu-family batch has established confidence in the Headless UI conversion approach generally.
6. **Modal-shell batch** (`SettingsShell`, mobile drawers, `entry-side-panel`, the 4 centered-modal files, `ImageLightbox`/`EmbedLightbox`, `CoverPicker`) — lower risk than the menu/select work since the native-`<dialog>` pattern is already proven twice in the main plan (`notification-panel.tsx`, `page-tree.tsx`'s `MoveToDialog`).
7. **Relation/Formula/Rollup picker family + database group-settings pickers** — the virtual-reference-adapter work is shared across this whole family, so batching amortizes that one-time cost.
8. **Icon/Emoji picker composite** — highest complexity single item; do it after the team has reps on Popover+Tab from steps 4–6, not first.
9. **Search dialog modal shell + notification toast consolidation** — both High-Risk; schedule last, each as its own isolated PR with dedicated manual QA (Escape/Ctrl+K interplay for search; toast content/de-dup for notifications), not bundled with anything else.
10. **z-index constants module + shadow-violation cleanup** — mechanical, can run in parallel with any of the above at any time; not sequenced.

Not scheduled — tracked as explicit "keep custom" per the justification section, revisit only if a stated technical reason changes (e.g. Headless UI ships a `HoverCard` primitive, or a future need for multi-thumb drag emerges).

---

## Converted, 2026-08-04 — sidebar/layout/notifications/search/onboarding/auth batch

Scope: `components/sidebar/{favorites,private,recently-visited}-section.tsx`, `sidebar.tsx`, `page-tree.tsx`; `components/workspace/home-favorites-section.tsx`; `components/layout/{workspace,admin}-shell.tsx`; `components/notifications/{notification-bell,notification-provider,notification-toast}.tsx`; `components/onboarding/hint.tsx`; `components/auth/sign-out-button.tsx`; `components/landing/mobile-nav.tsx`; `components/search/search-dialog.tsx`; `components/ui/{command,pagination,sonner,breadcrumb}.tsx`. `tsc --noEmit` clean.

- **Section-header disclosures** (favorites/private/recently-visited-section.tsx, sidebar.tsx's `SectionLabel`) — converted to Headless UI `Disclosure`/`DisclosureButton`/`DisclosurePanel` (`static` panel), keeping the existing CSS grid-rows height animation untouched. `DisclosureButton` gives real `aria-expanded`/`aria-controls` for free. Caveat: Disclosure has no controlled `open` prop, only `defaultOpen` (read once, at mount) — the three `usePersistedToggle`-backed sections key on a `hydrated` flag to force one remount once the real localStorage value lands post-hydration; `sidebar.tsx`'s "Pages" section additionally has an external force-open path (`onBeforeAdd`, clicking "+" while collapsed) that can leave `aria-expanded` briefly stale until the button is next clicked directly — accepted rather than remounting on every external change, which would reset `PageTree`'s own per-node expand state.
- **Flyout header gradients (4× hardcoded hex)** — `bg-gradient-to-r from-[#0369A1] to-[#38BDF8]` replaced with flat `bg-primary` in `favorites-section.tsx`, `private-section.tsx`, `recently-visited-section.tsx`, `sidebar.tsx`'s `CollapsedFavoritesItem`. Not a theme-token *gradient* (e.g. `from-primary to-info`) — this app's `--color-info` is literally `var(--primary)`, so that gradient would render as a flat color anyway; `bg-primary` says what actually renders. `page-tree.tsx`'s own "N more" popup has the same hardcoded gradient but was explicitly out of scope for this pass (its popups are keep-custom) — still open.
- **`page-tree.tsx` Draft badge** — hardcoded `bg-[#fef9c3] text-[#92400e] dark:bg-[#713f12] dark:text-[#fde68a]` → shared `<Badge variant="outline">` with `border-warning/20 bg-warning/10 text-warning` (`badge.tsx` has no dedicated "warning" variant; composed from its `outline` variant + semantic warning tokens rather than adding one, to stay in scope).
- **Sidebar collapsed-rail hover labels** (nav items, search, new-page button, user avatar, "Favorites" flyout trigger) — the third hand-rolled `group`/`group-hover` tooltip variant replaced with the shared daisy `<Tooltip>`. The header's "Expand/Collapse sidebar" and "Create new…" tooltips still use the portal-based `useHoverTooltip`/`IconTooltip` system — intentionally untouched, out of this item's stated scope.
- **Mobile sidebar drawers** (`workspace-shell.tsx`, `admin-shell.tsx`) — real architecture conflict found and resolved with the user: `Sheet`/`SheetContent` is inherently a native `<dialog>` + `showModal()`, so it can't also serve as the always-in-flow desktop sidebar the old single fixed/translate-x wrapper did without either mounting the sidebar twice (doubling its SSE page-tree stream and fetches for the app's lifetime) or making the desktop sidebar an accidental modal. Resolved via the user-approved option: `useIsMobile()` (existing 768px-breakpoint hook) decides, in JS, which of exactly one wrapper renders — a plain in-flow div on desktop, `Sheet`/`SheetContent(side="left")` on mobile — never both at once. First-paint default is desktop (hook's default state); a `hidden md:block` guard on the desktop branch prevents a flash-of-full-sidebar on an actually-mobile device before the hook's effect runs.
- **Notification toast consolidation** — `notification-provider.tsx`'s hand-rolled 5-toast queue (own array, flat 5s timer) replaced with sonner's `toast.custom()`, rendering the same rich card content via a new presentational-only `NotificationToastCard` (stripped of `notification-toast.tsx`'s old `requestAnimationFrame`/`setTimeout` enter/exit lifecycle, which is now redundant with sonner's own transition). This also fixes a standing Hard-Rule-17 violation ("max one toast visible at a time") — the old provider could stack up to 5 simultaneously visible toasts alongside sonner's own `<Toaster visibleToasts={1}>` in the same corner; now there's one pipeline. De-dup (`seenNotificationIds`) logic is unchanged. **Not verified in a browser — flagged for manual click-through**, specifically: multiple rapid notifications, the View button's routing branches (trash warning / workspace invite / page / fallback-to-panel), and Escape/dismiss behavior now that toasts render through sonner's queue instead of this provider's own array.
- **`hint.tsx`, `sign-out-button.tsx`, `home-favorites-section.tsx`** — portal-based `useHoverTooltip`/`IconTooltip` (hint, sign-out) and one-off `group`/`group-hover` div (home-favorites) tooltips → shared daisy `<Tooltip>`.
- **`mobile-nav.tsx`** — raw inline hamburger/close `<svg>` → lucide `Menu`/`X`; toggle button gained `aria-expanded`/`aria-controls` (plain attributes, not `Disclosure` — simpler given the state was already local `useState`).
- **`search-dialog.tsx`** (limited scope — modal shell untouched) — `FilterChip`'s hand-rolled portal dropdown → Headless UI `Listbox` (`anchor`, `z-[820]` preserved to stay above the dialog's own `z-[810]`/backdrop `z-[800]`); the two `animate-spin` loading indicators → daisyUI `loading loading-spinner loading-sm`; the result-type pill → shared `<Badge variant="secondary">`.
- **`command.tsx`, `pagination.tsx`** — confirmed zero consumers anywhere in the app (grep). Decision: **kept**, not deleted — both are complete, correctly-wired primitives (cmdk command palette; `<Link>`-based pagination) worth keeping as a starting point if a future feature needs them, per the audit's own framing. Marked with an in-file comment rather than left as silent dead code. `@phosphor-icons/react` → `lucide-react` regardless (`Search`/`Check` for command; `ChevronLeft`/`ChevronRight`/`MoreHorizontal` for pagination).
- **`sonner.tsx`, `breadcrumb.tsx`** — `@phosphor-icons/react` → `lucide-react` (`CheckCircle2`/`Info`/`AlertTriangle`/`XCircle`/`LoaderCircle`; `ChevronRight`/`MoreHorizontal`). Dropped phosphor's `weight="fill"` prop (lucide has no fill-weight variant) rather than approximating with `fill="currentColor"`, matching how the rest of the app already uses plain stroke lucide icons.

**Still open from this same audit, not attempted here:** `admin-sidebar.tsx`'s nav icons/menus (already partially converted in a prior, separate batch per git status — not re-verified here), `search-dialog.tsx`'s modal shell (flagged high-risk, dedicated solo pass), `tooltip-tour.tsx`'s shadow/hardcoded-color fixes, and everything else this audit's tables mark 🔵/🔴/🟡 outside the file list above.
