# UI Design System

This document is the **single source of truth** for Pagevo's visual design — tokens, component specs, layout patterns, and accessibility rules. Every UI component and page must be implemented from this reference. Read it before building any frontend feature.

## Architecture

```text
daisyUI     → primary component styling + all colour tokens
Headless UI → interactive behaviour (focus, keyboard, ARIA, open state)
Floating UI → collision-aware positioning for anchored popups
Native HTML → behaviour the browser already provides
Tailwind    → layout, responsive behaviour, genuinely custom details
```

**Stack:** daisyUI 5 · Headless UI · Floating UI (`@floating-ui/react`, wrapped in `lib/ui/use-anchor-position.ts`) · native HTML (`<dialog>`, Popover API, `<details>`, form controls) · Tailwind CSS v4 · Lucide React (icons) · Inter (UI font) · JetBrains Mono (code font).

> **Radix UI and shadcn/ui are permanently out of the stack**, along with `class-variance-authority`. Zero `@radix-ui/*` / `radix-ui` / `shadcn` imports remain; there is no `components.json`. Do not reintroduce any of them for a new component or a bug fix. Pick an implementation in this order: **native HTML → daisyUI → Headless UI → Floating UI → hand-rolled**. See [daisyui-migration-plan.md](daisyui-migration-plan.md).

> **Light and dark mode both ship.** Colours come from daisyUI's stock `light`/`dark` themes, configured once in `app/globals.css` and switched by `next-themes` via `class` + `data-theme` on `<html>`. The only vocabulary is daisy's: `bg-base-100/200/300`, `text-base-content` (with `/70`, `/50` for secondary and tertiary), `border-base-300`, `bg-primary`, `text-error` / `success` / `warning` / `info`. The old shadcn token names (`bg-background`, `text-foreground`, `border-border`, `--muted`, `--card`, `--popover`, `--ring`) are **gone** — reintroducing one is a defect. See the UI & Design System rules in [../CLAUDE.md](../CLAUDE.md), which take precedence over this file wherever the two disagree.

---

## Design Principles

1. **Content first.** The editor and page content own the viewport. Sidebar, toolbars, and headers shrink to the minimum viable footprint.
2. **One surface at a time.** No stacked modals or nested drawers. One overlay is dominant; everything else recedes.
3. **Instant feedback.** Every user action gets a visual response in one frame — a state change, spinner, or disabled state. Silent latency is a bug.
4. **Earn complexity.** Advanced controls (database filters, permission matrix, block picker) are hidden until needed. Progressive disclosure over feature exposure.
5. **Keyboard-first.** Every action reachable by mouse is reachable by keyboard. No exceptions.
6. **Consistent rhythm.** Spacing, type, and color follow a small token set. New raw values are not introduced without adding them here first.

---

## Color System

Every colour is a daisyUI theme token, resolved per theme from daisy's stock
`light`/`dark`. **Never write a literal hex or a Tailwind palette class**
(`bg-violet-600`, `text-slate-500`, …) in component code — those bypass the
theme entirely and will not flip in dark mode.

Every class below resolves to its light or dark value automatically, so a
component written against these needs no dark-mode branch of its own.

### Neutral / Surface

| Class | Role | Usage |
|---|---|---|
| `bg-base-200` | App canvas | Behind sidebar and content; also hover rows and code-block backgrounds |
| `bg-base-100` | Raised surface | Cards, modals, sidebar, page content, popover panels |
| `bg-base-300` | Muted fill | Skeleton loaders, divider bands, disabled fills |
| `border-base-300` | Every border | Inputs, cards, panels, table rules, separators |

daisy gives three neutral surfaces, not five. If a design calls for a fourth
step, reach for an alpha (`bg-base-300/50`) rather than inventing a token.

### Text

| Class | Role | Usage |
|---|---|---|
| `text-base-content` | Primary | Body text, headings, form labels |
| `text-base-content/70` | Secondary | Metadata, timestamps, secondary labels |
| `text-base-content/50` | Tertiary | Placeholders, empty-state copy, resting icons |
| `text-base-content/30` | Disabled | Disabled control text |
| `text-primary-content` | On accent | Text on a `bg-primary` surface |
| `text-primary` | Link / accent text | Inline hyperlinks, active nav labels |

⚠️ Contrast: `/70` and below are for **supporting** text. Do not put an alpha
on body copy or on anything that must clear WCAG AA on its own.

### Brand / Accent

| Class | Usage |
|---|---|
| `bg-primary` / `text-primary` | Primary buttons, active nav, focus rings |
| `bg-primary/10` | Selected row, active sidebar item, mention chip |
| `border-primary` | Focused input border |
| `ring-primary/50` | Focus ring on buttons and interactive surfaces |
| `ring-primary/30` | Focus ring on form controls (checkbox, radio, switch, slider) |

Hover and active states come from daisy's own `btn-*` classes — don't hand-roll
`bg-primary-700`-style steps, which don't exist in this theme.

### Semantic Colors

| Role | Subtle background | Text | Border | Solid action |
|---|---|---|---|---|
| **Success** | `bg-success/10` | `text-success` | `border-success/30` | `btn-success` |
| **Warning** | `bg-warning/10` | `text-warning` | `border-warning/30` | `btn-warning` |
| **Destructive** | `bg-error/10` | `text-error` | `border-error/30` | `btn-error` |
| **Info** | `bg-info/10` | `text-info` | `border-info/30` | `btn-info` |

`<Button variant="destructive">` is the **alpha-tinted** treatment;
`variant="destructive-solid"` is daisy's `btn-error` and is what
`AlertDialogAction` uses, so a delete confirmation reads as the dialog's
primary affordance.

### Editor-Specific Colors

Everything here is theme-driven except the two literal cases noted.

| Purpose | Value | Notes |
|---|---|---|
| Multi-block selection | `bg-primary/10` | Applied to the selected block wrapper |
| @mention chip | `bg-primary/10 text-primary rounded px-0.5` | Inline |
| Comment anchor | `--comment-accent` / `--comment-tint` (`globals.css`) | Deliberately violet and **independent of the theme's primary hue**, so an annotated range never reads as a link. Re-declared in `.dark`. |
| Syntax highlighting | `--syntax-*` (`globals.css`) | Derived from daisy vars via `color-mix()`, so they re-resolve per theme — no hand-authored hex, no dark-mode duplicate list |
| Text highlight (user-applied) | `#fde047` | A literal, set through TipTap's `Highlight` mark from `inline-toolbar.tsx`. It is **user content**, not chrome — it must survive a theme switch unchanged, so it is correctly not a token. |
| Scrims / overlays | `bg-black/10`, `bg-black/40` | Dimming layers are neutral black at low alpha in both themes by design |


