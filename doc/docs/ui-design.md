# UI Design System

This document is the **single source of truth** for WorkFlik's visual design — tokens, component specs, layout patterns, and accessibility rules. Every UI component and page must be implemented from this reference. Read it before building any frontend feature.

**Stack:** Tailwind CSS (utility-first) · Lucide React (icons) · Inter (UI font) · JetBrains Mono (code font) · Radix UI primitives (accessible headless components — dialogs, dropdowns, tooltips, checkboxes, switches).

> **Phase 1 only — Light mode.** Dark mode is a Phase 2 deliverable and is out of scope for MVP. The token layer below is structured to allow a future dark mode swap without touching component code.

---

## Design Principles

1. **Content first.** The editor and page content own the viewport. Sidebar, toolbars, and headers shrink to the minimum viable footprint.
2. **One surface at a time.** No stacked modals or nested drawers. One overlay is dominant; everything else recedes.
3. **Instant feedback.** Every user action gets a visual response in one frame — a state change, spinner, or disabled state. Silent latency is a bug.
4. **Earn complexity.** Advanced controls (database filters, permission matrix, block picker) are hidden until needed. Progressive disclosure over feature exposure.
5. **Keyboard-first.** Every action reachable by mouse is reachable by keyboard. No exceptions.
6. **Consistent rhythm.** Spacing, type, and color follow a small token set. New raw values are not introduced without adding them here first.

---

## Color System (Light Mode)

Tailwind's built-in palette. Use the **semantic role names** in components — never hardcode a Tailwind class like `bg-violet-600` directly in component code; map it through a token so a future dark theme only needs one swap.

### Neutral / Surface

| Role | Tailwind | Hex | Usage |
|---|---|---|---|
| `bg-app` | `bg-slate-50` | #F8FAFC | App background — behind sidebar and content |
| `bg-surface` | `bg-white` | #FFFFFF | Cards, modals, sidebar, page content |
| `bg-subtle` | `bg-slate-100` | #F1F5F9 | Hover rows, code block bg, empty input bg |
| `bg-muted` | `bg-slate-200` | #E2E8F0 | Skeleton loaders, section dividers as bands |
| `border-default` | `border-slate-200` | #E2E8F0 | All borders — inputs, cards, panels |
| `border-strong` | `border-slate-300` | #CBD5E1 | Drag-over targets, strong separators |

### Text

| Role | Tailwind | Hex | Usage |
|---|---|---|---|
| `text-primary` | `text-slate-900` | #0F172A | Body text, headings, form labels |
| `text-secondary` | `text-slate-600` | #475569 | Secondary labels, metadata, timestamps |
| `text-tertiary` | `text-slate-400` | #94A3B8 | Placeholders, empty state copy, resting icons |
| `text-disabled` | `text-slate-300` | #CBD5E1 | Disabled control text |
| `text-on-accent` | `text-white` | #FFFFFF | Text on brand-colored backgrounds |
| `text-link` | `text-violet-600` | #7C3AED | Inline hyperlinks |

### Brand / Accent (Violet)

| Role | Tailwind | Usage |
|---|---|---|
| `accent` | `bg-violet-600` / `text-violet-600` | Primary buttons, active nav, focus rings |
| `accent-hover` | `bg-violet-700` | Hover on primary buttons |
| `accent-active` | `bg-violet-800` | Active / pressed state |
| `accent-subtle` | `bg-violet-50` | Selected row bg, active sidebar item bg |
| `accent-subtle-text` | `text-violet-700` | Text on `accent-subtle` |
| `accent-border` | `border-violet-400` | Focus ring on inputs |

### Semantic Colors

| Role | Background | Text | Border | Usage |
|---|---|---|---|---|
| **Success** | `bg-green-50` | `text-green-700` | `border-green-200` | Save toast, invite accepted |
| **Warning** | `bg-amber-50` | `text-amber-700` | `border-amber-200` | 90 % storage banner, trash expiry |
| **Destructive** | `bg-red-50` | `text-red-700` | `border-red-200` | Error states, delete confirm copy |
| **Destructive action** | `bg-red-600` | `text-white` | — | Delete / danger buttons |
| **Info** | `bg-blue-50` | `text-blue-700` | `border-blue-200` | Hint banners, informational callouts |

### Editor-Specific Colors

