# Component Classification — daisyUI / Headless UI / Custom — 2026-08-04

**Companion to [daisyui-migration-plan.md](./daisyui-migration-plan.md) and [daisyui-migration-audit-full-codebase.md](./daisyui-migration-audit-full-codebase.md).** Those docs track recommendations and migration progress. This doc is a snapshot of **current actual state**: for every component file touched by the daisyUI/Headless UI migration, which approach it uses today, verified against the code (import graph + hand-read of hand-rolled overlay logic), not against the plan's recommendations.

## Method

- **Headless UI** — file imports from `@headlessui/react` and uses it for behavior (`Menu`, `Listbox`, `Combobox`, `Popover`, `Disclosure`, `TabGroup`, `Radio`/`RadioGroup`).
- **daisyUI / native** — native `<dialog>` (via `ui/dialog.tsx`/`ui/sheet.tsx`/`ConfirmDialog`), daisy CSS classes, native `<input type=radio/checkbox>`, or purely presentational with no overlay/dropdown logic of its own.
- **Custom** — no `@headlessui/react`, no native `<dialog>` — hand-rolled `createPortal`, `getBoundingClientRect`-based positioning, manual mousedown/outside-click listeners, or raw pointer-drag math.
- **Mixed** — combines more than one of the above for different parts of the same file (e.g. a native `<dialog>` modal alongside a hand-rolled `createPortal` tooltip).

---

## Headless UI (`@headlessui/react`)

| File | Primitive(s) used |
|---|---|
| admin-sidebar.tsx | `Menu` |
| workspace-switcher.tsx | `Menu` |
| sidebar.tsx | `Disclosure`, `Menu` |
| favorites-section.tsx, private-section.tsx, recently-visited-section.tsx | `Disclosure` |
| search-dialog.tsx | `Listbox`, `Portal` |
| board-view.tsx | `Popover`, `Radio`/`RadioGroup` |
| cell-editor.tsx | `Combobox`, `Menu` |
| change-property-type-picker.tsx, rollup-config-picker.tsx | `Popover`, `Listbox` |
| edit-property-panel.tsx | `Listbox`, `Popover` |
| filter-bar.tsx | `Listbox` |
| formula-config-picker.tsx | `Popover` |
| group-settings-panel.tsx | `Listbox`, `Combobox` |
| relation-database-picker.tsx | `Popover`, `Combobox` |
| rect-popover-anchor.tsx | `PopoverButton` (anchor helper) |
| toolbar.tsx | `Menu`, `Popover` |
| block-handle.tsx, table-controls.tsx | `Menu` |
| comment-card.tsx | `Menu`, `Popover` |
| inline-toolbar.tsx | `Popover` |
| reference-blocks.tsx | `Listbox` |
| emoji-grid-picker.tsx, share-button.tsx | `Popover` |
| icon-picker.tsx | `Popover`, `TabGroup` |
| page-actions-menu.tsx | `Menu` |
| page-comment-button.tsx | `TabGroup` |
| share-panel.tsx | `Listbox` |
| profile-section.tsx, settings-top-bar.tsx | `Combobox` |
| workspace-share-button.tsx | `Popover` |
| ui/select.tsx | `Listbox` (shared primitive) |

## daisyUI / native HTML

Native `<dialog>` (via `ui/dialog.tsx`/`ui/sheet.tsx`/`ConfirmDialog`), daisy CSS classes, native `<input type=radio/checkbox>`, or purely presentational — no hand-rolled positioning JS.

| File | Note |
|---|---|
| sign-out-button.tsx, notification-bell.tsx, hint.tsx, home-favorites-section.tsx | daisy `Tooltip` only |
| database-page.tsx | orchestration + skeletons, no overlay logic |
| admin-shell.tsx, workspace-shell.tsx | `Sheet` (native `<dialog>`) mobile drawer |
| notification-panel.tsx | `Sheet` + `AlertDialog` |
| notification-provider.tsx, notification-toast.tsx | sonner `toast.custom()` |
| seed-templates-button.tsx, template-delete-button.tsx, user-actions.tsx, trash-banner.tsx | `ConfirmDialog` only |
| template-preview-modal.tsx, settings-shell.tsx, save-as-template-modal.tsx, template-gallery-modal.tsx, invite-members-modal.tsx | native `Dialog` only |
| new-workspace-form.tsx | native radio inputs |
| workspace-setup.tsx | native radio inputs + `ConfirmDialog`, no custom JS overlay logic |
| ui/breadcrumb.tsx, ui/pagination.tsx | presentational, no JS state |
| ui/sheet.tsx | native `<dialog>` primitive itself |
| ui/command.tsx | native `Dialog` shell + `cmdk` (unused elsewhere) |
| ui/sonner.tsx | thin wrapper around sonner |

## Custom (hand-rolled JS)

No `@headlessui/react`, no native `<dialog>` — `createPortal`, `getBoundingClientRect`, manual mousedown/outside-click listeners, or raw pointer-drag math.

| File | Pattern |
|---|---|
| cell-display.tsx, entry-properties-panel.tsx | `createPortal` + rect-snapshotted hover tooltips |
| page-draft-pill.tsx, page-privacy-pill.tsx, audit-action-pill.tsx, new-page-button.tsx | `createPortal` + `useHoverTooltip` |
| tooltip-tour.tsx | `createPortal` spotlight overlay, rect-based positioning |
| mobile-nav.tsx | `useState`-toggled absolute-positioned menu |
| media-blocks.tsx | mousedown outside-click "expand" panel |

## Mixed (native/daisy for modals + custom for the rest)

| File | Split |
|---|---|
| entry-side-panel.tsx | `Sheet`/`ConfirmDialog` native; `CellEditorPopover` + tooltip rect-positioned |
| gallery-view.tsx, table-view.tsx, page-tree.tsx | `ConfirmDialog`/`Dialog` native; dnd-kit drag + `createPortal` context menus custom |
| gantt-view.tsx, template-gantt-view.tsx | native join/radio scale toggle + `ConfirmDialog`; Gantt bar drag is hand-rolled pointer math |
| editor.tsx | native `<dialog>` shell; comment-popup position is hand-rolled clamp math |
| bookmark-block.tsx | native `Dialog` for lightbox; mousedown-listener "expanded" popup + portal tooltip |
| categories-manager.tsx | native `Dialog`/`ConfirmDialog`; portal tooltip |
| workspace-general-section.tsx | native `AlertDialog`; custom portal icon picker |
| template-page-client.tsx, template-board-view.tsx, template-gallery-view.tsx | native `Dialog`/`ConfirmDialog`; heavy dnd-kit + mousedown-listener dropdowns/tooltips |

---

## Totals

~33 files on Headless UI, ~25 on plain daisy/native, ~5 purely custom, ~11 mixed. The `custom`/`mixed` bucket is largely the audit's documented "keep custom" cases (drag-and-drop, cursor-anchored popups, cascading z-index coordination) — see [daisyui-migration-audit-full-codebase.md](./daisyui-migration-audit-full-codebase.md) for the per-file technical justification.