---

## Typography

**UI font:** `Inter` via `next/font/google`. Fallback: `ui-sans-serif, system-ui, -apple-system, sans-serif`.
**Code font:** `JetBrains Mono` via `next/font/google`. Fallback: `ui-monospace, 'Cascadia Code', monospace`.

### UI Scale

| Name | Tailwind | Size | Line-height | Weight | Usage |
|---|---|---|---|---|---|
| `xs` | `text-xs` | 12px | 16px | 400 | Timestamps, tooltip text, metadata tags |
| `sm` | `text-sm` | 14px | 20px | 400 | Body, sidebar items, form inputs |
| `sm-medium` | `text-sm font-medium` | 14px | 20px | 500 | Button labels, nav items, tab labels |
| `base` | `text-base` | 16px | 24px | 400 | Editor paragraph body |
| `base-medium` | `text-base font-medium` | 16px | 24px | 500 | Dialog section labels |
| `lg` | `text-lg font-semibold` | 18px | 28px | 600 | Settings section headings, panel headers |
| `xl` | `text-xl font-semibold` | 20px | 28px | 600 | Onboarding step titles |
| `2xl` | `text-2xl font-bold` | 24px | 32px | 700 | Page title (H1) in Small Text mode |
| `4xl` | `text-4xl font-bold` | 36px | 40px | 700 | Page title (H1) in default / Full Width mode |

### Editor Heading Scale (inside TipTap — not UI chrome)

| Block type | Tailwind | Size | Weight |
|---|---|---|---|
| H1 (page title — default) | `text-4xl font-bold` | 36px | 700 |
| H1 (small text mode) | `text-2xl font-bold` | 24px | 700 |
| H2 | `text-2xl font-semibold` | 24px | 600 |
| H3 | `text-xl font-semibold` | 20px | 600 |
| Body paragraph | `text-base leading-7` | 16px | 400 |
| Blockquote | `text-base italic text-base-content/70 border-l-4 border-base-300 pl-4` | 16px | 400 |
| Inline code | `font-mono text-sm bg-base-200 rounded px-1 py-0.5` | 14px | 400 |
| Code block | `font-mono text-sm` on `bg-base-content text-base-100` | 14px | 400 |
| Callout | `text-base` inside `bg-base-200 rounded-lg p-4` | 16px | 400 |

---

## Spacing Scale

Tailwind's default 4 px base scale. Do not introduce non-Tailwind spacing values.

| Token | px | Common usage |
|---|---|---|
| `space-0.5` | 2px | Tight icon nudges |
| `space-1` | 4px | Icon-to-label gap |
| `space-2` | 8px | Chip / badge padding |
| `space-3` | 12px | Input padding, list item py |
| `space-4` | 16px | Standard component padding, card padding |
| `space-5` | 20px | Gap between fields in a form |
| `space-6` | 24px | Between major sections within a panel |
| `space-8` | 32px | Between grouped sections |
| `space-12` | 48px | Page title top padding, content top padding |
| `space-16` | 64px | Top margin on sign-in / onboarding cards |

---

## Layout & App Shell

### Overall Shell Structure

```
┌──────────────────────────────────────────────────────────────────┐
│  Sidebar (240px default, 200–480px range)  │  Main content area  │
│                                            │                     │
│  [Workspace Switcher]                      │  Breadcrumb bar     │
│  ─────────────────────────────────────     │  ─────────────────  │
│  Search            Ctrl+K                  │                     │
│  Notifications     Ctrl+Shift+N            │  Page content       │
│  Settings                                  │  (editor / db view) │
│  New Page          Ctrl+N                  │                     │
│  ─────────────────────────────────────     │                     │
│  FAVORITES                                 │                     │
│    ★ Marketing Strategy                    │                     │
│  ─────────────────────────────────────     │                     │
│  PAGES                                     │                     │
│    ▶ Engineering                           │                     │
│      ▼ Backend                             │                     │
│          Auth module                       │                     │
│    Product Roadmap                         │                     │
│  ─────────────────────────────────────     │                     │
│  Trash                                     │                     │
│  ─────────────────────────────────────     │                     │
│  [Avatar]  Alice Chen              [⋯]    │                     │
└────────────────────────────────────────────┴─────────────────────┘
```

### Shell Dimensions

| Dimension | Value | Tailwind |
|---|---|---|
| Sidebar default width | 240px | `w-60` |
| Sidebar min width | 200px | `min-w-[200px]` |
| Sidebar max width | 480px | `max-w-[480px]` |
| Sidebar background | white + right border | `bg-base-100 border-r border-base-300` |
| Content max-width (normal) | 900px | `max-w-[900px] mx-auto` |
| Content max-width (full width page) | 100% | `max-w-full` |
| Content horizontal padding | 96px | `px-24` |
| Content top padding | 48px | `pt-12` |

### Sidebar Item Heights

| Element | Height | Classes |
|---|---|---|
| Section label (FAVORITES, PAGES) | 24px | `py-1 px-3 text-xs font-semibold text-base-content/50 uppercase tracking-wide` |
| Quick action button | 32px | `h-8 px-3 flex items-center gap-2.5 text-sm text-base-content` |
| Page tree node | 32px | `h-8 px-2 flex items-center gap-1.5 text-sm` |
| Workspace switcher row | 44px | `h-11 px-3 flex items-center gap-2` |
| Account row | 40px | `h-10 px-3 flex items-center gap-2` |

### Sidebar States

- **Hover row:** `rounded-md bg-base-200 transition-colors duration-150`
- **Active (current page):** `rounded-md bg-primary/10 text-primary font-medium`
- **Depth indent:** each nesting level adds `pl-4` (16px)
- **Hover actions (+ and ⋯):** `opacity-0 group-hover:opacity-100 transition-opacity duration-100`

### Collapsed Sidebar