| Purpose | Tailwind | Notes |
|---|---|---|
| Multi-block selection | `bg-violet-50` | Applied to selected block wrapper |
| Text highlight — yellow | `bg-yellow-200` | User-applied via toolbar |
| Text highlight — blue | `bg-blue-200` | User-applied |
| Text highlight — green | `bg-green-200` | User-applied |
| Text highlight — pink | `bg-pink-200` | User-applied |
| @mention text | `bg-violet-100 text-violet-800 rounded px-0.5` | Inline mention chip |
| Comment anchor | `bg-amber-100` | Text range with attached thread |
| Search match highlight | `bg-yellow-300` | FTS result in page |

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
| Blockquote | `text-base italic text-slate-600 border-l-4 border-slate-300 pl-4` | 16px | 400 |
| Inline code | `font-mono text-sm bg-slate-100 rounded px-1 py-0.5` | 14px | 400 |
| Code block | `font-mono text-sm` on `bg-slate-900 text-slate-100` | 14px | 400 |
| Callout | `text-base` inside `bg-slate-100 rounded-lg p-4` | 16px | 400 |

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
| Sidebar background | white + right border | `bg-white border-r border-slate-200` |
| Content max-width (normal) | 900px | `max-w-[900px] mx-auto` |
| Content max-width (full width page) | 100% | `max-w-full` |
| Content horizontal padding | 96px | `px-24` |
| Content top padding | 48px | `pt-12` |

### Sidebar Item Heights

| Element | Height | Classes |
|---|---|---|
| Section label (FAVORITES, PAGES) | 24px | `py-1 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide` |
| Quick action button | 32px | `h-8 px-3 flex items-center gap-2.5 text-sm text-slate-700` |
| Page tree node | 32px | `h-8 px-2 flex items-center gap-1.5 text-sm` |
| Workspace switcher row | 44px | `h-11 px-3 flex items-center gap-2` |
| Account row | 40px | `h-10 px-3 flex items-center gap-2` |

### Sidebar States

- **Hover row:** `rounded-md bg-slate-100 transition-colors duration-150`
- **Active (current page):** `rounded-md bg-violet-50 text-violet-700 font-medium`
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
| Skeleton pulse | `animate-pulse` on `bg-slate-200` elements |
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
| Breadcrumb separator | `ChevronRight` (`size-3 text-slate-400`) |
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

### Button

