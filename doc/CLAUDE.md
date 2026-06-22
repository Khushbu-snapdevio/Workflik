# CLAUDE.md — WorkFlik

Guidance for Claude Code and all contributors working in this repository. This is the **authoritative short-form index**; detailed references live under [doc/](doc/) and [docs/](docs/).

---

## Project Overview

WorkFlik is an opinionated team workspace — "Notion's core, pre-assembled" — for small teams (3–15 people). Everything is a **block**; pages nest unlimitedly; databases are pages where each entry is itself a page.

**Status: active development.** The codebase is live and being iterated on. Keep these docs in sync with every meaningful change (Rule 1).

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

The app font is **Geist** (sans) and **Geist Mono** (mono), loaded via `next/font/google` in `app/layout.tsx` and exposed as CSS variables `--font-sans` / `--font-mono`. Never reference a font family by name in component code — always use the Tailwind utility classes.

```
✅  font-sans   font-mono   (Tailwind classes → var(--font-sans) / var(--font-mono))
❌  font-['Geist']  fontFamily: 'Geist, ...'  style={{ fontFamily: '...' }}
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

---

> **When you introduce a new subsystem, rule, or invariant, add it here and to its detailed doc.** This file is the map; the territory is in [docs/](docs/).