When `sidebar_collapsed = true`:
- Sidebar collapses to width `0`; a `4px` hover-trigger strip stays at the left edge
- Hovering the strip expands the sidebar to 240px as a floating overlay: `fixed left-0 top-0 h-full w-60 shadow-xl z-sidebar`
- `Ctrl+\` / `Cmd+\` toggles, `transition-[width] duration-[250ms] ease-in-out`

---

## Elevation & Shadows

| Level | Tailwind | Usage |
|---|---|---|
| Flat | `shadow-none` | Sidebar, inputs, inline elements |
| Raised | `shadow-sm` | Gallery cards, member hover cards |
| Floating | `shadow-md` | Dropdown menus, popovers, slash command menu |
| Modal | `shadow-xl` | Dialogs, Settings modal |
| Sheet | `shadow-xl` | Notification center, side panels |
| Toast | `shadow-lg` | Toast notifications |

---

## Z-Index Scale

Define in `tailwind.config.ts` under `extend.zIndex`:

| Name | Value | Usage |
|---|---|---|
| `z-sidebar` | 10 | Sidebar (above static page content) |
| `z-header` | 20 | Breadcrumb bar, sticky table header |
| `z-dropdown` | 30 | Dropdown menus, slash command, popovers |
| `z-tooltip` | 40 | Tooltips |
| `z-modal` | 50 | Dialogs and Settings modal |
| `z-sheet` | 50 | Side sheets (notification center) |
| `z-toast` | 60 | Toast notifications (top of everything) |

---

## Motion & Animation

All transitions respect `prefers-reduced-motion`. Use `motion-safe:` Tailwind prefix or detect via `useReducedMotion()` and skip animations entirely.

### Duration Tokens

| Name | Duration | Easing | Usage |
|---|---|---|---|
| Micro | 100ms | ease-out | Icon swap, badge counter update |
| Fast | 150ms | ease-out | Hover color, button press |
| Standard | 200ms | ease-in-out | Dropdown open, tooltip, checkbox |
| Moderate | 250ms | ease-in-out | Sidebar collapse, sheet slide |
| Slow | 300ms | ease-out | Modal enter, page skeleton |

### Specific Animations

| Interaction | Classes |
|---|---|
| Dropdown / popover open | `animate-in fade-in zoom-in-95 duration-200` |
| Dropdown / popover close | `animate-out fade-out zoom-out-95 duration-150` |
| Sheet slide in (right) | `animate-in slide-in-from-right duration-[250ms]` |
| Sheet slide out | `animate-out slide-out-to-right duration-[250ms]` |
| Toast appear | `animate-in slide-in-from-bottom-4 fade-in duration-300` |
| Toast dismiss | `animate-out slide-out-to-bottom-4 fade-out duration-200` |
| Sidebar collapse/expand | `transition-[width] duration-[250ms] ease-in-out` |
| Skeleton pulse | `animate-pulse` on `bg-base-300` elements |
| Spinner | `animate-spin` |
| Modal enter | `animate-in fade-in zoom-in-95 duration-300` on overlay + content |
| Hover row | `transition-colors duration-150` |

---

## Iconography

**Library:** [Lucide React](https://lucide.dev) — tree-shakeable, consistent stroke weight.

### Icon Sizes

| Size token | px | Tailwind | Usage |
|---|---|---|---|
| Inline | 12px | `size-3` | Lock badge inline in text, breadcrumb separator |
| Small | 16px | `size-4` | Input prefix icons, inline toolbar |
| Default | 20px | `size-5` | Sidebar nav icons, block drag handle, popover items |
| Large | 24px | `size-6` | Empty state illustrations (use sparingly) |

### Standard Icon Map

Establish these names — do not substitute with different icons for the same concept.

| Purpose | Lucide component |
|---|---|
| New page | `FilePlus` |
| Search | `Search` |
| Notifications | `Bell` |
| Settings | `Settings` |
| Workspace switcher | `ChevronsUpDown` |
| Favorite (empty) | `Star` |
| Favorite (filled) | `Star` with `fill="currentColor"` |
| Trash | `Trash2` |
| Permanent delete | `Trash` |
| Duplicate | `Copy` |
| Move page | `CornerUpRight` |
| Share / Permissions | `Share2` |
| Lock | `Lock` |
| Unlock | `Unlock` |
| More options (⋯) | `Ellipsis` |
| Add / Plus | `Plus` |
| Close / Dismiss | `X` |
| Expand tree | `ChevronRight` |
| Collapse tree | `ChevronDown` |
| Check / Confirmed | `Check` |
| Warning | `TriangleAlert` |
| Info | `Info` |
| Error | `CircleX` |
| Success | `CircleCheck` |
| User / Avatar | `CircleUserRound` |
| Upload | `Upload` |
| Export / Download | `Download` |
| Emoji picker | `Smile` |
| Image | `Image` |
| Hyperlink | `Link` |
| Comment | `MessageSquare` |
| Mention | `AtSign` |
| Calendar | `Calendar` |
| Database | `Database` |
| Table view | `Table` |
| Board (Kanban) | `Kanban` |
| Gallery view | `LayoutGrid` |
| Template | `LayoutTemplate` |
| Filter | `Filter` |
| Sort | `ArrowUpDown` |
| Group | `Group` |
| Drag handle | `GripVertical` |
| Page | `FileText` |
| Public link | `Globe` |
| Guest user | `UserCheck` |
| Revoke access | `UserX` |
| Admin role | `ShieldCheck` |
| Editor role | `Pencil` |
| Viewer role | `Eye` |
| Orbit platform admin | `Shield` |
| Storage | `HardDrive` |
| Email | `Mail` |
| Session / Desktop | `Monitor` |
| Mobile session | `Smartphone` |
| Breadcrumb separator | `ChevronRight` (`size-3 text-base-content/50`) |
| Page cover | `ImagePlus` |
| Page icon | `Smile` |
| Code block | `Code` |
| Equation | `Sigma` |
| Divider | `Minus` |
| Columns layout | `Columns2` |
| Toggle block | `ChevronRight` |
| Version history | `History` |

---

## Components

> Everything below describes what `components/ui/*` **actually renders today**.
> It replaced a spec written against raw `slate-*` / `violet-*` / `bg-base-100`
> Tailwind values, which the code stopped using during the daisyUI migration.
> If you find one of those old class strings anywhere in this repo, it is a
> defect, not a style.

### Where each responsibility lives

```text
daisyUI     → primary component styling + all colour tokens
Headless UI → interactive behaviour: focus, keyboard, ARIA, open state
Floating UI → collision-aware positioning for anchored popups
Native HTML → behaviour the browser already gives us (<dialog>, <details>,
              Popover API, form controls)
Tailwind    → layout, responsive behaviour, and genuinely custom details only
```

Pick an implementation in this order: **native HTML → daisyUI → Headless UI →
Floating UI → hand-rolled.** Adding a hand-rolled equivalent of something in
the four layers above is a review defect.

Two consequences worth internalising:

- **Never hardcode a colour.** The vocabulary is `bg-base-100/200/300`,
  `text-base-content`, `border-base-300`, `bg-primary`, `text-error`,
  `text-success`, `text-warning`. A literal hex, or a Tailwind palette class
  like `bg-primary`, bypasses the theme and breaks dark mode.
- **Don't re-declare what daisy already sets.** Add the daisy class and only
  override the specific properties this app deliberately differs on. Tailwind
  utilities outrank daisy's component layer in this build, so every override
  wins the cascade — which also means a *missing* override lets a daisy default
  (usually `--radius-box`) leak through silently. Check the computed style, not
  just the markup.

### Inventory

| Component | File | daisyUI class | Behaviour layer | What Tailwind still does |
|---|---|---|---|---|
| Button | `button.tsx` | `btn` + `btn-primary` / `btn-secondary` / `btn-ghost` / `btn-link` / `btn-error` | native `<button>` | size scale (`--size`, `--btn-p`), focus ring, alpha-tinted `destructive` |
| Input | `input.tsx` | `input` | native | height, radius, border/bg tokens |
| Textarea | `textarea.tsx` | `textarea` | native | underline-only treatment |
| Select | `select.tsx` | `select` (trigger) | **Headless UI `Listbox`** | trigger height/surface; panel surface (see note) |
| Checkbox | `checkbox.tsx` | `checkbox checkbox-primary` | native `<input type="checkbox">` | `--size`, square corners, unchecked border |
| Radio | `radio-group.tsx` | `radio` | native (shared `name` → arrow keys) | `--size`, unchecked border |
| Switch | `switch.tsx` | `toggle toggle-primary` | native `<input role="switch">` | `--size`, pill radius |
| Slider | `slider.tsx` | `range range-xs range-primary` | native `<input type="range">` | `w-full`, focus ring |
| Badge | `badge.tsx` | `badge` | — | radius, alpha-tinted variants |
| Card | `card.tsx` | `card`, `card-title` | — | per-section `--card-spacing` padding model |
| Alert | `alert.tsx` | `alert` | — | radius, semantic accents |
| Avatar | `avatar.tsx` | `avatar` | — | `data-size` scale, ring overlay |
| Skeleton | `skeleton.tsx` | `skeleton` | — | radius |
| Table | `table.tsx` | `table` | — | square corners, sticky header |
| Tabs | `tabs.tsx` | `tabs`, `tabs-box`, `tabs-border`, `tab` | hand-rolled value-based context | stretch, focus ring, icon sizing |
| Accordion | `accordion.tsx` | `collapse collapse-arrow`, `collapse-title`, `collapse-content` | native `<details name>` | square corners, row divider |
| Breadcrumb | `breadcrumb.tsx` | `breadcrumbs` | — | typography |
| Pagination | `pagination.tsx` | `join`, `join-item` | — | — |
| Toggle | `toggle.tsx` | `btn btn-ghost` / `btn-outline` (via `buttonClasses`) | native `<button aria-pressed>` | pressed state |
| ToggleGroup | `toggle-group.tsx` | `join` / `join-item` (at `spacing={0}`) | native buttons + context | gap for non-zero spacing |
| Tooltip | `tooltip.tsx` | `tooltip`, `tooltip-{top,right,bottom,left}`, `tooltip-content` | CSS only — no JS, no positioner | — |
| AlertDialog | `alert-dialog.tsx` | `modal-action` (footer), `btn btn-error` / `btn` outline (actions) | native `<dialog>` + `showModal()` | surface, sizing |
| SaveStatus | `save-status.tsx` | `badge badge-sm` | — | pill radius, state colours |
| Label | `label.tsx` | — | native `<label>` | `peer-*` pairing with the three form controls |

`checkbox`, `radio-group`, `switch`, `checkbox`'s `indeterminate`, and the
`toggle` pressed state are all driven by the control's **real DOM state**
(`:checked`, `:indeterminate`, `aria-pressed`), not by a class computed in
React. daisy styles off those pseudo-classes directly.

### Intentionally not on a daisyUI component class

Each of these was evaluated against daisy's actual compiled CSS, not its docs.

| Component | Why it stays custom |
|---|---|
| `dialog.tsx`, `sheet.tsx` | The engine is the browser's own `<dialog>` + `showModal()` — focus trap, Escape, and top-layer stacking for free. daisy's `.modal-box` is **inert on its own**: its `opacity: 0` / `scale: .95` are only reset by `.modal[open] > .modal-box`, so adopting it means also adopting `.modal` as a full-viewport grid wrapper, which replaces the tuned `::backdrop` rules in `globals.css` (`.modal::backdrop { display: none }`) that `sheet` shares. `.modal-box` also ships an unconditional `box-shadow` that `--depth: 0` does **not** suppress. `modal-action` *is* adopted (see `alert-dialog.tsx`) because it has no `.modal` scoping. |
| `popover.tsx` | Native Popover API (`popover="auto"`) gives outside-click, Escape and top-layer for free. daisy's `.dropdown-content` inherits nothing outside a `.dropdown` ancestor and `.dropdown` itself has no collision detection. |
| `separator.tsx` | This component **is** the rule (`h-px`/`w-px` + `bg-base-300`, zero margin). daisy's `divider` draws its line with `::before`/`::after` pseudo-elements and injects a built-in `margin: 1rem 0` — layering it would add an unrequested 1rem at every call site. |
| `progress.tsx` | daisy's `.progress` fill is `::-webkit-progress-value` / `::-moz-progress-bar`, which only exist on a real `<progress>` element. This is a deliberate `div`+`div` bar (see the file header for the cross-engine reasoning), so the class would style the track and leave the fill unpainted. |
| `collapsible.tsx` | A behaviour-only `<details>` wrapper with no visual of its own. daisy's `collapse` would inject a grid layout, 1rem padding and a `--radius-box` corner into every consumer's own layout. `accordion.tsx` — which *is* a visual component — does use `collapse`. |
| `scroll-area.tsx` | Plain `overflow-auto`; scrollbars are styled globally in `globals.css`. |
| `calendar.tsx`, `date-picker.tsx` | React Day Picker owns the DOM and the interaction model. Styled with daisy tokens. |
| `sonner.tsx` | Sonner owns toast rendering, stacking and lifecycle. Themed by feeding it daisy tokens (`--normal-bg: var(--color-base-100)`, …). |
| `icon-tooltip.tsx`, `reaction-tooltip.tsx` | **Floating UI** via `lib/ui/use-anchor-position.ts` — flip/shift/size collision handling against a caller-supplied `DOMRect`, which daisy's CSS-only tooltip cannot do. Use `tooltip.tsx` when a plain CSS tooltip suffices. |
| `slot.tsx` | A ~30-line utility that merges props onto a single child (the `asChild` pattern). Not a styling concern and not a dependency — it exists so triggers can forward behaviour onto an arbitrary child element. |
| `logo.tsx`, `time-ago.tsx` | Not styled components — an asset switcher and a formatter. |

### Select panel, specifically

`SelectTrigger` is daisy's `select` (daisy draws the caret itself — that is why
no chevron icon is rendered). The floating panel keeps hand-written surface
classes built from daisy tokens because daisy has no "floating panel" class
that composes with Headless UI's anchoring. Headless UI keeps full ownership of
open state, roving focus, `role="listbox"`/`role="option"`, type-ahead, Escape,
and focus restoration to the trigger.

### Focus

The app's focus affordance is a **ring**, not a native outline:
`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50`
(`/30` on form controls). daisy ships `outline: 2px solid` on `:focus-visible`
for several components; suppress it and use the ring, so focus looks the same
everywhere.

### Elevation

Shadows are off. daisy derives real shadows from `--depth`, which is forced to
`0` in the unlayered `:root` block of `globals.css` — if a product theme is ever
reintroduced it must carry `--depth: 0` explicitly. The `shadow-card` /
`shadow-raised` / `shadow-float` tokens exist for floating surfaces only
(dropdown panels, hover cards).

---

## Feature UI Patterns

### Sign-In Page (`/sign-in`)

Full-page, no sidebar. Background `bg-base-200`.

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                  [Pagevo wordmark]                     │
│                                                          │
│   ┌──────────────────────────────────────────────────┐  │
│   │  Sign in to Pagevo                             │  │
│   │  Enter your email to receive a magic link.       │  │
│   │                                                  │  │
│   │  Email address                                   │  │
│   │  [__________________________________________]    │  │
│   │                                    ← error here  │  │
│   │  [         Continue with email         ]  lg     │  │
│   │                                                  │  │
│   │  ─────────── or ───────────                      │  │
│   │  New to Pagevo? Sign up is the same            │  │
│   │  flow — just enter your email.                   │  │
│   └──────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Card: `bg-base-100 rounded-xl shadow-md p-8 w-full max-w-sm mx-auto mt-16`.

**After submit** — card transitions to "Check your inbox" state:
```
[Mail icon size-12 text-primary mb-4]
"Check your email"
"We sent a magic link to dana@example.com"
"Link expires in 15 minutes."
[Didn't receive it? Resend — Ghost sm] ← disabled for 60s with countdown
```

---

### Onboarding Wizard (`/onboarding`)

4-step, full-page, no sidebar. Background `bg-base-200`.

**Progress strip:** `fixed top-0 left-0 right-0 h-1 bg-base-300`. Fill: `bg-primary transition-[width] duration-500`, width = `25% × step`.

**Step card:** `bg-base-100 rounded-xl shadow-md p-10 w-full max-w-lg mx-auto mt-12`.

**Step indicator dots:**
```
flex items-center gap-2 mb-8 justify-center

Dot:     w-2 h-2 rounded-full
Past:    bg-primary
Current: w-3 h-3 bg-primary (larger)
Future:  bg-base-300

Connector between dots: h-px w-8 bg-base-300 (past: bg-primary/30)
```

**Step layouts:**

```
Step 1 — Profile
  [Avatar xl — click to upload, initials placeholder]  centered
  Name input (required)
  Role/Title input (optional, placeholder "e.g. Head of Product")
  [Continue →] Primary lg  full-width

Step 2 — Workspace
  [Emoji picker button — 48px emoji display]  + Workspace name input  side by side
  Slug preview: "pagevo.app/[slug]" (auto-generated, editable)
  [Continue →] Primary lg

Step 3 — Invite teammates
  [Multi-email chip input — full width]
  [Role selector: Admin / Editor (default) / Viewer — Radio group]
  [Send invites →]  + [Skip for now — Ghost]

Step 4 — Pick a template
  [Template gallery — 3-col grid, cards with thumbnail + name + category]
  [Use this template] on hover overlay
  [Start blank] link below gallery
```

---

### Page Header (Icon + Cover + Title)

```
┌──────────────────────────────────────────────────────────────┐
│  [Cover image — w-full h-48 object-cover bg-base-200]      │
│      [Add cover / Reposition / Remove — hover buttons]      │
│                          ────────────────────────────────    │
│  [Page Icon — 48px emoji or w-12 h-12 rounded-lg]           │
│   overlaps cover bottom edge (mt-[-24px] ml-[96px])         │
│                                                              │
│  [Breadcrumb: Workspace › Parent › This Page]                │
│                                                              │
│  [Title — contenteditable, text-4xl font-bold, w-full]      │
│   placeholder: "Untitled"  color: text-base-content/30            │
│                                                              │
│  [First block — placeholder: "Start writing, or '/' …"]     │
└──────────────────────────────────────────────────────────────┘
```

- Cover hover overlay: `absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors` + action buttons `absolute bottom-3 right-4`
- Icon click → Emoji picker popover (Headless UI `Popover`, `w-[320px]`)
- **No icon + no cover:** show "Add icon" and "Add cover" ghost buttons that appear on header hover
- **Locked page:** `Lock` icon badge inline in breadcrumb row, editor is `contenteditable=false`
- **Small text mode:** title switches to `text-2xl font-bold`, all body text scales down by one step

---

### Floating Inline Toolbar

Appears on text selection. Positioned above selection via `getBoundingClientRect`.

```
bg-base-100 border border-base-300 rounded-lg shadow-md
flex items-center gap-0.5 px-1 py-1 h-9
animate-in fade-in zoom-in-95 duration-100

Buttons (Ghost icon-sm, h-7 w-7):
  [B] [I] [U] [S] [Code] │ [A▾] [🖊▾] [🔗] │ [Comment] [Turn into▾]

Active formatting: bg-primary/10 text-primary rounded
Divider (│): w-px h-5 bg-base-300 mx-0.5
```

---

### Slash Command Menu

Appears inline at cursor after `/`. Positioned below cursor.

```
bg-base-100 border border-base-300 rounded-lg shadow-md
w-[280px] max-h-[320px] overflow-y-auto z-dropdown
animate-in fade-in slide-in-from-top-2 duration-150

Search row:
  px-3 py-2 border-b border-base-300
  [Search icon size-4 text-base-content/50] [input: "Filter commands…" text-sm outline-none]

Category label:
  px-3 pt-3 pb-1 text-xs font-semibold text-base-content/50 uppercase tracking-wide

Command item:
  mx-1 px-2 py-2 rounded-md flex items-center gap-3 cursor-default
  data-[highlighted]:bg-base-200

  Icon box:  w-8 h-8 rounded-md bg-base-200 flex items-center justify-center
             size-4 text-base-content/70
  Label:     text-sm font-medium text-base-content
  Hint:      text-xs text-base-content/50 ml-auto (shortcut like "# ")
```

---

### Block Drag Handle

```
Appears on block hover, positioned to the left of the block.

[GripVertical size-4 text-base-content/50]
  absolute -left-6 top-1/2 -translate-y-1/2
  cursor-grab active:cursor-grabbing
  opacity-0 group-hover:opacity-100 transition-opacity duration-100

On hover also show:
  [Plus size-4]   — "Add block above" (Ghost icon-sm, -left-12)
  [Ellipsis]      — "Block options" popover (Ghost icon-sm, -left-6 below grip)
```

---

### Database: Table View

```
Table container: w-full overflow-x-auto

Header row:
  bg-base-200 border-b border-base-300 h-9 sticky top-0 z-header
  [Title col — min-w-[200px] font-medium text-sm text-base-content px-3]
  [Property cols — min-w-[120px] text-xs text-base-content/70 px-3]
  [+ Add property — Ghost sm px-3]

Data row:
  h-9 border-b border-base-300 group cursor-pointer
  hover:bg-base-200 transition-colors duration-100

Cell:
  px-3 text-sm text-base-content truncate overflow-hidden
  focus:ring-2 focus:ring-inset focus:ring-primary/50 (on edit)

Row actions (on hover, first col):
  [Expand icon — Ghost icon-sm] → opens Entry Detail Sheet

Footer:
  h-9 border-b border-base-300
  [+ New Entry — Ghost sm px-3 text-base-content/70]

Column header click → sort toggle (ArrowUp / ArrowDown icon, accent color)
```

---

### Database: Board View

```
Container: flex gap-4 overflow-x-auto pb-4 items-start

Column:
  w-[280px] flex-shrink-0 flex flex-col

Column header:
  h-9 flex items-center gap-2 mb-2
  [Color dot: w-2 h-2 rounded-full]
  [Group label: text-sm font-medium text-base-content]
  [Count: Badge neutral xs ml-auto]
  [⋯ column options: Ghost icon-sm]

Card:
  bg-base-100 border border-base-300 rounded-lg p-3 shadow-sm
  cursor-pointer mb-2
  hover:shadow-md transition-shadow duration-150

  Title: text-sm font-medium text-base-content mb-2 line-clamp-2
  Prop rows: text-xs text-base-content/70 flex items-center gap-1.5

No-group card: bg-base-200 border-dashed border-base-300

[+ Add card]: Ghost sm text-base-content/70 mt-1
[+ Add group]: Ghost sm text-base-content/50 ml-4 flex-shrink-0 self-start mt-1
```

---

### Database: Calendar View

```
Month header: flex items-center justify-between mb-4
  [ChevronLeft Ghost icon-sm] [Month Year text-base font-semibold] [ChevronRight Ghost icon-sm]
  [Today — Secondary sm ml-4]

Grid: grid grid-cols-7 gap-px bg-base-300 (gap creates border effect)

Day header:
  bg-base-200 text-xs font-medium text-base-content/70 text-center py-2

Day cell:
  bg-base-100 min-h-[100px] p-1.5
  today: bg-primary/10
  out-of-month: bg-base-200

Day number:
  text-sm font-medium text-base-content mb-1
  today: w-7 h-7 rounded-full bg-primary text-primary-content flex items-center justify-center

Event chip:
  rounded text-xs px-1.5 py-0.5 mb-0.5 w-full truncate cursor-pointer
  bg-primary/10 text-primary
  hover:bg-primary/20 transition-colors

  More link: text-xs text-base-content/70 hover:text-base-content mt-0.5 "+N more"
```

---

### Database: Gallery View

```
Grid: grid grid-cols-3 gap-4 (2 cols in narrow containers)

Card:
  bg-base-100 border border-base-300 rounded-xl overflow-hidden
  shadow-sm cursor-pointer
  hover:shadow-md transition-shadow duration-150

Cover area:
  w-full h-36
  Has cover: <img class="w-full h-full object-cover" />
  No cover / emoji icon: bg-base-200 flex items-center justify-center text-4xl

Body: p-4
  Title:  text-sm font-semibold text-base-content mb-2 line-clamp-2
  Props:  flex flex-col gap-1 text-xs text-base-content/70

[+ New Entry] card (ghost dashed):
  border-2 border-dashed border-base-300 rounded-xl h-[168px]
  flex items-center justify-center
  text-sm text-base-content/50 hover:border-primary hover:text-primary
```

---

### Entry Detail Panel (Database Row / Page)

Opens as a Sheet from the right when expanding a database row.

```
Panel: w-[640px] bg-base-100 border-l border-base-300 shadow-xl
       overflow-y-auto

Header:
  px-6 py-4 border-b border-base-300 flex items-center justify-between
  [Breadcrumb: Database name → Entry title]
  [Open as full page — Ghost sm]  [✕ Ghost icon-sm]

Properties section:
  px-6 py-4 border-b border-base-300
  Each prop: flex gap-4 items-start py-2
    Label: w-32 text-sm text-base-content/70 flex-shrink-0 flex items-center gap-1.5
           [Property icon size-4]
    Value: flex-1 text-sm text-base-content (inline-editable on click)

Page content (blocks):
  px-6 py-4
  Full TipTap editor, same as normal page
```

---

### Share Panel

Headless UI `Popover` anchored to the "Share" button in the page header.

```
bg-base-100 border border-base-300 rounded-xl shadow-xl
w-[420px] p-4 z-dropdown

Section: Add people
  flex gap-2
  [Input: "Add people by email or name…" flex-1]
  [Invite — Primary sm]

Section: Access level (shown after someone is typed in input)
  Radio group: Full Access / Can Edit / Can Comment / Can View

Section: People with access
  Each row:
    [Avatar sm]
    [Name text-sm font-medium] [Email text-xs text-base-content/70]
    [Access level — Select xs] ml-auto
    [Remove — Ghost icon-sm X]  (owner: no remove)

Divider + Public link section:
  flex items-center justify-between mb-3
  [Globe size-4 text-base-content/70] "Share to web"  [Switch]

  When enabled:
    [URL text-xs text-base-content/70 truncate flex-1]  [Copy Ghost sm]
    Access: Radio — Can View / Can Comment
    [Disable link — Ghost sm text-error]
```

---

### Settings Modal

Full `fixed` overlay, not a slide-in sheet. Opens from sidebar Settings button.

```
Overlay:   fixed inset-0 bg-black/40 z-modal animate-in fade-in duration-200

Container: fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
           w-[860px] h-[90vh] max-h-[700px] bg-base-100 rounded-xl shadow-xl
           flex overflow-hidden z-modal
           animate-in fade-in zoom-in-95 duration-300

Left nav (220px):
  border-r border-base-300 p-4 flex flex-col gap-0.5
  shrink-0

  Section label:  text-xs font-semibold text-base-content/50 uppercase tracking-wide
                  px-3 py-1 mb-1 mt-3 (first label: mt-0)
  Nav item:       h-8 rounded-md px-3 flex items-center text-sm text-base-content
                  hover:bg-base-200
                  active: bg-primary/10 text-primary font-medium
  Lock icon (🔒): size-3 text-base-content/50 ml-auto (Admin-only items for non-Admins)

Right content:
  flex-1 overflow-y-auto p-8

  Section heading:    text-lg font-semibold text-base-content mb-1
  Section subheading: text-sm text-base-content/70 mb-6
  Form:               max-w-[480px] flex flex-col gap-5

Close button: absolute top-4 right-4 Ghost icon-sm X
```

---

### Notification Center

Sheet from the right. Width `400px`.

```
Header:
  px-5 py-4 border-b border-base-300
  flex items-center justify-between
  [Bell size-5] "Notifications" text-base font-semibold
  [Mark all read — Ghost sm text-sm]

Filter tabs (below header):
  px-5 border-b border-base-300
  [All] [Mentions] [Comments] [Updates]
  (same Tab component)

Body: flex-1 overflow-y-auto

Notification row:
  px-5 py-4 flex gap-3 border-b border-base-300
  hover:bg-base-200 cursor-pointer transition-colors duration-100

  Unread:  left accent bar — border-l-2 border-primary pl-[18px] (compensate for 2px)
  Read:    pl-5 opacity-80

  [Avatar sm]
  Content flex-1:
    Summary:   text-sm text-base-content
    Location:  text-xs text-base-content/70 mt-0.5 "Engineering › Sprint Board"
    Snippet:   text-sm text-base-content/70 italic line-clamp-2 mt-1
    Time:      text-xs text-base-content/50 mt-1
  [✓ — Ghost icon-sm, opacity-0 group-hover:opacity-100] (mark read)

Empty state (no notifications): centered in body
  Bell icon text-base-content/30, "You're all caught up" text-sm text-base-content/70
```

---

### Search Dialog

Anchored near top of screen (`top-[20vh]`), full-width constrained.

```
Overlay:  fixed inset-0 bg-black/40 z-modal
Dialog:   fixed top-[20vh] left-1/2 -translate-x-1/2
          w-full max-w-[600px] bg-base-100 rounded-xl shadow-xl overflow-hidden
          animate-in fade-in zoom-in-95 duration-200

Search bar:
  px-4 py-3 flex items-center gap-3 border-b border-base-300
  [Search size-5 text-base-content/50 flex-shrink-0]
  [input — text-base outline-none flex-1 placeholder:text-base-content/50]
  [<kbd>Esc</kbd> — text-xs text-base-content/50 border border-base-300 rounded px-1.5 py-0.5]

Section label (Recent, Results):
  px-4 py-2 text-xs font-semibold text-base-content/50 uppercase tracking-wide

Result item:
  px-4 py-3 flex items-center gap-3
  hover:bg-base-200 cursor-pointer transition-colors duration-100
  data-[selected]:bg-base-200

  [Page icon — 20px emoji or FileText size-5 text-base-content/70]
  Content:
    Title:      text-sm font-medium text-base-content
                matched chars: font-bold text-primary
    Breadcrumb: text-xs text-base-content/70 mt-0.5

Footer:
  px-4 py-2 border-t border-base-300
  flex gap-6 text-xs text-base-content/50
  [↵ open] [↑↓ navigate] [Esc close]
  Each: flex items-center gap-1
        <kbd> styled: border border-base-300 rounded px-1 py-0.5 font-mono
```

---

### Orbit Admin Shell

Separate layout — no workspace sidebar.

```
Top bar (h-14):
  bg-base-content text-primary-content px-6
  flex items-center justify-between

  Left:  [Shield size-5] "Orbit" text-sm font-semibold text-base-content/50
                         "Admin" text-sm font-bold text-primary-content
  Right: [User name text-sm text-base-content/30] [Sign out Ghost sm text-base-content/50]

Left sidebar (w-56):
  bg-base-content/90 text-base-content/30
  border-r border-base-300

  Nav item:
    h-9 px-4 flex items-center gap-3 text-sm
    hover:bg-base-content/80 hover:text-primary-content transition-colors
    active: bg-base-content/80 text-primary-content rounded-md mx-2

Main content:
  bg-base-200 flex-1 overflow-y-auto p-8

  Page heading: text-2xl font-bold text-base-content mb-6
  Content card: bg-base-100 rounded-xl border border-base-300 shadow-sm overflow-hidden
```

---

## Forms & Validation

- All forms use **`react-hook-form`** with **`@hookform/resolvers/zod`** — the same Zod schema is shared between server actions and client validation.
- **Show errors inline** — below the relevant field using the `Error State` pattern. Never use toast for validation errors.
- **Disable submit** until the form is valid (for create forms) and dirty (for edit forms).
- **Submit state:** button becomes loading (spinner replaces label, `min-w` preserved).
- **Server error:** single message in `text-sm text-error mt-4` below the form footer — e.g., "This slug is already taken."

**Standard field layout:**
```jsx
<div className="flex flex-col gap-1.5">
  <label className="text-sm font-medium text-base-content">Field label</label>
  <Input ... />
  <p className="text-xs text-error min-h-4">{error?.message}</p>
</div>
```

---

## Accessibility

Pagevo targets **WCAG 2.1 AA** compliance.

### Contrast Ratios (Light Mode)

| Foreground / Background | Ratio | WCAG |
|---|---|---|
| `text-base-content` on `bg-base-100` | 18.1:1 | AAA ✓ |
| `text-base-content/70` on `bg-base-100` | 5.9:1 | AA ✓ |
| `text-base-content/70` on `bg-base-100` | 4.6:1 | AA ✓ |
| `text-primary-content` on `bg-primary` | 4.6:1 | AA ✓ |
| `text-primary-content` on `bg-error` | 4.8:1 | AA ✓ |
| `text-warning` on `bg-warning/10` | 4.5:1 | AA ✓ |
| `text-error` on `bg-error/10` | 5.1:1 | AA ✓ |
| `text-success` on `bg-success/10` | 5.3:1 | AA ✓ |
| `text-base-content/50` (decorative/placeholder) | 3.1:1 | decorative only — not used for informative text |

### Focus Ring

Every interactive element: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2`.
Use `focus-visible` (not `focus`) so mouse clicks do not show the ring.

### Focus Management

- Dialogs and Sheets trap focus inside — native `<dialog>` + `showModal()` handles this automatically.
- On close: focus returns to the element that triggered the overlay.
- After a page navigation: focus moves to the page title `contenteditable`.
- Toast notifications: announced via `role="status" aria-live="polite"` without stealing focus.

### ARIA Roles & Attributes

| Element | Role / Attribute |
|---|---|
| Sidebar nav | `<nav aria-label="Workspace navigation">` |
| Page tree | `role="tree"` + `role="treeitem"` + `aria-expanded` per node |
| Breadcrumb | `<nav aria-label="Breadcrumb">` + `aria-current="page"` on current |
| Search dialog | `role="dialog" aria-label="Search"` + `role="listbox"` on results |
| Notification center | `role="dialog" aria-label="Notifications"` |
| Modal | `role="dialog" aria-modal="true" aria-labelledby="dialog-title"` |
| Toast (non-critical) | `role="status" aria-live="polite"` |
| Toast (error) | `role="alert" aria-live="assertive"` |
| Icon-only button | `aria-label="[action]"` |
| Loading spinner | `role="status" aria-label="Loading"` |
| Drag handle | `aria-roledescription="Drag to reorder" aria-grabbed` |
| Disabled field | `aria-disabled="true"` (not `disabled` for custom components) |
| Progress bar | `role="progressbar" aria-valuenow aria-valuemin aria-valuemax` |

### Keyboard Shortcuts Reference

| Action | Shortcut |
|---|---|
| Open search | `Ctrl+K` / `Cmd+K` |
| Open notifications | `Ctrl+Shift+N` / `Cmd+Shift+N` |
| New page | `Ctrl+N` / `Cmd+N` |
| Toggle sidebar | `Ctrl+\` / `Cmd+\` |
| Close dialog / sheet / menu | `Esc` |
| Navigate dropdown / search results | `↑` / `↓` |
| Select item | `Enter` |
| Bold | `Ctrl+B` / `Cmd+B` |
| Italic | `Ctrl+I` / `Cmd+I` |
| Underline | `Ctrl+U` / `Cmd+U` |
| Strikethrough | `Ctrl+Shift+X` / `Cmd+Shift+X` |
| Inline code | `Ctrl+E` / `Cmd+E` |
| Link | `Ctrl+K` / `Cmd+K` (on selection) |
| Slash command menu | `/` at line start |
| Undo | `Ctrl+Z` / `Cmd+Z` |
| Redo | `Ctrl+Shift+Z` / `Cmd+Shift+Z` |
| Indent block | `Tab` |
| Outdent block | `Shift+Tab` |
| Select all blocks | `Ctrl+A` / `Cmd+A` |

---

## Responsive Behavior

Phase 1 is **desktop-first** (≥ 1024px). Mobile web is Phase 2.

| Breakpoint | Width | Behavior |
|---|---|---|
| `lg` | ≥ 1024px | Full sidebar + content layout (default) |
| `md` | 768–1023px | Sidebar collapses to icon-only by default; tapping left strip opens it as a full-height overlay above content |
| `sm` | < 768px | Not fully supported in Phase 1. Show a minimal read-only page view with a "Best experienced on desktop" banner. No editor, no settings, no databases. |

### `md` Breakpoint Adaptations

- Sidebar: `fixed left-0 top-0 h-full w-60 z-sidebar shadow-xl` when open; `translate-x-[-100%]` when closed
- Settings modal: `w-screen h-screen rounded-none` (full-screen takeover)
- Database Table view: horizontal scroll container; first (Title) column is `sticky left-0 bg-base-100 z-10`
- Search dialog: `w-screen rounded-none top-0` (full-width, anchored to top)
- Notification center: `w-screen`

---

## Out of Scope (Phase 1)

- Dark mode — Phase 2 (token layer is ready; only needs a `dark:` token map)
- Custom workspace branding / color themes — Phase 5
- Mobile-native UI patterns (bottom nav, swipe gestures) — Phase 3 (native apps)
- High-contrast / forced-colors mode — Phase 2
- RTL (right-to-left) layout support — Phase 4
- Custom fonts per workspace — Phase 5
- Animated page transitions — Phase 2
- Skeleton loading for every surface (Phase 1: key surfaces only — sidebar tree, page content, search results)