All buttons: `rounded-md font-medium transition-colors duration-150 inline-flex items-center justify-center gap-2 select-none`.
Focus: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2`.
Disabled: `opacity-50 cursor-not-allowed pointer-events-none`.
Loading: replace label with `<Spinner />` + `cursor-wait pointer-events-none`; preserve `min-w` to avoid layout shift.

#### Variants

| Variant | Classes | Usage |
|---|---|---|
| **Primary** | `bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800` | Main CTA — "Save changes", "Send invite" |
| **Secondary** | `bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300` | "Cancel", "Copy link" |
| **Ghost** | `bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200` | Sidebar items, toolbar icon buttons |
| **Destructive** | `bg-red-600 text-white hover:bg-red-700 active:bg-red-800` | "Delete workspace", "Permanently delete" |
| **Outline** | `border border-slate-300 bg-white text-slate-900 hover:bg-slate-50` | Lower-emphasis form actions |

#### Sizes

| Size | Classes | Usage |
|---|---|---|
| `sm` | `h-7 px-3 text-xs` | Dense areas — table cells, toolbar, badge-adjacent |
| `md` *(default)* | `h-9 px-4 text-sm` | Most dialogs, settings forms |
| `lg` | `h-11 px-6 text-base` | Onboarding CTAs, sign-in button |
| `icon-sm` | `h-7 w-7 p-0` | Icon-only ghost buttons (toolbar, close ×) |
| `icon-md` | `h-9 w-9 p-0` | Icon-only standard buttons |

---

### Input / Textarea

```
bg-white border border-slate-200 rounded-md
text-sm text-slate-900 placeholder:text-slate-400
px-3 h-9 w-full
transition-colors duration-150
focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
```

**Error state:** swap `border-slate-200` → `border-red-400`; error message below: `text-xs text-red-600 mt-1 min-h-[16px]` (reserve space to prevent layout shift).

**Read-only:** `bg-slate-50 text-slate-600 cursor-default` + lock icon to the right.

**With left icon:** wrap in `relative`, add `pl-9`, icon: `absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400`.

**Textarea:** same base, remove `h-9`, add `min-h-[80px] py-2 resize-y`.

**Multi-email chip input:** `flex flex-wrap gap-1.5 px-2 py-2 min-h-[38px] border border-slate-200 rounded-md focus-within:ring-2 focus-within:ring-violet-500`. Each chip: `Badge` variant with `×` dismiss button.

---

### Select / Dropdown

Use **Radix UI Select** for native keyboard navigation.

**Trigger:** same styles as `Input`.

**Content panel:**
```
bg-white border border-slate-200 rounded-lg shadow-md
py-1 min-w-[160px] max-h-[300px] overflow-y-auto
z-dropdown
```

**Option item:**
```
px-3 py-1.5 text-sm text-slate-900 cursor-default rounded-sm mx-1
hover:bg-slate-100 focus:bg-slate-100 outline-none
data-[highlighted]:bg-slate-100
data-[state=checked]:font-medium data-[state=checked]:text-violet-700
```

---

### Checkbox

**Radix UI Checkbox.**

```
Unchecked:     w-4 h-4 rounded border-2 border-slate-300 bg-white
Checked:       w-4 h-4 rounded border-2 border-violet-600 bg-violet-600  (Check icon size-3 text-white)
Indeterminate: border-violet-600 bg-violet-600  (Minus icon size-3 text-white)
Disabled:      opacity-50 cursor-not-allowed
Focus:         ring-2 ring-violet-500 ring-offset-2
```

Label: `text-sm text-slate-900 select-none cursor-pointer ml-2`.

---

### Radio Group

**Radix UI Radio.**

```
Outer ring (unselected): w-4 h-4 rounded-full border-2 border-slate-300 bg-white
Outer ring (selected):   w-4 h-4 rounded-full border-2 border-violet-600 bg-white
Inner dot (selected):    w-2 h-2 rounded-full bg-violet-600  (centered via flex)
```

---

### Toggle / Switch

**Radix UI Switch.**

```
Track off:  w-10 h-6 rounded-full bg-slate-200  transition-colors duration-200
Track on:   w-10 h-6 rounded-full bg-violet-600
Thumb:      w-5 h-5 rounded-full bg-white shadow-sm
            data-[state=unchecked]:translate-x-0
            data-[state=checked]:translate-x-4
            transition-transform duration-200
```

---

### Badge / Chip

`rounded-full text-xs font-medium px-2 py-0.5 inline-flex items-center gap-1`.

| Variant | Classes |
|---|---|
| Neutral | `bg-slate-100 text-slate-700` |
| Accent | `bg-violet-100 text-violet-700` |
| Success | `bg-green-100 text-green-700` |
| Warning | `bg-amber-100 text-amber-700` |
| Destructive | `bg-red-100 text-red-700` |
| Info | `bg-blue-100 text-blue-700` |
| Outline | `border border-slate-200 bg-white text-slate-500` |

**Role badges:** Admin → Accent, Editor → Neutral, Viewer → Outline.

**Dismissible chip:** append `<button class="ml-0.5 hover:text-slate-900"><X size={10}/></button>`.

---

### Avatar

`rounded-full object-cover flex items-center justify-center font-semibold text-white overflow-hidden`.

| Size | Tailwind | Text | Usage |
|---|---|---|---|
| `xs` | `w-5 h-5 text-[10px]` | — | Inline in comment text |
| `sm` | `w-7 h-7 text-xs` | — | Sidebar user row, member list |
| `md` | `w-9 h-9 text-sm` | — | Comment card, notification row |
| `lg` | `w-14 h-14 text-xl` | — | Profile settings |
| `xl` | `w-20 h-20 text-3xl` | — | Onboarding profile step |

**Initials fallback:** background color is one of 8 hues chosen via `userId.charCodeAt(0) % 8`:

```
0 → bg-violet-600   1 → bg-blue-600    2 → bg-cyan-600   3 → bg-teal-600
4 → bg-green-600    5 → bg-amber-600   6 → bg-orange-600  7 → bg-rose-600
```

---

### Tooltip

**Radix UI Tooltip.** Open delay: 400 ms. Close delay: 0 ms.

```
bg-slate-900 text-white text-xs rounded-md px-2.5 py-1.5
shadow-sm max-w-[220px] z-tooltip
animate-in fade-in zoom-in-95 duration-100
```

---

### Dialog (Modal)

**Radix UI Dialog.**

```
Overlay:  fixed inset-0 bg-black/40 z-modal animate-in fade-in duration-200
Content:  fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          bg-white rounded-xl shadow-xl w-full max-w-md p-6
          z-modal animate-in fade-in zoom-in-95 duration-300
          focus:outline-none
```

**Inner structure:**
```
Title:       text-lg font-semibold text-slate-900 mb-1
Description: text-sm text-slate-600 mb-6
Body:        flex flex-col gap-4
Footer:      flex justify-end gap-3 mt-6
Close btn:   absolute top-4 right-4 (Ghost icon-sm, X icon)
```

**Destructive confirm dialog:** body contains impact description + Input where user types the name of the thing being deleted. Footer: Secondary "Cancel" + Destructive "Delete [thing]". Button stays disabled until input matches exactly.

---

### Sheet (Side Panel)

```
Overlay:  fixed inset-0 bg-black/30 z-sheet
Panel:    fixed top-0 right-0 h-full w-[400px] bg-white
          border-l border-slate-200 shadow-xl z-sheet
          animate-in slide-in-from-right duration-[250ms]
```

**Settings modal** is a larger variant: `w-[860px] h-[90vh]` centered (not slide — uses Dialog positioning) with a two-column layout inside (nav sidebar + content).

---

### Toast / Notification

Position: `fixed bottom-4 right-4 flex flex-col gap-2 z-toast`.

```
Card:  bg-white border border-slate-200 rounded-lg shadow-lg
       p-4 w-[360px] flex gap-3 relative overflow-hidden
       animate-in slide-in-from-bottom-4 fade-in duration-300

Icon:  size-5 flex-shrink-0 (green=success, red=error, blue=info, slate=neutral)
Title: text-sm font-medium text-slate-900
Body:  text-sm text-slate-600
Close: absolute top-3 right-3 Ghost icon-sm X

Progress bar (auto-dismiss):
  absolute bottom-0 left-0 h-0.5 bg-violet-500
  animate from w-full → w-0 over 5s linear
```

Multiple toasts stack vertically with `gap-2`. Maximum 3 visible at once — oldest is removed when 4th arrives.

---

### Tabs

```
Tab list:  flex border-b border-slate-200 gap-0

Tab item:  px-4 py-2 text-sm font-medium text-slate-600
           cursor-pointer select-none
           transition-colors duration-150
           hover:text-slate-900
           
Active:    text-violet-700
           border-b-2 border-violet-600 -mb-px  (sits on top of list border)
```

---

### Breadcrumb

```
nav  flex items-center gap-1 text-sm text-slate-500 flex-wrap

Segment:    hover:text-slate-900 cursor-pointer transition-colors duration-150
Separator:  <ChevronRight size={12} className="text-slate-400 flex-shrink-0" />
Current:    text-slate-900 font-medium pointer-events-none
```

Long paths: truncate middle segments with `…` (keep first and last). Truncated segments expand on hover via tooltip.

---

### Progress Bar (Storage)

```
Track:  h-2 w-full rounded-full bg-slate-100
Fill:   h-2 rounded-full transition-[width] duration-500
        < 90%:  bg-violet-600
        ≥ 90%:  bg-amber-500
        100%:   bg-red-500
```

---

### Spinner

```
w-5 h-5 rounded-full border-2 border-slate-200 border-t-violet-600 animate-spin
```

Inline (inside button): `w-4 h-4` with same classes.

---

### Skeleton Loader

Use when content is loading and the layout shape is known.

```
bg-slate-200 rounded animate-pulse
```

Common shapes:

| Shape | Classes |
|---|---|
| Text line full | `h-4 rounded w-full` |
| Text line 3/4 | `h-4 rounded w-3/4` |
| Text line 2/3 | `h-4 rounded w-2/3` |
| Avatar sm | `w-7 h-7 rounded-full` |
| Avatar md | `w-9 h-9 rounded-full` |
| Card | `h-32 rounded-xl w-full` |
| Sidebar item | `h-8 rounded-md w-full` |

A paragraph skeleton: 3 lines at `w-full`, `w-5/6`, `w-4/6` with `gap-2`.

---

### Empty State

```
flex flex-col items-center justify-center py-16 text-center px-8

Icon:    size-12 text-slate-300 mb-4 (Lucide icon, not decorative)
Heading: text-base font-medium text-slate-700 mb-1
Body:    text-sm text-slate-500 mb-6 max-w-[280px]
CTA:     Primary or Secondary button (optional)
```

---

### Error State (Inline Field)

```
text-xs text-red-600 mt-1 min-h-[16px]
```

(Always reserve 16px height even when empty — prevents form jumping when error appears.)

**Page-level error (404 / 500):**
```
full-page flex flex-col items-center pt-24 text-center

Code:  text-7xl font-bold text-slate-200 mb-2
Title: text-xl font-semibold text-slate-900 mb-2
Body:  text-sm text-slate-600 mb-8
CTA:   "Go home" Secondary md
```

---

## Feature UI Patterns

### Sign-In Page (`/sign-in`)

Full-page, no sidebar. Background `bg-slate-50`.

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                  [WorkFlik wordmark]                     │
│                                                          │
│   ┌──────────────────────────────────────────────────┐  │
│   │  Sign in to WorkFlik                             │  │
│   │  Enter your email to receive a magic link.       │  │
│   │                                                  │  │
│   │  Email address                                   │  │
│   │  [__________________________________________]    │  │
│   │                                    ← error here  │  │
│   │  [         Continue with email         ]  lg     │  │
│   │                                                  │  │
│   │  ─────────── or ───────────                      │  │
│   │  New to WorkFlik? Sign up is the same            │  │
│   │  flow — just enter your email.                   │  │
│   └──────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Card: `bg-white rounded-xl shadow-md p-8 w-full max-w-sm mx-auto mt-16`.

**After submit** — card transitions to "Check your inbox" state:
```
[Mail icon size-12 text-violet-600 mb-4]
"Check your email"
"We sent a magic link to dana@example.com"
"Link expires in 15 minutes."
[Didn't receive it? Resend — Ghost sm] ← disabled for 60s with countdown
```

---

### Onboarding Wizard (`/onboarding`)

4-step, full-page, no sidebar. Background `bg-slate-50`.

**Progress strip:** `fixed top-0 left-0 right-0 h-1 bg-slate-200`. Fill: `bg-violet-600 transition-[width] duration-500`, width = `25% × step`.

**Step card:** `bg-white rounded-xl shadow-md p-10 w-full max-w-lg mx-auto mt-12`.

**Step indicator dots:**
```
flex items-center gap-2 mb-8 justify-center

Dot:     w-2 h-2 rounded-full
Past:    bg-violet-600
Current: w-3 h-3 bg-violet-600 (larger)
Future:  bg-slate-300

Connector between dots: h-px w-8 bg-slate-200 (past: bg-violet-300)
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
  Slug preview: "workflik.app/[slug]" (auto-generated, editable)
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
│  [Cover image — w-full h-48 object-cover bg-slate-100]      │
│      [Add cover / Reposition / Remove — hover buttons]      │
│                          ────────────────────────────────    │
│  [Page Icon — 48px emoji or w-12 h-12 rounded-lg]           │
│   overlaps cover bottom edge (mt-[-24px] ml-[96px])         │
│                                                              │
│  [Breadcrumb: Workspace › Parent › This Page]                │
│                                                              │
│  [Title — contenteditable, text-4xl font-bold, w-full]      │
│   placeholder: "Untitled"  color: text-slate-300            │
│                                                              │
│  [First block — placeholder: "Start writing, or '/' …"]     │
└──────────────────────────────────────────────────────────────┘
```

- Cover hover overlay: `absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors` + action buttons `absolute bottom-3 right-4`
- Icon click → Emoji picker popover (Radix Popover, `w-[320px]`)
- **No icon + no cover:** show "Add icon" and "Add cover" ghost buttons that appear on header hover
- **Locked page:** `Lock` icon badge inline in breadcrumb row, editor is `contenteditable=false`
- **Small text mode:** title switches to `text-2xl font-bold`, all body text scales down by one step

---

### Floating Inline Toolbar

Appears on text selection. Positioned above selection via `getBoundingClientRect`.

```
bg-white border border-slate-200 rounded-lg shadow-md
flex items-center gap-0.5 px-1 py-1 h-9
animate-in fade-in zoom-in-95 duration-100

Buttons (Ghost icon-sm, h-7 w-7):
  [B] [I] [U] [S] [Code] │ [A▾] [🖊▾] [🔗] │ [Comment] [Turn into▾]

Active formatting: bg-violet-100 text-violet-700 rounded
Divider (│): w-px h-5 bg-slate-200 mx-0.5
```

---

### Slash Command Menu

Appears inline at cursor after `/`. Positioned below cursor.

```
bg-white border border-slate-200 rounded-lg shadow-md
w-[280px] max-h-[320px] overflow-y-auto z-dropdown
animate-in fade-in slide-in-from-top-2 duration-150

Search row:
  px-3 py-2 border-b border-slate-100
  [Search icon size-4 text-slate-400] [input: "Filter commands…" text-sm outline-none]

Category label:
  px-3 pt-3 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wide

Command item:
  mx-1 px-2 py-2 rounded-md flex items-center gap-3 cursor-default
  data-[highlighted]:bg-slate-100

  Icon box:  w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center
             size-4 text-slate-600
  Label:     text-sm font-medium text-slate-900
  Hint:      text-xs text-slate-400 ml-auto (shortcut like "# ")
```

---

### Block Drag Handle

```
Appears on block hover, positioned to the left of the block.

[GripVertical size-4 text-slate-400]
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
  bg-slate-50 border-b border-slate-200 h-9 sticky top-0 z-header
  [Title col — min-w-[200px] font-medium text-sm text-slate-700 px-3]
  [Property cols — min-w-[120px] text-xs text-slate-500 px-3]
  [+ Add property — Ghost sm px-3]

Data row:
  h-9 border-b border-slate-100 group cursor-pointer
  hover:bg-slate-50 transition-colors duration-100

Cell:
  px-3 text-sm text-slate-900 truncate overflow-hidden
  focus:ring-2 focus:ring-inset focus:ring-violet-400 (on edit)

Row actions (on hover, first col):
  [Expand icon — Ghost icon-sm] → opens Entry Detail Sheet

Footer:
  h-9 border-b border-slate-100
  [+ New Entry — Ghost sm px-3 text-slate-500]

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
  [Group label: text-sm font-medium text-slate-900]
  [Count: Badge neutral xs ml-auto]
  [⋯ column options: Ghost icon-sm]

Card:
  bg-white border border-slate-200 rounded-lg p-3 shadow-sm
  cursor-pointer mb-2
  hover:shadow-md transition-shadow duration-150

  Title: text-sm font-medium text-slate-900 mb-2 line-clamp-2
  Prop rows: text-xs text-slate-500 flex items-center gap-1.5

No-group card: bg-slate-50 border-dashed border-slate-300

[+ Add card]: Ghost sm text-slate-500 mt-1
[+ Add group]: Ghost sm text-slate-400 ml-4 flex-shrink-0 self-start mt-1
```

---

### Database: Calendar View

```
Month header: flex items-center justify-between mb-4
  [ChevronLeft Ghost icon-sm] [Month Year text-base font-semibold] [ChevronRight Ghost icon-sm]
  [Today — Secondary sm ml-4]

Grid: grid grid-cols-7 gap-px bg-slate-200 (gap creates border effect)

Day header:
  bg-slate-50 text-xs font-medium text-slate-500 text-center py-2

Day cell:
  bg-white min-h-[100px] p-1.5
  today: bg-violet-50
  out-of-month: bg-slate-50

Day number:
  text-sm font-medium text-slate-900 mb-1
  today: w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center

Event chip:
  rounded text-xs px-1.5 py-0.5 mb-0.5 w-full truncate cursor-pointer
  bg-violet-100 text-violet-800
  hover:bg-violet-200 transition-colors

  More link: text-xs text-slate-500 hover:text-slate-900 mt-0.5 "+N more"
```

---

### Database: Gallery View

```
Grid: grid grid-cols-3 gap-4 (2 cols in narrow containers)

Card:
  bg-white border border-slate-200 rounded-xl overflow-hidden
  shadow-sm cursor-pointer
  hover:shadow-md transition-shadow duration-150

Cover area:
  w-full h-36
  Has cover: <img class="w-full h-full object-cover" />
  No cover / emoji icon: bg-slate-100 flex items-center justify-center text-4xl

Body: p-4
  Title:  text-sm font-semibold text-slate-900 mb-2 line-clamp-2
  Props:  flex flex-col gap-1 text-xs text-slate-500

[+ New Entry] card (ghost dashed):
  border-2 border-dashed border-slate-200 rounded-xl h-[168px]
  flex items-center justify-center
  text-sm text-slate-400 hover:border-violet-400 hover:text-violet-600
```

---

### Entry Detail Panel (Database Row / Page)

Opens as a Sheet from the right when expanding a database row.

```
Panel: w-[640px] bg-white border-l border-slate-200 shadow-xl
       overflow-y-auto

Header:
  px-6 py-4 border-b border-slate-200 flex items-center justify-between
  [Breadcrumb: Database name → Entry title]
  [Open as full page — Ghost sm]  [✕ Ghost icon-sm]

Properties section:
  px-6 py-4 border-b border-slate-200
  Each prop: flex gap-4 items-start py-2
    Label: w-32 text-sm text-slate-500 flex-shrink-0 flex items-center gap-1.5
           [Property icon size-4]
    Value: flex-1 text-sm text-slate-900 (inline-editable on click)

Page content (blocks):
  px-6 py-4
  Full TipTap editor, same as normal page
```

---

### Share Panel

Radix Popover anchored to the "Share" button in the page header.

```
bg-white border border-slate-200 rounded-xl shadow-xl
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
    [Name text-sm font-medium] [Email text-xs text-slate-500]
    [Access level — Select xs] ml-auto
    [Remove — Ghost icon-sm X]  (owner: no remove)

Divider + Public link section:
  flex items-center justify-between mb-3
  [Globe size-4 text-slate-600] "Share to web"  [Switch]

  When enabled:
    [URL text-xs text-slate-500 truncate flex-1]  [Copy Ghost sm]
    Access: Radio — Can View / Can Comment
    [Disable link — Ghost sm text-red-600]
```

---

### Settings Modal

Full `fixed` overlay, not a slide-in sheet. Opens from sidebar Settings button.

```
Overlay:   fixed inset-0 bg-black/40 z-modal animate-in fade-in duration-200

Container: fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
           w-[860px] h-[90vh] max-h-[700px] bg-white rounded-xl shadow-xl
           flex overflow-hidden z-modal
           animate-in fade-in zoom-in-95 duration-300

Left nav (220px):
  border-r border-slate-200 p-4 flex flex-col gap-0.5
  shrink-0

  Section label:  text-xs font-semibold text-slate-400 uppercase tracking-wide
                  px-3 py-1 mb-1 mt-3 (first label: mt-0)
  Nav item:       h-8 rounded-md px-3 flex items-center text-sm text-slate-700
                  hover:bg-slate-100
                  active: bg-violet-50 text-violet-700 font-medium
  Lock icon (🔒): size-3 text-slate-400 ml-auto (Admin-only items for non-Admins)

Right content:
  flex-1 overflow-y-auto p-8

  Section heading:    text-lg font-semibold text-slate-900 mb-1
  Section subheading: text-sm text-slate-500 mb-6
  Form:               max-w-[480px] flex flex-col gap-5

Close button: absolute top-4 right-4 Ghost icon-sm X
```

---

### Notification Center

Sheet from the right. Width `400px`.

```
Header:
  px-5 py-4 border-b border-slate-200
  flex items-center justify-between
  [Bell size-5] "Notifications" text-base font-semibold
  [Mark all read — Ghost sm text-sm]

Filter tabs (below header):
  px-5 border-b border-slate-200
  [All] [Mentions] [Comments] [Updates]
  (same Tab component)

Body: flex-1 overflow-y-auto

Notification row:
  px-5 py-4 flex gap-3 border-b border-slate-100
  hover:bg-slate-50 cursor-pointer transition-colors duration-100

  Unread:  left accent bar — border-l-2 border-violet-500 pl-[18px] (compensate for 2px)
  Read:    pl-5 opacity-80

  [Avatar sm]
  Content flex-1:
    Summary:   text-sm text-slate-900
    Location:  text-xs text-slate-500 mt-0.5 "Engineering › Sprint Board"
    Snippet:   text-sm text-slate-600 italic line-clamp-2 mt-1
    Time:      text-xs text-slate-400 mt-1
  [✓ — Ghost icon-sm, opacity-0 group-hover:opacity-100] (mark read)

Empty state (no notifications): centered in body
  Bell icon text-slate-300, "You're all caught up" text-sm text-slate-500
```

---

### Search Dialog

Anchored near top of screen (`top-[20vh]`), full-width constrained.

```
Overlay:  fixed inset-0 bg-black/40 z-modal
Dialog:   fixed top-[20vh] left-1/2 -translate-x-1/2
          w-full max-w-[600px] bg-white rounded-xl shadow-xl overflow-hidden
          animate-in fade-in zoom-in-95 duration-200

Search bar:
  px-4 py-3 flex items-center gap-3 border-b border-slate-200
  [Search size-5 text-slate-400 flex-shrink-0]
  [input — text-base outline-none flex-1 placeholder:text-slate-400]
  [<kbd>Esc</kbd> — text-xs text-slate-400 border border-slate-200 rounded px-1.5 py-0.5]

Section label (Recent, Results):
  px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide

Result item:
  px-4 py-3 flex items-center gap-3
  hover:bg-slate-100 cursor-pointer transition-colors duration-100
  data-[selected]:bg-slate-100

  [Page icon — 20px emoji or FileText size-5 text-slate-500]
  Content:
    Title:      text-sm font-medium text-slate-900
                matched chars: font-bold text-violet-700
    Breadcrumb: text-xs text-slate-500 mt-0.5

Footer:
  px-4 py-2 border-t border-slate-100
  flex gap-6 text-xs text-slate-400
  [↵ open] [↑↓ navigate] [Esc close]
  Each: flex items-center gap-1
        <kbd> styled: border border-slate-200 rounded px-1 py-0.5 font-mono
```

---

### Orbit Admin Shell

Separate layout — no workspace sidebar.

```
Top bar (h-14):
  bg-slate-900 text-white px-6
  flex items-center justify-between

  Left:  [Shield size-5] "Orbit" text-sm font-semibold text-slate-400
                         "Admin" text-sm font-bold text-white
  Right: [User name text-sm text-slate-300] [Sign out Ghost sm text-slate-400]

Left sidebar (w-56):
  bg-slate-800 text-slate-300
  border-r border-slate-700

  Nav item:
    h-9 px-4 flex items-center gap-3 text-sm
    hover:bg-slate-700 hover:text-white transition-colors
    active: bg-slate-700 text-white rounded-md mx-2

Main content:
  bg-slate-50 flex-1 overflow-y-auto p-8

  Page heading: text-2xl font-bold text-slate-900 mb-6
  Content card: bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden
```

---

## Forms & Validation

- All forms use **`react-hook-form`** with **`@hookform/resolvers/zod`** — the same Zod schema is shared between server actions and client validation.
- **Show errors inline** — below the relevant field using the `Error State` pattern. Never use toast for validation errors.
- **Disable submit** until the form is valid (for create forms) and dirty (for edit forms).
- **Submit state:** button becomes loading (spinner replaces label, `min-w` preserved).
- **Server error:** single message in `text-sm text-red-600 mt-4` below the form footer — e.g., "This slug is already taken."

**Standard field layout:**
```jsx
<div className="flex flex-col gap-1.5">
  <label className="text-sm font-medium text-slate-900">Field label</label>
  <Input ... />
  <p className="text-xs text-red-600 min-h-[16px]">{error?.message}</p>
</div>
```

---

## Accessibility

WorkFlik targets **WCAG 2.1 AA** compliance.

### Contrast Ratios (Light Mode)

| Foreground / Background | Ratio | WCAG |
|---|---|---|
| `text-slate-900` on `bg-white` | 18.1:1 | AAA ✓ |
| `text-slate-600` on `bg-white` | 5.9:1 | AA ✓ |
| `text-slate-500` on `bg-white` | 4.6:1 | AA ✓ |
| `text-white` on `bg-violet-600` | 4.6:1 | AA ✓ |
| `text-white` on `bg-red-600` | 4.8:1 | AA ✓ |
| `text-amber-700` on `bg-amber-50` | 4.5:1 | AA ✓ |
| `text-red-700` on `bg-red-50` | 5.1:1 | AA ✓ |
| `text-green-700` on `bg-green-50` | 5.3:1 | AA ✓ |
| `text-slate-400` (decorative/placeholder) | 3.1:1 | decorative only — not used for informative text |

### Focus Ring

Every interactive element: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2`.
Use `focus-visible` (not `focus`) so mouse clicks do not show the ring.

### Focus Management

- Dialogs and Sheets trap focus inside — Radix UI handles this automatically.
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
- Database Table view: horizontal scroll container; first (Title) column is `sticky left-0 bg-white z-10`
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
