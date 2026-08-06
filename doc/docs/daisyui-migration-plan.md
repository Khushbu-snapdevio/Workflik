# DaisyUI Migration Plan

Replacing shadcn/ui styling with daisyUI 5, on Tailwind v4.

> **Status as of 2026-08-10 — the primitive migration is complete.** Read
> **[Round 4](#round-4-2026-08-10-structural-primitives-onto-daisys-own-component-classes)**
> (near the bottom) for the current state; everything above it is history, kept
> per this doc's practice of appending RESULTS rather than rewriting. In short:
> shadcn, Radix and `class-variance-authority` are gone with zero imports
> remaining and no `components.json`; every `components/ui/*` primitive that
> daisyUI can appropriately style now carries a daisyUI **component class**, not
> just daisy tokens; the ones that stay custom each have a reason recorded
> against daisy's compiled CSS. The architecture is **daisyUI → Headless UI →
> Floating UI → native HTML → Tailwind**, documented in
> [ui-design.md](ui-design.md) and [../CLAUDE.md](../CLAUDE.md).
>
> ⚠️ **The "Decisions (locked 2026-08-03)" table immediately below is
> superseded.** Its "Visual outcome: parity now, refresh later" line in
> particular no longer holds — from Round 2 onward the goal changed to
> consistency, and adopting daisy's own defaults in place of pixel parity is
> now the expected outcome, not a regression.

> **Companion audit, 2026-08-04:** [daisyui-migration-audit-full-codebase.md](./daisyui-migration-audit-full-codebase.md) covers everything this doc doesn't — the ~170 feature-level files outside `components/ui/` (database views, editor, sidebar/admin shells, settings, orbit admin, pages/workspace/templates, notifications/search/onboarding), evaluated against this doc's locked native → daisy → Headless UI → hand-roll policy. Read that doc for the next round of migration work; this doc stays the source of truth for `components/ui/` primitive conversions.

## Decisions (locked 2026-08-03)

| Question | Decision |
|---|---|
| **Visual outcome** | **Parity now, refresh later.** Migration is a pure refactor; the app looks the same on merge. Visual changes are separate design work afterwards. |
| **Motivation** | Shrink `components/ui/`; drop the shadcn dependency; team prefers daisy's semantic classes. **Not** user-selectable themes — so a custom two-theme setup is correct and we are not constrained to daisy's stock theme contract. |
| **A11y contract** | **Ours wins.** `--muted-foreground` / `--muted-foreground-subtle` survive as custom vars with their measured ratios. Any `/opacity` on text is a review defect. |
| **Ship strategy** | **Incremental to `main`.** Phases 1–2 merge immediately; Phase 3 merges per tier behind the compat shim. No long-lived branch. |

## Revision — 2026-08-04: reality check + Headless UI added to the stack

**This section supersedes conflicting statements below it** — the original §0 "keep Radix" table, the Tier 3/4 plan, and the "Decided: stop here" section — **with the actual current state and the go-forward policy.** Per direction: *"we need to use daisy and headless UI... if not possible in any case then we will keep as it is, but majority we need to use daisy's component and headless UI."* Original text below is left in place for its history (per this doc's own practice of appending RESULTS rather than rewriting) — do not trust it over this section where the two disagree.

### What actually happened since 2026-08-03 (undocumented until now)

An audit of `components/ui/` on 2026-08-04 found the migration went considerably further than this doc's last recorded decision ("stop here", Tier 3/4 left on Radix). **Radix is gone.** Zero `@radix-ui`/`radix-ui` imports remain anywhere in the repo, `vaul` was never installed, and `dropdown-menu.tsx` / `context-menu.tsx` / `menubar.tsx` / `navigation-menu.tsx` / `hover-card.tsx` no longer exist as files (zero consumers — the same "latent code" situation Tier 0 found in `checkbox`/`radio-group`, just carried further). This happened without the doc being updated — a Hard Rule 1 miss, corrected here.

The actual tech per primitive, replacing every prior Radix dependency:

| Primitive | Doc previously said | Actual now |
|---|---|---|
| `dialog`, `alert-dialog`, `sheet` | keep Radix `Dialog`/`AlertDialog` | native `<dialog>` + `showModal()` — free focus trap, Escape handling, top-layer stacking |
| `popover` | keep Radix `Popover` | native Popover API (`popover="auto"`) + hand-rolled position math |
| `select` | keep Radix `Select` | `@headlessui/react` `Listbox` (+ `ListboxSelectedOption`) |
| `accordion`, `collapsible` | moved to Tier 0, native `<details>` | done as planned |
| `tabs` | keep Radix `Tabs` | hand-rolled (value-based context, roving tabindex) — **Headless UI's `TabGroup` was evaluated and rejected**, it's index-based and didn't fit the value-based consumer contract; documented in a comment in `tabs.tsx` |
| `tooltip` | keep Radix `Tooltip` | pure daisy CSS (`tooltip`, `tooltip-top/right/bottom/left`, `tooltip-start/center/end`) |
| `dropdown-menu`, `context-menu`, `menubar`, `navigation-menu`, `hover-card` | keep Radix | **files deleted, zero consumers** |

### New locked policy: native → daisy → Headless UI → hand-roll, in that order

Formalized as an ordered checklist for every primitive, new or revisited:

1. **Pure styling, no interactive JS needed** → daisyUI CSS classes on plain markup (`alert`, `avatar`, `badge`, `card`, `input`, `textarea`, `table`, `skeleton`, `tooltip`, `btn`). Cheapest option, already covers ~12 primitives.
2. **Needs real behavior, but a native HTML API covers it** → use the platform: `<dialog>`/`showModal()`, the Popover API, `<details>`/`<summary>`, native `<input type=range|checkbox|radio>`. This is what `dialog`, `alert-dialog`, `sheet`, `popover`, `accordion`, `collapsible`, `checkbox`, `radio-group`, `slider`, `switch`, `toggle` all already do — zero extra dependency, and it's what made removing Radix possible in the first place.
3. **Needs behavior no native API or daisy class provides** (custom-rendered option list with full keyboard nav, combobox, multi-step disclosure with shared state, portal-based menu/popover composition) → **`@headlessui/react`**, not Radix. `select.tsx`'s `Listbox` is the existing precedent — its own comment calls it "the one primitive that genuinely needed a real behavior library." Reach for Headless UI's `Dialog`, `Menu`, `Popover`, `Combobox`, `Listbox`, `Transition`, `RadioGroup`, or `Disclosure` here before anything else.
4. **Headless UI doesn't fit either** (checked and rejected, with a stated reason — e.g. `tabs.tsx`'s index-vs-value mismatch) → hand-roll, same as today. This is the explicit fallback the direction allows ("if not possible in any case then we will keep as it is") — it must be a considered, documented rejection, not a default.

**Radix and `vaul` are permanently out of the stack.** Do not reintroduce `@radix-ui/*` / `radix-ui` / `vaul` for any new component or bug fix — every behavior need identified so far has been covered by tiers 1–3 above.

### Backlog: hand-rolled call sites, evaluated against this order — run 2026-08-04

Each item below was actually worked through (converted, or evaluated and rejected with a stated reason), not just flagged. Verification for the two conversions: `tsc --noEmit` clean + `pnpm build` clean (see Build Verification below).

**Converted:**

- `components/notifications/notification-panel.tsx` — **done.** Was a hand-rolled `createPortal` slide-over (manual backdrop div, manual open/close animation via `requestAnimationFrame`/`setTimeout`, manual `document.addEventListener("keydown", …)` for Escape). Rewritten onto `sheet.tsx` (native `<dialog>` + `showModal()`): dropped `mounted`/`shouldRender`/`animIn` state and the manual Escape listener entirely — `sheet.tsx`'s own `@starting-style` CSS animation and native `cancel`/`close` dialog events already do the same job (and its `::backdrop` is already `rgb(0 0 0 / 0.2)`, i.e. `bg-black/20` — an exact match to what the panel was hand-rolling). Confirmed **not** using daisyUI's own `drawer` CSS component, per the reasoning below.
- `components/sidebar/page-tree.tsx`'s `MoveToDialog` — **done**, found during the sidebar audit (wasn't on the original list). A hand-rolled centered modal (`fixed inset-0 z-[800]` backdrop + `fixed … z-[810]` panel, manual Escape listener) with a search input and a page-tree picker list — no anchor/collision positioning at all, just a fixed top-of-viewport modal. Exactly `dialog.tsx`'s shape. Converted onto `Dialog`/`DialogContent`, overriding `DialogContent`'s default centered/padded look (`top-[16vh]` instead of vertical-centering, `p-0`/`ring-0` since the content supplies its own header/list chrome, `backdrop:bg-black/40` to preserve the original's darker overlay — matching `alert-dialog.tsx`'s 0.4 convention rather than `dialog.tsx`'s default 0.2, since this is a destructive-adjacent "reparent this page" action). Removed the manual Escape listener — native `<dialog>` handles it.

**Evaluated, kept hand-rolled (considered rejection, not a default):**

- `icon-tooltip.tsx` / `icon-tooltip-button.tsx` / `reaction-tooltip.tsx` — **kept.** These are *hover*-triggered, anchor-collision-aware tooltips (flip above/below, clamp to viewport edges via `getClampedLeft`/`getClampedTop`) rendered at arbitrary DOM positions across ~90 call sites. None of the three tiers above actually cover this: daisyUI's CSS `tooltip` (already added in Round 2, used today only in `sidebar.tsx`, a context with no edge-collision risk) has no auto-flip — confirmed against daisy's own docs, same finding as §0's original evidence. The native Popover API's implementation in this repo (`popover.tsx`) always anchors below with no vertical flip. Headless UI's `Popover`/`Transition` are click-triggered, not hover-triggered, and ship no built-in collision detection either (that needs Floating UI's `flip` middleware, which Headless UI's `anchor` prop — v2.2.10, already installed — *does* wire in for `Menu`/`Listbox`/`Combobox`/`Popover`, but only for those click/focus-triggered components, not for an arbitrary hover label). No tier here reaches the current behavior without hand-reimplementing the exact same collision math, for no gain. This is the same conclusion §0 already reached for this exact file — reconfirmed, not new.
- `components/database/{cell-action-overlay,entry-context-menu,card-context-menu,cell-comment-popover,group-header-menu,option-submenu,user-hover-card}.tsx` — **kept.** Same category, more complex: right-click context menus opened at an arbitrary cursor point (`forcePos: {x,y}`, not a DOM trigger element — doesn't fit Headless UI's or the native Popover API's trigger-anchored model at all), cascading multi-popup state (a menu that gets replaced by an icon picker, or a comment view, or a property flyout, each aware of the others via `data-edit-property-exempt`/`[role="alertdialog"]` exemption checks so outside-click dismissal doesn't misfire), and a deliberate "lock scroll instead of reposition" pattern so the popup can't drift from a click point that isn't a stable element. Every one of these is already a considered, comment-documented decision in the file itself. Forcing a Headless UI `Menu`/`Popover` here would mean either reimplementing this same cascade/collision logic inside a different wrapper (no benefit) or dropping real behavior (multi-popup coordination, point-anchoring). Not attempted.
- `tabs.tsx` — **kept**, unchanged from the earlier Revision note. Already evaluated Headless UI's `TabGroup` and rejected it (index-based API doesn't fit the value-based consumer contract). Re-open only if Headless UI's Tabs API changes shape.

**Identified, not yet converted (real candidate, deferred rather than rushed):**

- `components/settings/profile-section.tsx`'s `TimezoneDropdown` — a single-select-from-a-searchable-list dropdown (region-grouped, flip-positioned via hand-rolled `computePos()`) — structurally the same shape `select.tsx` already solved with Headless UI's `Listbox`, and a good fit for `Combobox` (search + single-select) with its `anchor` prop for automatic flip, which would let it drop the manual `computePos`/scroll/resize-reposition listeners entirely. Deferred rather than converted in this pass: it's a live account-settings form with grouped-option rendering to reproduce faithfully, and there's no browser available in this environment to click-test it before shipping — converting it blind is exactly the kind of unverified change the parity-first principle (§ "Resolving the parity ↔ less-code tension") warns against. Good next candidate; budget a dedicated pass with an actual browser check.
- `components/sidebar/{recently-visited-section,favorites-section,private-section}.tsx` and `components/settings/{workspace-general-section,workspace-members-section}.tsx` — now individually inspected. All are the same anchor-positioned flyout/context-menu category as the database overlays, not centered-modal candidates like `MoveToDialog` was — **kept.** `recently-visited-section.tsx`/`favorites-section.tsx`/`private-section.tsx` each portal a "⋯" popup flyout explicitly pinned to `z-[560]` *because* it must render above the sidebar wrapper's own `md:z-[550]` in `workspace-shell.tsx` (documented in-file) — a cross-component stacking relationship that would need to be re-derived, not just dropped, under top-layer dialog/popover semantics. `private-section.tsx` additionally has a cursor-anchored right-click context menu (`z-[200]`, positioned at `menuPos.x/y`, not a DOM trigger). `workspace-general-section.tsx` has an icon-picker flyout and a menu, both anchor/`mounted+pos`-positioned. All of these are `IconTooltip`-portal or anchor-collision cases, already covered by the icon-tooltip/database-overlay verdict above — not attempted, for the same reasons.
- `page-tree.tsx`'s remaining `fixed`/`createPortal` usage (the `⋯` popup menu, the right-click context menu, the `IconTooltip` portal) — same anchor-collision category, not converted for the same reasons. Its one true modal (`MoveToDialog`) is done, above.

---

### Resolving the parity ↔ less-code tension

Pixel-parity and "own less CSS" pull in opposite directions: parity means overriding daisy's defaults, and every override is code we own. The rule that resolves it:

> **Parity is bought in the theme block, not per component.** Density and shape live in `--size-field`, `--size-selector`, `--radius-*`, `--border` — ~40 lines written once. A primitive that cannot reach parity from theme vars alone does **not** get bespoke CSS; it goes on the *refresh-later* list and ships with daisy's look.

Phase 0 sizes that list. If it comes back large, we revisit the parity decision before committing to Phase 3.

## 0. The one architectural decision that drives everything

> ⚠️ **Superseded by the Revision, 2026-08-04 (above).** The "keep Radix" call below was the right decision when Tier 0 shipped, but it stopped being true for `dialog`/`alert-dialog`/`sheet`/`popover`/`accordion`/`collapsible`/`select` before this doc was updated to say so — they moved to native HTML APIs or Headless UI's `Listbox`, not "kept on Radix." `dropdown-menu`/`context-menu`/`menubar`/`navigation-menu`/`hover-card` were deleted outright. Kept below for the original reasoning (still valid re: *why* daisy-CSS-alone wasn't enough), just not as a description of current state.

**We keep Radix where it carries behavior, and drop it where it doesn't.**

shadcn/ui is two things bolted together:

| Layer | What it gives us | daisyUI replacement |
|---|---|---|
| **Behavior** — Radix primitives, cmdk, vaul, react-day-picker | portals, focus trap, collision-aware positioning, roving-tabindex keyboard nav, ARIA wiring, controlled/uncontrolled state | **none — daisyUI ships zero JavaScript** |
| **Styling** — Tailwind class strings + `cva` variants + CSS token contract | the visual design | **this is what we swap** |

daisyUI simulates a few interactions with `<details>`, the checkbox hack, and native `<dialog>`. Those do not survive an app with a sidebar, command palette, nested context menus, and a TipTap editor. So every `@radix-ui/*` import stays; we change what's inside `className`.

Practical consequence: this is **not** "uninstall shadcn, install daisyUI". It is "rewrite 51 primitives' class strings and re-point the token contract", with the component APIs (`<Button variant="destructive">`, `<DialogContent>`) staying identical so the 211 consumer files mostly don't move.

### Radix drops from 26 primitives to ~13

**Drop Radix — the browser or daisy already does the job (~800 LOC deleted):**

`checkbox` · `radio-group` · `switch` → daisy `checkbox`/`radio`/`toggle` on native inputs (native radio groups already do arrow-key nav) · `slider` → `<input type="range">` + `range` · `progress` → `<progress>` · `separator` → `divider` · `label` → native `<label for>` · `accordion`, `collapsible` → `collapse` on `<details>` · `avatar` → daisy `avatar` (Radix only adds image-load fallback) · `scroll-area` → plain `overflow-auto`, scrollbars already styled at [globals.css:379-386](../../app/globals.css#L379-L386) · `toggle`, `toggle-group` → `btn` + `join` + `aria-pressed`

**Keep Radix — daisyUI explicitly does not provide this:**

`dialog` · `alert-dialog` · `sheet` · `popover` · `tooltip` · `hover-card` · `dropdown-menu` · `context-menu` · `menubar` · `navigation-menu` · `select` · `tabs`

Evidence, from daisyUI 5's own docs: the dropdown page states no automatic collision detection or flipping (positioning is fixed modifiers — `dropdown-top`, `dropdown-end`); the modal page states the popover method "doesn't lock background interactions" and the checkbox method "cannot close via Esc key"; the CSS-focus dropdown method warns against putting a `<dialog>` inside it.

Against that, this codebase passes **182** `side=`, 36 `align=`, 30 `sideOffset`, **149** `onOpenChange`, and **100** `asChild`. `asChild` is Radix `Slot` — no daisy equivalent at any price; each one becomes a manual wrapper plus `ref` forwarding.

`command` (cmdk) · `drawer` (vaul) · `calendar`/`date-picker` (react-day-picker) · `resizable` (react-resizable-panels) were never Radix and are unaffected.

**In-repo precedent.** [components/ui/icon-tooltip.tsx](../../components/ui/icon-tooltip.tsx) — our most-used UI file at 90 call sites — is hand-rolled precisely because CSS positioning wasn't enough: it clamps to the viewport via `getClampedLeft` and flips above/below when there's no room. That is collision detection written in JS, by this team, after hitting the exact wall daisyUI's docs describe. Replacing Radix with daisy classes means writing that logic 12 more times, unaudited for a11y.

## 1. Current footprint

| Metric | Count |
|---|---|
| Primitives in [components/ui/](../../components/ui/) | 51 files, ~5,300 LOC |
| Files importing them | 211 files / 403 import statements |
| Radix imports | 58 |
| `cva` variant blocks | 18 files |
| [app/globals.css](../../app/globals.css) | 1,097 lines, 157 CSS variables |
| Semantic-token utility usages (`bg-background`, `text-muted-foreground`, `border-border`, …) | **~11,900** |

That last number is the whole game. If we let it be touched, this is a 9-week project. **Phase 2 exists specifically to keep it at zero.**

## 2. Token mapping — shadcn contract → daisyUI theme

daisyUI defines a fixed 18-variable color contract. Ours has ~40 tokens. The mapping:

### Direct mappings

| Ours | daisyUI | Note |
|---|---|---|
| `--card`, `--popover` | `--color-base-100` | our white surface = daisy's primary surface |
| `--background` | `--color-base-200` | our canvas `#F1F6FB` is tinted *below* card |
| `--muted` | `--color-base-200` / `300` | collides with background — see gaps |
| `--border` | `--color-base-300` | |
| `--foreground`, `--card-foreground`, `--popover-foreground` | `--color-base-content` | 3 tokens collapse to 1 |
| `--primary` | `--color-primary` | |
| `--primary-foreground` | `--color-primary-content` | **rename**, `foreground` → `content` |
| `--secondary` / `--secondary-foreground` | `--color-secondary` / `-content` | |
| `--accent` / `--accent-foreground` | `--color-accent` / `-content` | |
| `--destructive` / `--destructive-foreground` | `--color-error` / `--color-error-content` | **rename** |
| `--success` / `--success-foreground` | `--color-success` / `-content` | |
| `--warning` | `--color-warning` | |
| `--radius-md` | `--radius-field` | daisy has 3 radii (`selector`/`field`/`box`) vs our 5 |

### Gaps — no daisyUI equivalent, these stay as custom vars

- `--muted-foreground`, `--muted-foreground-subtle` — daisy expects `text-base-content/60`. **We cannot do that.** [globals.css:101-109](../../app/globals.css#L101-L109) documents a deliberate 3-tier text contract with measured WCAG ratios and an explicit ban on opacity-derived tiers (`text-muted-foreground/40` lands at 1.7:1). These two tokens survive the migration as custom vars.
- `--ring` — daisy derives focus rings from the component color; we have one measured ring color and a global `:focus-visible` rule.
- `--input` — our form-control boundary is a separate, higher-contrast token than `--border` to satisfy SC 1.4.11. daisy has no such split.
- `--sidebar-*` (8 tokens) — no daisy equivalent.
- `--chart-1..5`, `--syntax-*` (9), `--comment-*` (3), `--shadow-card/raised/float`, `--page`, `--primary-hover`, `--success-subtle`, `--success-light`.
- `--color-neutral` / `--color-info` — daisy requires them; we have no source. Derive: `neutral` from `--foreground`, `info` from `--primary`.

**Net: ~14 of our tokens map cleanly, ~26 stay custom.** daisyUI's theme is a subset of our design system, not a superset.

### Naming collisions to be aware of

`@theme inline` in [globals.css:31-99](../../app/globals.css#L31-L99) already defines `--color-primary`, `--color-secondary`, `--color-accent`, `--color-success`, `--color-warning`. daisyUI defines the **same names**. This is good news: `bg-primary` keeps compiling, it just resolves to the daisy theme value. It also means both cannot be loaded naively — `@plugin "daisyui/theme"` must be the single writer of those five.

## 3. Phased plan

### Phase 0 — Spike (1 day) — *do not skip*

Prove the approach on one screen before committing.

1. `pnpm add -D daisyui@^5.7`
2. Branch `spike/daisyui`. Add `@plugin "daisyui";` to globals.css, remove `@import "shadcn/tailwind.css"` (line 3).
3. Convert **`components/ui/button.tsx` only** to daisy `btn` classes, keeping the exact `cva` variant API (`default | destructive | outline | ghost | secondary | link` × `sm | default | lg | icon`).
4. Tune `--size-field` / `--radius-field` / `--border` in the theme block until buttons hit **current pixel dimensions** — no per-component overrides allowed.
5. Open the 3 densest screens (database table view, editor toolbar, sidebar) and diff visually.

**Exit criteria:** all 6 button variants match today's rendering in light + dark, `asChild` still works, focus ring still visible, no layout shift in the editor toolbar — **with parity achieved from theme vars alone.**

**The real output of this phase is a number:** how much of parity is reachable from the theme block. If buttons need bespoke padding overrides to match, every other control will too, and the *refresh-later* list swallows the migration. Report that finding before Phase 1 starts — it is the go/no-go on the parity decision.

---

### Phase 0 RESULTS — run 2026-08-03, branch `spike/daisyui`, daisyUI 5.7.11

**Verdict: GO on parity — measured, not estimated.**

> **54/54 buttons match the current design EXACTLY**, across 16 computed visual
> properties (height, width, padding, font-size/weight, line-height, radius,
> background, colour, border, gap, text-decoration, letter-spacing, opacity),
> in **both light and dark**. Both sides were measured against **production
> builds**, driven by headless Chromium.

Method: a temporary route rendered all 6 variants × 9 sizes with `data-probe`
attributes; a Playwright script read `getComputedStyle` for every one, on
`main`'s button and on the converted button, and diffed. Screenshots were
compared visually as a second check — which mattered (see finding 3).

**Reachable from the theme block:**
- `--depth: 0` + `--noise: 0` removes daisy's `box-shadow`, inset highlight, `text-shadow` *and* noise layer in one shot. Biggest unknown going in; clean theme-level fix. (Residual: daisy still *emits* an all-transparent `box-shadow` and a zero-size noise `background-image` on every control. Verified inert — `rgba(0,0,0,0) 0 0 0 0`.)
- `--border: 1px`; 3 of our 5 radius steps; `--size-field` / `--size-selector`.

**NOT reachable — the hard finding.** daisy hardcodes its height steps at `6/8/10/12/14 × --size-field`, i.e. ratio **3:4:5:6:7**. Ours (24/32/36/40/44px) is **6:8:9:10:11**. No value of `--size-field` reconciles them:

| `--size-field` | daisy yields | matches ours (24/32/36/40/44) |
|---|---|---|
| `0.25rem` (default) | 24/32/40/48/56 | 2 of 5 |
| `0.225rem` (to fix our 36px default) | 21.6/28.8/36/43.2/50.4 | 1 of 5 |

Same mismatch on padding (daisy 8/12/16/20/24 vs ours 10/12/16/24/28), font-size at lg/xl (daisy 18/22px vs ours 14/16px), and font-weight (daisy 600, ours 500). `--btn-p` is hardcoded on `.btn`, not theme-derived.

**Why this is still a GO — the blast radius is small.** Only **4** primitives have a multi-step size scale: `button`, `input-group`, `sidebar`, `toggle` — and `toggle` is deleted in Tier 0. So the expensive case is `button` alone (9 sizes → ~26 override declarations, all mechanical `[--size:…]` / `[--btn-p:…]` arbitrary properties). 19 other files carry a hardcoded `h-N` needing a one-line override each. This is not the "bespoke CSS everywhere" scenario that would have killed the parity decision.

**Verified in the production bundle, not just asserted:**
- All 5 `--size` and 5 `--btn-p` overrides generate.
- Cascade order is correct — our override lands at byte 263509, daisy's `.btn` at 63035, so our values win.
- Both `workflik-light` and `workflik-dark` emit.

### Architecture change discovered while testing — supersedes Phase 1 as written

The two-theme design in Phase 1 **does not work**. Fixes, in order of discovery:

1. **Never name a custom theme `light` or `dark`.** Those collide with daisyUI's built-in themes and the **built-ins win** — measured: `--radius-field` silently became 4px and `--color-primary` became daisy's own blue. Parity dropped to 6/54 with no error or warning anywhere.
2. **Register ONE theme carrying only structural vars** (`--depth`, `--noise`, `--border`, the three radii, the two sizes) under a unique name, and author **every colour in the existing `:root` / `.dark` blocks** as `--color-base-100: var(--card)` etc. Those blocks are unlayered, so they outrank daisy's layered theme. Colours then have exactly one authoring point, and the WCAG-annotated contract stays the source of truth.
3. **Constraint on that approach:** daisy only emits `.btn-primary` / `.btn-error` / etc. if a registered theme declares colours. Confirmed in the bundle. So the theme block must still declare colours *if* you want daisy's colour modifiers — we don't need them, because our variants set `--btn-color` directly.
4. **The `attribute={["class","data-theme"]}` change is NO LONGER NEEDED.** With colours living in `:root`/`.dark`, the existing `attribute="class"` drives everything. [theme-provider.tsx](../../components/theme-provider.tsx) is **unmodified**. Verified across the full matrix — OS-light/OS-dark × toggle-on/toggle-off all resolve correctly. **Delete this item from Phase 1.**

Before the fix, the failure was real and user-visible: a user on a **light OS** who toggled dark mode got dark surfaces with **light-theme buttons**.

**Three bugs the parity harness caught that review would not have:**
1. **`btn-link` underlines at rest**; ours only on hover. Needs `no-underline`. Caught by *screenshot diff* — `text-decoration` was not in the first probe list. Lesson: a computed-style probe is only as good as its property list; keep the visual check.
2. **`btn-soft` is an OPAQUE tint, not an alpha tint.** Ours is `bg-destructive/10`. Identical on white, visibly different on any non-white surface. Alpha tints have no daisy equivalent — keep ours; do not use `btn-soft`.
3. **`text-sm` must stay in the base class string**, not only in the size variants. The four icon sizes declare no `text-*`, so they inherited `line-height: 1.5` (21px) instead of 20px — a 1px regression on 24 of 54 buttons that would have shipped silently.

**Incidental findings:**
1. **`--size-field` is shared by `btn`/`input`/`select`.** Our input (36px) and default button (36px) happen to agree, so one value serves both. Lucky, not designed — do not change either in isolation.
2. **Radius split is unavoidable.** `input` uses `--radius-xs` (4px), `button` uses `--radius-md` (8px); daisy has a single `--radius-field`. One of the two must carry a local override. 1 line.
3. **Watch item:** daisy injects `:root,[data-theme]{background-color:var(--root-bg)}`. Our unlayered `html { background: var(--background) }` ([globals.css:17](../../app/globals.css#L17)) wins because layered CSS loses to unlayered — correct today, but fragile if anyone later moves that rule into a layer.
4. **Turbopack serves stale CSS after `globals.css` edits.** Cost two false failures during this run (a "0/54" and a "6/54" that were both phantom). **Verify every parity claim against `pnpm build` + `pnpm start`, never the dev server.** This applies to all of Phase 3.

**Limitations of this run — still outstanding:**
- The three dense screens (database table view, editor toolbar, sidebar) were **not** visually inspected: they sit behind auth, the dev database has a single real user account, and no seed/test-user script exists. Note this is **moot for `button`** — 54/54 identical computed geometry means no containing layout can shift — and **premature for everything else**, since no other primitive is converted yet. Revisit at the end of Tier 1 with a throwaway login or a seeded test account.
- Only `button` was converted. The size-scale finding generalises, but per-primitive surprises (like the three above) should be expected.

**Effect on the plan:** no change to the 6–8 week total. Phase 1 loses the theme-provider item and gains the single-theme architecture above. *Refresh-later* list is currently **empty** — full parity was achieved.

**Reusable artifact:** the probe harness (matrix route + Playwright measure script + theme matrix test) is archived in the session scratchpad. It generalises to the remaining ~38 primitives and is worth formalising as a project skill before Tier 1. *Phase 1 generalised it: whole-DOM fingerprint + pixel diff + transition check, driven off an untracked gallery route — see Phase 1 RESULTS.*

### Phase 1 — Theme foundation (2–3 days)

> **Revised after Phase 0.** The original two-theme design does not work — see
> "Architecture change discovered while testing" above. This is the version
> that was measured at 54/54 parity.

Keep `:root` / `.dark` as the source of truth for colour; give daisy only structure.

1. Register **one** uniquely-named theme carrying structural vars only:

   ```css
   @plugin "daisyui" { themes: workflik --default; }

   @plugin "daisyui/theme" {
     name: "workflik";          /* NOT "light"/"dark" — collides with built-ins */
     default: true;
     color-scheme: light;
     --depth: 0;                /* kills box-shadow, inset highlight, text-shadow */
     --noise: 0;
     --border: 1px;
     --radius-field: 8px;       /* --radius-md */
     --radius-box: 10px;        /* --radius-lg */
     --radius-selector: 6px;    /* --radius-sm */
     --size-field: 0.25rem;
     --size-selector: 0.25rem;
   }
   ```

2. Add the daisy colour contract to the **existing `:root` block** as references, so each colour is authored once:

   ```css
   :root {
     /* …existing WCAG-annotated tokens, unchanged… */
     --color-base-100: var(--card);
     --color-base-200: var(--background);
     --color-base-300: var(--border);
     --color-base-content: var(--foreground);
     --color-primary: var(--primary);
     --color-primary-content: var(--primary-foreground);
     --color-error: var(--destructive);
     --color-error-content: var(--destructive-foreground);
     /* …neutral/info have no source token — derive from --foreground / --primary */
   }
   ```

   **No `.dark` duplication is needed.** Both `:root` and `.dark` target `<html>`, so `var(--primary)` re-resolves to the dark value automatically when `.dark` is present. Verified.

3. Keep the ~26 unmapped custom vars exactly as they are today.
4. **No theme-provider change.** `attribute="class"` already drives everything. Do not touch [theme-provider.tsx](../../components/theme-provider.tsx).
5. Verify `disableTransitionOnChange` / `.no-transition` still suppresses the flip smear.

**Exit criteria:** app renders identically to `main`. Zero component files changed. Verify against `pnpm build` + `pnpm start`, **not** the dev server.

---

### Phase 1 RESULTS — run 2026-08-03, branch `feat/daisyui-theme-foundation`

**Verdict: PASS. Exit criteria met.**

> Across **1,300 measured DOM nodes** (9 routes × light + dark), **54 differ,
> and every one of them differs in `color` alone on `<html>`, `<head>` or
> `<title>`** — none of which render. **Zero visible elements changed.**
> All **18 full-page screenshots are pixel-identical** (0 differing pixels).

Two files changed: [globals.css](../../app/globals.css) (+71 lines) and
`package.json`. **Zero component files**, as designed.

**Method.** Because Phase 1 changes no components, the probe was widened from
Phase 0's hand-picked property list to a **whole-DOM fingerprint**: every
element on every route, 56 computed properties plus bounding box, diffed
node-by-node against `main`. Both sides measured on production builds
(`pnpm build` + `pnpm start`) driven by headless Chromium.

Coverage past the login wall came from an **untracked** primitives-gallery
route (`app/parity-harness/`, 296 nodes) listed in `.git/info/exclude`. Being
untracked is the trick: `git checkout` leaves it in place, so byte-identical
JSX renders on both branches and any diff is attributable to the CSS alone. It
renders every Tier-0/Tier-1 primitive **plus bare HTML tags** (`input`,
`select`, `textarea`, `table`, `progress`, `details`, `fieldset`, …), which is
where an unwanted daisy base-layer reset would surface first. The public routes
alone were far too thin (16–94 nodes) to support a parity claim.

**The one real difference.** daisy sets `color` on `:root`, which this app
never did — `<html>` previously inherited the UA default black. Inert in
practice: every visible element sets its own colour, and the value it now
inherits is `--foreground`, which is what it would have wanted anyway. Worth
knowing rather than fixing.

**Transition suppression (exit item 5) — verified empirically, not reasoned.**
`transitionProperty` and `transitionDuration` were both in the probe list and
showed **zero diffs across all 1,300 nodes**: daisy adds no transitions to any
existing element. Separately, of 334 elements on the harness page, 108 animate
at baseline (worst 0.15s); with `.no-transition` on `<html>` → **0 animated**;
with next-themes' injected `*{transition:none!important}` → **0 animated**.
Both guards hold.

**Cost — the one genuine regression.** The CSS bundle grows because daisy emits
its full component stylesheet even though Phase 1 uses none of it:

| | raw | gzipped |
|---|---|---|
| `main` | 342,078 B | 54,990 B |
| Phase 1 | 469,835 B | 72,291 B |
| **delta** | **+127,757 B (+37.3%)** | **+17,301 B (+31.5%)** |

Not a blocker, but it should not be left to stand permanently. It is expected
to come back as Phase 3 deletes shadcn class strings and Phase 5 drops the
shim; if it does not, daisy's `exclude` option can drop unused components.
**Re-measure this number at the end of Tier 1 and again at Phase 5** — if the
gzipped total is not trending back toward baseline, that is a finding.

**Incidental:** the Turbopack `Encountered unexpected file in NFT list` warning
on `next.config.mjs` is **pre-existing** — it reproduces identically on `main`
and is unrelated to daisy. Also note `next start` prints a warning that it does
not work with `output: standalone`; it nonetheless serves the fresh build
correctly, which was confirmed by checking the served CSS hash and mtime
against the build output on every run.

**Gotcha found this run:** a harness route under `app/_parity/` returns 404 —
App Router treats `_`-prefixed folders as **private** and excludes them from
routing. Name it without the underscore.

**Still outstanding (unchanged from Phase 0):** the three dense screens
(database table view, editor toolbar, sidebar) remain visually uninspected —
they sit behind auth, the dev database has a single real user account, and no
seed script exists. Phase 1 does not make this more urgent (zero component
files changed, zero visible diffs), but Tier 1 will. Resolving it needs either
a throwaway login or a seeded test account — **ask before creating either.**

### Phase 2 — Compatibility shim (1–2 days) — *the phase that saves 4 weeks*

Alias every legacy shadcn token to its daisy source, in `@theme inline`:

```css
@theme inline {
  --color-background:         var(--color-base-200);
  --color-foreground:         var(--color-base-content);
  --color-card:               var(--color-base-100);
  --color-card-foreground:    var(--color-base-content);
  --color-popover:            var(--color-base-100);
  --color-border:             var(--color-base-300);
  --color-primary-foreground: var(--color-primary-content);
  --color-destructive:        var(--color-error);
  --color-destructive-foreground: var(--color-error-content);
  /* … */
}
```

Now all ~11,900 existing utility usages keep compiling and keep rendering correctly. Feature code is frozen; only [components/ui/](../../components/ui/) needs work.

**Exit criteria:** `pnpm build` clean, visual parity, still zero feature files changed. Tag this commit — it's the rollback point.

---

### Phase 2 RESULTS — run 2026-08-03 — **CANCELLED, no shim needed**

**Verdict: the shim above is unnecessary. Phase 2 is a no-op. Skip it.**

Phase 2 was written for the *original* architecture, where the daisy theme
block owned the colours — so `--background` and friends had to be re-pointed at
daisy values, and ~11,900 utility usages needed aliases to survive the move.
**The architecture we actually landed in Phase 1 is the inverse:** `:root`
owns the colours and daisy points at *us*. Nothing was ever re-pointed, so
there is nothing to alias.

Measured, on production builds, with an untracked token-probe route
(`app/parity-tokens/`) rendering 86 colour utilities as swatches — a utility
Tailwind never generated leaves the element at `rgba(0,0,0,0)`, which is the
signal the page is built to read:

> **83 of 86 tokens resolve byte-identically between `main` and the daisy
> branch, in both light and dark. Zero regressions.**

The 3 that changed are daisy names *newly becoming available*, all at correct
values:

| utility | `main` | daisy branch |
|---|---|---|
| `bg-error` | *did not compile* | `rgb(200,30,30)` — our `--destructive` |
| `text-error` | *did not compile* | `rgb(200,30,30)` |
| `text-primary-content` | *did not compile* | `#FFF` light / `#06283D` dark |

**The finding that matters — Phase 4's codemod is unsafe as written.** Because
our theme block declares no colours, daisy registers almost none of its colour
names as Tailwind utilities. Verified dead on the daisy branch:

`bg-base-100` · `bg-base-200` · `bg-base-300` · `bg-base-content` ·
`text-base-content` · `bg-primary-content` · `bg-secondary-content` ·
`bg-accent-content` · `bg-neutral` · `bg-neutral-content` · `bg-info` ·
`bg-info-content` · `bg-success-content` · `bg-warning-content` ·
`bg-error-content` · `text-error-content` · `text-info` · `text-neutral` ·
`border-base-300` · `border-error`

So of the renames Phase 4 step 1 proposes, **only three targets exist**
(`bg-error`, `text-error`, `text-primary-content`). The rest —
`bg-card`→`bg-base-100`, `bg-background`→`bg-base-200`,
`text-foreground`→`text-base-content`, `border-border`→`border-base-300`,
`bg-destructive-foreground`→`bg-error-content` — would compile to **nothing**
and silently strip styling from hundreds of call sites. A build would stay
green throughout.

**Recommendation: drop the renames entirely rather than narrow them.** They buy
nothing under this architecture — our names are the authored source of truth,
they are more descriptive than daisy's, and the WCAG contract is annotated
against them. Renaming 650+ call sites to reach a vocabulary we do not use is
pure risk. *(If daisy's names are ever wanted, the way to get them is to
declare colours in the theme block — which re-introduces the two-source-of-
truth problem Phase 1 deliberately removed.)*

**Trap to avoid:** `border-error` and `border-base-300` *look* like they work —
they compute to `#C3D7E8`. That is a global default border-colour showing
through, not the utility resolving. Do not read a plausible-looking colour as
proof a utility compiled; check it against `main`.

**Knock-on effects:** Phase 2 drops from the timeline (−1–2 days). Phase 5 step
1 ("delete the shim aliases one group at a time") disappears with it — but so
does the call-site discovery mechanism it provided, which is only acceptable
*because* we are no longer renaming. Phase 4 shrinks to steps 2–4.

**Pre-existing, unchanged, not our problem:** 30 legacy `bg-*` utilities
(`bg-chart-1..5`, `bg-input`, `bg-ring`, `bg-sidebar-primary`,
`bg-accent-foreground`, …) do not compile on `main` either. Those tokens are
only ever used as `text-*` or `border-*` in real code. Identical before and
after; noted so a future run does not mistake them for a daisy regression.

### Phase 3 — Primitive conversion (3–4 weeks)

51 files, converted in usage-frequency order so risk front-loads. Each primitive: keep the Radix structure and the exported API, swap the class strings to daisy classes, delete the `cva` block only where daisy modifiers cover every variant.

**Tier 0 — delete Radix where it isn't earning its keep (2–3 days)**
The 13 primitives listed in §0. Net **negative** LOC, no behavior risk, and it directly serves the "own less code" goal. Do it first — it is the cheapest win in the project and it de-risks nothing else, so it can run in parallel with Tier 1.
→ Watch one thing: native `<input type="checkbox">` inside the database views may need `form` attribute handling that Radix was papering over. Check the bulk-select paths.

#### Tier 0 batch 1 — `separator`, `label`, `progress` — done 2026-08-03

**Verified: 1,300 nodes, 18/18 screenshots pixel-identical.** The only style
diffs are the 54 known-inert `color` entries on `html`/`head`/`title` carried
over from Phase 1. `separator` and `label` produced **zero attribute diffs** —
the hand-written ARIA matches Radix's output exactly.

**The harness was extended for this tier.** Computed style alone is the wrong
instrument for Tier 0: replacing a Radix primitive with hand-written markup can
drop ARIA while every pixel stays put. The probe now captures **every attribute
on every element** (sorted, `class` excluded) and diffs those too. It paid for
itself immediately — see below.

**Bug found on `main` (pre-existing, not introduced here):
`<Progress>` never told assistive tech its value.** The component destructured
`value` out of props and used it only in the inline `transform`, so it was
never forwarded to `ProgressPrimitive.Root`. Radix therefore saw no value and
rendered `data-state="indeterminate"` with **no `aria-valuenow`** — for
`<Progress value={60} />`. Sighted users saw a correct 60% bar; a screen reader
was told the value was unknown. The rewrite fixes it
(`aria-valuenow=60`, `data-state="loading"`, `data-value=60`) with the
transform, and therefore every pixel, unchanged.
→ **`Progress` currently has no consumer in app code** — only the harness
imports it — so the bug was latent. Worth deciding whether the component should
exist at all before Tier 1 spends time on it.

**Deviation from the plan, taken deliberately:** §0 lists `progress` as
"→ `<progress>`". It is staying a `div`. Our bar is a 2px track with a
translated fill; matching that on a real `<progress>` means
`::-webkit-progress-value` / `::-moz-progress-bar`, which take different
declarations and diverge across engines. Under parity-first that trade is not
worth it. Consequence: `progress` is the one Tier 0 file that is **not**
LOC-negative (31 → 64 lines), because the ARIA Radix supplied now has to be
written out. The dependency reduction is the win, not the line count.

`separator` and `label` both also **dropped `"use client"`** — separator is now
a pure presentational div (server-renderable), and label keeps the directive
only for the one handler that suppresses double-click text selection, which is
the sole behaviour Radix's Label contributed.

#### Tier 0 batch 2 — `checkbox`, `switch`, `radio-group` — done 2026-08-03, verified by user in-browser

Found and fixed one real bug in review: `checkbox.tsx` didn't track uncontrolled
`defaultChecked` state (only read the `checked` prop), so `<Checkbox
defaultChecked />` always rendered empty. `switch.tsx`/`radio-group.tsx`
already had this right. Confirmed fixed via screenshot.

#### Tier 0 batch 3 — `slider`, `accordion`, `collapsible`, `avatar`, `scroll-area`, `toggle`, `toggle-group` — done 2026-08-03

Completes Tier 0 (all 13 primitives from §0). **Zero consumers in app code for
any of these seven** — confirmed before converting. Moved fast per explicit
request to stop deep-verifying each step; typecheck + lint pass, no
build/browser check done on this batch.

- `slider` — native `<input type="range">`. Radix's multi-thumb support is
  **dropped**, not emulated (a native range input has exactly one thumb). Fine
  today since nothing uses it; would need a real rethink if a future consumer
  needs multiple thumbs.
- `accordion` — native `<details name="...">`/`<summary>`. `type="single"`
  exclusivity uses the browser's own same-`name` grouping (Chrome 120+/Safari
  17.4+/Firefox 129+), not JS. **Radix's controlled `value`/`onValueChange` API
  is dropped** in favour of native uncontrolled `open`/`defaultOpen` per item —
  a real API contract change, acceptable only because nothing consumes it yet.
  Slide animation is also gone (native `<details>` has none); this was already
  true of the plan's proposed mapping, not a regression I introduced.
- `collapsible` — same `<details>` approach, keeps Radix's `open`/`onOpenChange`
  shape since that one's cheap to preserve.
- `avatar` — plain `<img>`, **not `next/image`**, a deliberate exception to
  Hard Rule 26. Avatar sources are arbitrary user/external URLs; next/image
  errors on any host not in `next.config`'s `remotePatterns`, which this
  primitive can't guarantee. Radix's own `AvatarImage` was a plain `<img>` too.
  Flagged rather than silently decided — worth a second look before a real
  consumer adopts it.
- `scroll-area` — plain `overflow-auto` div. Radix's custom scrollbar/thumb is
  dropped entirely (not reimplemented) since scrollbars are already styled
  globally. The `ScrollBar` named export no longer exists — harmless today
  (zero consumers), but it's a breaking export removal if anyone adds one.
- `toggle` / `toggle-group` — native `<button aria-pressed>`. Selection state
  (single/multiple, controlled/uncontrolled) is tracked in React, matching the
  `checkbox`/`switch`/`radio-group` pattern from batch 2, not CSS
  pseudo-selectors.

**This batch has not been visually verified at all** — no build, no
screenshot, no click-through. Tier 0 is now code-complete; before trusting any
of batch 3, run it and look at it the way batch 2 was checked.

**Real usage differs sharply by file** — checked before converting rather than
assumed from the plan's blanket "check the bulk-select paths" warning:
- `checkbox.tsx` and `radio-group.tsx` have **zero consumers anywhere in app
  code** — same latent-code situation as `progress`.
- `switch.tsx` has real usage: **6 files, 11 render sites**, all controlled
  (`checked` + `onCheckedChange`, never `defaultChecked`), a few with
  `disabled` or `aria-label`. No call site uses a `size` prop.
- **The plan's stated risk doesn't materialize.** `table-view.tsx`'s bulk-select
  checkboxes (row-select and select-all, including the `indeterminate` state)
  already use a raw native `<input type="checkbox" className="sr-only">` —
  they never went through Radix or `components/ui/checkbox.tsx` at all. Nothing
  to break there. That file's sr-only pattern is what these three now follow.

**Approach — state-driven classes, not CSS pseudo-selectors.** All three
compute their visual classes from React state (`checked`/`disabled`/`size`
props via `cn()`), the same way `table-view.tsx` already does, rather than
relying on `data-checked:`/`peer-checked:`/`has-checked:`-style Tailwind
variants reacting to a native `:checked`/`:disabled` pseudo-class. This was a
deliberate pivot, not the original plan: an attempt to verify exactly which of
those variants compile in this Tailwind v4 config burned a lot of time on
inconclusive, self-contradicting signals (a raw-text substring search against
the minified CSS produced false positives — e.g. searching for
`checked\:bg-primary` matched inside `data-checked\:bg-primary`, look like a
hit for a rule that was never actually generated) before it was cut short.
**That question is still open** — a real answer needs anchored selector checks
(`.exact-class{` boundaries) or, more simply, just reading the rendered result
in a browser, not text-matching the bundle. Sidestepping it via React state
means these three don't need the answer to be correct.

**Consequence: `checkbox` and `switch` restructure the DOM by one level.**
Radix's `Root` was simultaneously the interactive element and the visual box
(button, or track for Switch), with the icon/thumb as a child. A native
`<input>` is a void element and can't contain that child, so all three now
render `<span data-slot="…"><input/>{visual child}</span>` — the label pairing
contract is preserved (`data-slot` + `.peer` moved to the wrapper, verified as
the only two things `label.tsx`'s `peer-data-[slot=…]` selectors depend on),
but this is a real structural change, not just a class-string swap, and it has
**not been verified against `main`** — no build, no screenshot, no computed-
style diff. Unlike every other change in this plan, this one is unverified.

**`radio-group` keeps the native arrow-key navigation the plan is banking on**
by giving every `RadioGroupItem` under one `RadioGroup` the same `name`
(auto-generated via `useId` if the consumer doesn't pass one) — that's the
platform behavior, not something this code implements.

**Next step, explicitly: run it, look at it, send back what's wrong.** `pnpm
build && pnpm start`, open `/parity-harness` in light and dark, check
checkbox/switch/radio-group visuals and the Space/Tab/Arrow-key behavior by
hand. The verification discipline used everywhere else in this document
(computed-style diff vs `main`, pixel diff, attribute diff) was intentionally
skipped for this batch — it should still happen before this is trusted, just
not self-inflicted through more raw-text CSS archaeology.

**Tier 1 — high blast radius (week 1)**
`button` (61 uses) · `input` (28) · `label` (14) · `switch` (12) · `select` (8) · `card` (6) · `badge` (4) · `textarea` (2)
→ daisy `btn` / `input` / `label` / `toggle` / `select` / `card` / `badge` / `textarea`. Straight class swaps; highest value per file.

#### Tier 1 status — 2026-08-03

This table overlaps Tier 0 and undersells how different these 8 files' actual
remaining work is. Splitting out what really happened:

- **`button` — done, ported from the Phase 0 spike.** Already measured 54/54
  exact parity against `main` (production build, light+dark) before this
  branch existed; nothing new to verify. `spike/daisyui`'s comments were
  updated from draft-phase to permanent.
- **`label`, `switch` — already done in Tier 0** (batches 1 and 2). Nothing
  left to do; they're only in this table because the plan's Tier 0/Tier 1
  lists overlap.
- **`input`, `card`, `badge`, `textarea` — deliberately left untouched.** All
  four already have **zero Radix dependency** — plain native elements with our
  own hand-tuned Tailwind. There is no dependency-removal work here; the only
  thing Tier 1 would do to them is swap to daisy's *own* `input`/`card`/`badge`
  component classes for the "own less code" goal, and that is a real
  visual-parity gamble I have not measured — unlike `button`, which had a
  dedicated spike. Given `input` alone has 28 real consumers, guessing at
  whether daisy's `input`/`card` classes reach parity (padding, height,
  potential double-application with our own border/background/ring classes)
  is exactly the kind of unverified change the parity-first rule exists to
  prevent. Left as-is; the "own less code" win is deferred, not lost.
- **`select` — deferred to the Tier 3 batch, not done here.** It's tabulated
  under Tier 1 by usage count, but its actual conversion is Tier-3-shaped:
  Radix's structure (portal, positioning, keyboard nav) stays untouched per
  §0's locked decision, and only daisy's visual classes get borrowed onto it —
  same treatment as `dialog`/`dropdown-menu`/etc. It also carries a documented
  z-index fix (`z-[600]`, see the comment in the file) from a real past bug;
  that shouldn't be touched in a fast, unverified pass.

**Net new work this pass: `button` only.** The rest of the table was already
done, deferred with a stated reason, or reclassified to where it actually
belongs.

**Tier 2 — app-specific wrappers (week 1–2)**
`confirm-dialog` (72 uses) · `icon-tooltip-button` (18) · `role-select` (10) · `logo` · `time-ago` · `save-status` · `reaction-tooltip`
→ *Our* compositions over the primitives. Once Tier 1 lands they mostly follow for free.
→ **`icon-tooltip` (90 uses) is not in this tier.** It is hand-rolled with inline styles on four CSS vars ([icon-tooltip.tsx:54-57](../../components/ui/icon-tooltip.tsx#L54-L57)) and touches no Tailwind class or Radix import. It needs a variable rename and nothing else — minutes, not days. Do not budget it as a conversion.

#### Tier 2 status — 2026-08-03: **zero code changes, all seven files checked**

"Mostly follow for free" undersold it — every file needs **no edit at all**:

- `icon-tooltip-button`, `save-status`, `reaction-tooltip` — all three already
  style directly off our own tokens (`text-muted-foreground`, `bg-warning/10`,
  `var(--popover)`, …), no shadcn/Radix class or import anywhere in them.
  `reaction-tooltip` is the same hand-rolled-inline-vars pattern as
  `icon-tooltip` above. Since Phase 2's findings cancelled the token-rename
  codemod, there is no rename coming either — these files are simply done.
- `logo`, `time-ago` — no design-system coupling of any kind (plain
  `next/image` and plain text respectively).
- `confirm-dialog`, `role-select` — pure compositions over `alert-dialog` and
  `select`. They inherit whatever those two look like automatically; there is
  nothing to edit in the wrapper itself. Their real dependency is Tier 3
  landing, not anything here.

**Tier 3 — overlays, Radix-heavy (week 2–3)**
`dialog` (168 LOC) · `alert-dialog` (12 uses) · `sheet` (150) · `drawer` · `popover` · `tooltip` · `dropdown-menu` (269) · `context-menu` (263) · `menubar` (280) · `hover-card`
→ Radix `Portal`/`Content`/`Overlay` structure is **unchanged**. We borrow daisy's `modal-box` / `dropdown-content` / `menu` *visual* classes onto Radix's elements. Do **not** switch to daisy's `<dialog>` or `<details>` patterns — we lose focus trap and collision detection.

**Tier 4 — no daisy equivalent, restyle by hand (week 3–4)**
`sidebar` (705 LOC) · `command` (192, cmdk) · `calendar` (226, react-day-picker) · `date-picker` · `resizable` · `navigation-menu` (164) · `input-group` (153) · `table` · `tabs` · `pagination` · `breadcrumb` · `skeleton` · `alert` · `sonner`
*(the former Tier-4 form controls — `checkbox`, `radio-group`, `slider`, `progress`, `separator`, `avatar`, `accordion`, `collapsible`, `scroll-area`, `toggle`, `toggle-group` — moved to Tier 0 and are deleted rather than restyled)*
→ daisy's `menu`/`table`/`tabs`/`steps` help for some. `sidebar.tsx` is 705 lines of our own logic (collapse state, mobile sheet, keyboard shortcut, rail) with its own `--sidebar-*` tokens — it gets a token re-point and a hand restyle, not a daisy component. Budget ~3 days for it alone.

Per-file exit criteria: renders in light + dark, keyboard nav intact, `data-slot` attributes preserved (the `:where()` transition rule at [globals.css:359-365](../../app/globals.css#L359-L365) and `[data-slot="sidebar-menu-button"]` depend on them).

### Phase 4 — Feature-code sweep (1 week)

Only now touch the 211 consumer files, and only for what the shim can't cover:

1. ~~Codemod the safe renames repo-wide: `bg-destructive`→`bg-error` (293), `text-destructive`→`text-error` (358), `text-primary-foreground`→`text-primary-content`, etc. Mechanical, `sed`-able, verified by build.~~ **DROPPED — see Phase 2 RESULTS.** Only 3 of the target utilities exist under the landed architecture; the rest compile to nothing and a build stays green while styling silently disappears. "Verified by build" was the unsafe assumption here. We keep our token names.
2. Hand-review the ~30 files that use `cva` directly or compose raw Radix outside `components/ui/`.
3. Fix the `@layer components` hover rules at [globals.css:425-445](../../app/globals.css#L425-L445) — they key off `button.bg-primary` / `button.bg-destructive`, which stop matching once buttons carry `btn btn-primary` instead. Re-target to `.btn-primary` / `.btn-error`, or delete in favour of daisy's built-in hover states.
4. TipTap/ProseMirror block (~600 lines from [globals.css:447](../../app/globals.css#L447) on) — pure custom CSS on our own vars. Mostly survives untouched; audit only where it references remapped tokens.

### Phase 5 — Decommission (2–3 days)

1. ~~Delete the Phase-2 shim aliases, one group at a time, fixing the build after each. Any survivor is a call site Phase 4 missed.~~ **N/A — there is no shim** (Phase 2 cancelled). Harmless to drop only because Phase 4's renames are dropped too; if renames are ever reinstated, this discovery mechanism has to be replaced with something else.
2. `pnpm remove shadcn` · delete [components.json](../../components.json) · drop `@import "shadcn/tailwind.css"`.
3. Decide on `class-variance-authority` (18 files) — keep it. daisy modifiers don't cover our compound variants, and `cva` is orthogonal to the styling library.
4. **Keep** `cmdk`, `react-day-picker`, `react-resizable-panels`, `clsx`, `tailwind-merge`, `tw-animate-css`, `sonner`. None of these are shadcn. ⚠️ *`radix-ui` is not in this list because it's already gone (see Revision, 2026-08-04) — no removal step was ever needed since nothing here re-added it. `vaul` was never installed at all.*
5. Rewrite [doc/docs/ui-design.md](./ui-design.md) against the new contract.

### Phase 6 — QA (1–2 weeks, overlappable)

- 66 app routes × light/dark, at 3 breakpoints.
- Re-measure the WCAG contrast contract. Every ratio annotated in [globals.css:110-283](../../app/globals.css#L110-L283) is now asserted against daisy-sourced values and must be re-verified — especially the dark-mode polarity flips (`--primary` goes light, `--primary-foreground` goes dark) which daisy's `primary-content` may not reproduce automatically.
- Keyboard-only pass over every overlay: dialog, sheet, dropdown, context menu, command palette, select, date picker.
- Editor-heavy screens (TipTap toolbar, bubble menu, mention autocomplete) and the database/table views, which are the densest UI and the most likely to break on daisy's larger default control sizing.

## 4. Timeline & risk

| Phase | Duration | Merges to `main` |
|---|---|---|
| 0 — Spike (**go/no-go on parity**) | 1 day | ✅ done — `spike/daisyui`, kept for its button conversion |
| 1 — Theme foundation | 2–3 days | ✅ done — on `feat/daisyui-theme` |
| 2 — Compat shim | ~~1–2 days~~ | ❌ **cancelled — measured as a no-op, see Phase 2 RESULTS** |
| 3 — Tier 0: delete 13 Radix primitives | 2–3 days | ✅ **done** — on `feat/daisyui-theme` |
| 3 — Tier 1: `button` | — | ✅ **done** — ported from spike, 54/54 measured |
| 3 — Tiers 1 (rest)/2/3/4: restyle ~37 more primitives | ~~3–4 weeks~~ | ⚠️ **partially reopened, 2026-08-04** — "decided against" on 2026-08-03 (see below), then Round 2 added daisy classes to 8 static primitives (`card`/`alert`/`badge`/`avatar`/`input`/`textarea`/`skeleton`/`table`), and separately (undocumented until the 2026-08-04 Revision) `dialog`/`alert-dialog`/`sheet`/`popover`/`accordion`/`collapsible`/`select` moved off Radix to native APIs / Headless UI. Remaining candidates tracked in the Revision's backlog. |
| 3 — Round 3: form controls onto daisy component classes | 2026-08-10 | ✅ **done** — `checkbox`/`radio-group`/`switch` onto `checkbox`/`radio`/`toggle`, plus the `--depth: 0` regression fix (every button had been painting shadows). `dialog`/`alert-dialog`/`popover` evaluated and rejected with stated reasons. See Round 3 below. |
| 4 — Feature sweep | 1 week | N/A — depended on the renames above, which were dropped |
| 5 — Decommission | ~~2–3 days~~ | ⚠️ Radix is fully gone (not by way of this phase — see Revision, 2026-08-04) and `shadcn` was removed (see Postscript below). Nothing left to decommission either way. |
| 6 — QA | — | Standard QA on the two merged phases, not a 1–2 week program |
| **Total** | **superseded — see Revision, 2026-08-04, top of doc** | |

### Decision, 2026-08-03: stop here — Tier 0 is the finish line

Everything past Tier 0 turned out to be optional, not sequential blocking
work, once the actual landed architecture (not the original plan's
assumption) was accounted for:

- **Phase 2 was cancelled** — measured as a no-op (see Phase 2 RESULTS). Our
  tokens were never re-pointed at daisy's, so nothing needed aliasing.
- **Because of that, Tier 4's codemod is unsafe** (see Phase 2 RESULTS) and was
  dropped, not narrowed — most of its target class names (`bg-base-100`,
  `text-base-content`, …) don't even compile under this theme.
- **Radix never leaves Tiers 1 (remaining)/3/4's files** — `input`, `select`,
  `card`, `badge`, `textarea`, `dialog`, `alert-dialog`, `sheet`, `popover`,
  `tooltip`, `dropdown-menu`, `context-menu`, `menubar`, `hover-card`, `sidebar`,
  `table`, `tabs`, … either had no Radix to begin with or keep it by locked
  decision (§0). Converting them is therefore **not** dependency removal —
  it's swapping working, hand-tuned classes for daisy's own component classes,
  purely for the "own less code" / "team prefers daisy's semantic classes"
  preference from the Decisions table. It was never required.
- That swap also has **no parity measurement behind it** the way `button` did.
  `alert-dialog` alone backs `confirm-dialog`'s 72 call sites — every delete
  confirmation in the app (Hard Rule 23). Guessing at daisy's `modal-box`/`btn`
  class contracts on that surface, without the kind of Phase 0 spike that
  caught 3 real bugs on `button` alone, is a real regression risk with no
  corresponding safety win.
- **Tier 0 is where the actual value was.** ~800 LOC of Radix deleted across
  13 primitives, `checkbox`'s latent `defaultChecked` bug caught and fixed
  along the way, zero shadcn/daisy conflicts introduced. That's the part of
  the plan's motivation ("shrink `components/ui/`; drop the shadcn dependency")
  that was actually achievable safely.

**Decided: stop here.** `dialog` / `alert-dialog` / `sheet` / `popover` /
`tooltip` / `dropdown-menu` / `context-menu` / `menubar` / `hover-card` /
`input` / `select` / `card` / `badge` / `textarea` / everything in the old
Tier 4 list, and the Phase 4 feature-sweep renames, are left exactly as they
are — working, on our own tokens, zero risk. If daisy's visual language is
wanted for any of these later, that's new, separate work with its own parity
check, not a continuation of this migration.

> ⚠️ **"Left exactly as they are" did not hold — corrected in the Revision, 2026-08-04 (top of doc).** `dialog`, `alert-dialog`, `sheet`, `popover`, `accordion`, and `collapsible` were subsequently moved off Radix onto native HTML APIs, and `select` onto Headless UI's `Listbox` — `dropdown-menu`/`context-menu`/`menubar`/`navigation-menu`/`hover-card` were deleted (zero consumers). None of that was a continuation of *this* migration's Radix-preserving decision; it happened separately and wasn't reflected here until now. `input`/`card`/`badge`/`textarea` did get daisy classes added, but under Round 2 below (2026-08-04), not this decision.

### Round 2, 2026-08-04: styling-foundation adoption — goal changed

> This round and the **Revision, 2026-08-04** (top of doc) landed the same day and cover different halves of the same policy: this section is the *static/styling* half (daisy CSS classes on `card`/`alert`/`badge`/`avatar`/`input`/`textarea`/`skeleton`/`table` — tier 1 of the Revision's native → daisy → Headless UI → hand-roll order), the Revision is the *behavioral* half (confirms `dialog`/`select`/`sheet`/etc. already left Radix for native APIs or Headless UI, and sets the going-forward rule for anything still interactive). Read both; neither alone is the full picture.

The "stop here" decision above was made under a **dependency-removal**
framing: convert a primitive only if doing so sheds Radix (or another JS
dependency) and can be measured at zero visual regression. Revisited
2026-08-04 — the actual goal is **consistency**, not code reduction: adopt
daisyUI's classes as the standard styling vocabulary across static/visual
primitives, accepting minor visual drift where daisy's defaults differ from
today's pixel-exact values. Complex-interaction primitives (`dialog`,
`popover`, `select`, `sheet`, `tooltip`, `tabs`, `command`, `calendar`,
`date-picker`) are explicitly **out of scope for this goal** — they keep
native-browser/Headless UI behavior; only their static-styling siblings are
candidates.

**Method, this round:** for each candidate, add daisy's base class alongside
the existing token classes rather than replacing them — Tailwind's utilities
layer already outranks daisy's components layer in this build (established in
Phase 0: "our override lands at byte 263509, daisy's `.btn` at 63035, so our
values win"), so every explicit radius/border/color/spacing override keeps
winning the cascade unless deliberately removed. This makes the daisy class
additive: free vocabulary/semantics now, and a smaller diff later if a
component's bespoke overrides are ever relaxed toward daisy's own defaults.

**Card spike, done first to re-test the "zero benefit" assumption.**
Measured (production build, Playwright computed-style diff + screenshots,
light+dark) before adding anything: `card` alone produces **zero visible
diff** — two inert side effects only (`outline-color: transparent`,
irrelevant since focus rings here are box-shadow-based, not native outline;
and `position: relative`, checked against the one real consumer,
`bookmark-block.tsx`, whose absolutely-positioned overlay is already anchored
to its own `relative` wrapper, unaffected). Confirmed there is no
"own-less-code" win available — daisy's card expects a `card-body` wrapper
this component's per-section (`--card-spacing`) padding model doesn't use, so
every existing override still has to stay. Kept `card` + `card-title` anyway,
because under the revised goal the addition itself (vocabulary, zero risk) is
the point, not a reduction.

**Converted this round** (base daisy class added, all existing token
overrides kept — colors/radii/spacing unchanged unless noted):

| Primitive | Class added | Notes |
|---|---|---|
| `card` | `card`, `card-title` | Zero visual diff, measured. `card-body`/`card-actions` **not** adopted — would require restructuring `CardHeader`/`CardContent`/`CardFooter` off their own `--card-spacing` padding model, a real DOM/API change, not a class swap. |
| `alert` | `alert` | Previously had **no radius at all** (square corners, unlike anything else in the app). Added `rounded-[var(--radius-md)]` explicitly — the "panels" bucket in the radius table — rather than inherit daisy's own default (`--radius-box`, 10px), so alerts stay on the documented 5-step scale for the right bucket. This is the one real, deliberate visual change in this round. |
| `badge` | `badge` | No visible diff — existing `rounded-[var(--radius-xs)]` and alpha-tinted variant colors already override daisy's badge-color defaults, same reasoning as `button`'s `btn-soft` alpha-tint finding. |
| `avatar` | `avatar` | No visible diff — daisy's `avatar` class doesn't set dimensions itself (sizing is Tailwind `size-*` on the inner element per daisy's own docs), so it's compatible with the existing `data-size` scheme. |
| `input` | `input` | No visible diff — existing `h-9`, `rounded-[var(--radius-xs)]`, border/bg/padding all still win. (Note: `--radius-xs` here predates this round and doesn't match the radius table's own "buttons, inputs, tags → radius-sm" bucket — pre-existing, out of scope for this pass, not introduced by it.) |
| `textarea` | `textarea` | No visible diff — the underline-only style (`border-transparent` + `border-b-input`, `rounded-none`) still fully overrides daisy's boxed default. |
| `skeleton` | `skeleton` | **Caught a regression in verification**: daisy's `.skeleton` ships its own default `border-radius` (`--radius-box`, 10px); since the component had no radius class of its own to win the cascade, it silently gained 10px corners. Fixed by adding `rounded-[var(--radius-sm)]` explicitly — which also brings the component in line with UI Rule 12's own documented pattern (`bg-muted animate-pulse rounded-[var(--radius-sm)]`) that the component wasn't actually implementing before. |
| `table` | `table` (on the `<table>` element) | Same regression class as `skeleton`: no existing radius override, so daisy's `--radius-box` leaked through. Fixed with `rounded-none` to preserve the existing square-cornered table. Did **not** add `table-zebra` — that's a new visual behavior, not a token-alignment change. |

**Verification used for this round:** `pnpm build` + `pnpm start` (never dev
— Turbopack serves stale CSS, per the Phase 0 finding), Playwright
computed-style probe across the `[data-probe]` nodes in
`app/parity-harness/page.tsx` for the touched primitives, plus full-page and
per-section screenshots in light and dark. This is lighter than Phase 0's
full 16-property matrix (parity is no longer the bar, per the goal change)
but still catches silent regressions like the skeleton/table radius leak
above — computed-style diffing remains worth doing even when pixel-parity
isn't required, because "silent 10px corners nobody asked for" is a different
failure mode than "doesn't match the old design," and still worth catching
before merge.

**Not converted this round — real technique conflicts, not just untested
drift:**

- **`separator` → daisy `divider`.** daisy's divider renders its line via
  `::before`/`::after` pseudo-elements with a built-in `margin: 1rem 0`,
  designed to sit *between* flex children with optional text in the gap.
  This component's `Separator` **is** the line itself (explicit
  `h-px`/`w-px` + `bg-border`, zero built-in margin, orientation via
  `data-orientation`). Adding `divider` on top would layer daisy's own
  (near-invisible, `opacity: .1`) pseudo-lines and inject an unrequested
  `1rem` margin on every one of this app's separator call sites — a real
  layout regression, not a token realignment. Adopting daisy's actual
  technique instead of layering would mean dropping the box-based render
  entirely, which un-does Tier 0's already-verified "pixel-identical, zero
  attribute diffs" result for this exact file. Left as-is pending an explicit
  decision on which rendering technique wins.
- **`breadcrumb` → daisy `breadcrumbs`.** This component already renders its
  own separator explicitly (`<BreadcrumbSeparator>` with a `CaretRightIcon`).
  daisy's `breadcrumbs` class is documented to auto-insert its own separator
  between `<li>` children; whether that targeting is scoped narrowly enough
  to skip an `<li>` that is itself the separator wasn't verified, and a wrong
  guess here is a visible duplicate-separator bug, not a color mismatch. Left
  as-is; verifying this needs a live render check before it's safe.
- **`progress` → daisy `.progress`.** No action possible without
  restructuring: daisy's progress styling depends on
  `::-webkit-progress-value` / `::-moz-progress-bar`, pseudo-elements that
  only exist on a real `<progress>` element. This component is deliberately
  a plain `div`+`div` (track+fill), for the cross-engine styling reasons
  already documented at the top of `progress.tsx` — the same reasons that
  ruled out native `<progress>` in Tier 0. Re-opening that tradeoff wasn't
  asked for.
- **`pagination` → daisy `join`/`join-item`.** Already inherits daisy's `btn`
  vocabulary indirectly (`PaginationLink` renders through `<Button>`, which
  carries `btn`). Wrapping `PaginationContent` in `join` would change the
  *visual language* from separated pill buttons (current `gap-1`) to a
  connected, zero-gap segment group — a layout/design decision, not a
  styling-token alignment. Left for an explicit call rather than assumed.

### Round 3, 2026-08-10: form-control primitives onto daisy's own component classes

Continues Round 2's consistency goal into the three primitives that had daisy
*tokens* but no daisy *component class*: `checkbox`, `radio-group`, `switch`.
Scope was deliberately fixed up front — `dialog`/`alert-dialog`/`sheet` and
`popover` were explicitly excluded, and the two rejections below are recorded
as considered, not skipped.

#### The bug this round found first: `--depth` was never 0 under the stock themes

Phase 0 bought its 54/54 button parity partly with `--depth: 0` (see "Reachable
from the theme block" above) — that value lived in the product theme block.
When the product theme was dropped for daisy's **stock** `light`/`dark`, the
setting went with it: both stock themes ship `--depth: 1`, and daisy derives
real shadows from it. `.btn` alone builds `--btn-shadow`, `--btn-inset` **and**
a `text-shadow` off that one number, so **every button in the app had been
painting shadows** — a live Hard Rule 19 violation, invisible in review because
nothing in `components/ui/` mentions a shadow.

Fixed with a single declaration in the unlayered `:root` block of
`globals.css`. daisy's `themes.css` is itself unlayered and its `:root`,
`[data-theme=light]` and `[data-theme=dark]` selectors are all specificity
(0,1,0) — identical to `:root` — so this resolves on **source order**, which
was verified in the production bundle rather than assumed: daisy's four
`--depth:1` declarations land at bytes 11656–17266, ours at 397736.

Deliberately **not** put in the `@plugin "daisyui"` block: that would mean
registering a product theme, which is out of scope. Verified after the fix by
scanning all 78 `.btn`/`.checkbox`/`.radio`/`.toggle`/`.card`/`.badge`/
`.alert`/`.skeleton`/`.input`/`.table` nodes on the harness — **zero elements
with any non-transparent shadow stop**, `boxShadow` or `textShadow`.

> Watch item: any future re-introduction of a product theme must carry
> `--depth: 0` explicitly. This is the second time the value has been lost in a
> theme change.

#### Converted

All three collapse a `<span>` wrapper + a visual child element down to a single
native `<input>` carrying daisy's class. daisy draws the box/track and the
checkmark/dot/knob itself, keyed off the input's real `:checked` /
`:indeterminate` pseudo-classes — which retires the state-driven `cn()` class
computation the Tier 0 rewrites needed, and with it the open question Tier 0
left behind about which `:checked`-style Tailwind variants actually compile
(the components no longer need the answer for a different reason: daisy owns
the state styling now, not Tailwind variants).

| Primitive | Class | Overrides kept, and why |
|---|---|---|
| `checkbox` | `checkbox checkbox-primary` | `[--size:1.125rem]` (daisy's own box is 24px, ours 18px) · `rounded-none` (daisy's `--radius-selector` is 8px, and off the documented 5-step scale) · `not-checked:not-indeterminate:border-base-300` — **load-bearing**: `checkbox-primary` points `--input-color` at primary, which daisy uses for the border in *every* state, so without this every unchecked box in the app turns blue |
| `radio-group` | `radio` | `[--size:1.125rem]` · `not-checked:border-base-300` (daisy's unchecked ring is `color-mix(currentColor 20%)`, not a token). **No colour modifier on purpose** — with `--input-color` unset daisy resolves ring and dot to `currentColor`, i.e. `base-content`, which is exactly what the hand-rolled version drew. The dot size also falls out for free: 18px − 2×4px padding − 2×1px border = the same 8px as the deleted `size-2` span |
| `switch` | `toggle toggle-primary` | `[--size:1.125rem]` / `[--size:0.875rem]` for the two sizes · `rounded-full` (daisy computes a rounded-rect from `--radius-selector`, neither a pill nor on the 5-step scale) |

All three also take `focus-visible:outline-none` — daisy ships `outline: 2px
solid` on `:focus-visible` for each, and the design checklist mandates the ring
system. The existing `focus-visible:ring-2 ring-primary/30` is kept and was
confirmed to actually win: Tailwind's `.focus-visible\:ring-2:focus-visible`
(byte 278428) beats `.checkbox:checked`'s own `box-shadow` (byte ~111059) at
equal (0,2,0) specificity on source order.

**`data-slot` and `peer` moved onto the `<input>`** — they were on the deleted
wrappers, and `label.tsx`'s `peer-data-[slot=checkbox|radio-group-item|switch]:`
selectors depend on exactly those two. Sibling order is unchanged, so the
pairing survives. Side effect worth having: `label.tsx`'s `peer-disabled:`
rules were **dead** for all three (a `<span>` can never match `:disabled`) and
now apply.

**Accepted visual changes** (agreed before implementing, not discovered after):

- **`switch` adopts daisy's appearance rather than reproducing the old one.**
  Checked is now a `base-100` track with a primary knob — the *inverse* of the
  previous primary track / light knob — unchecked is a bordered transparent
  track, and width is daisy's computed 29.5px rather than the previous 33px
  (height unchanged at 18px). This is the one place in this round where a real
  consumer surface changes: 11 render sites across 6 files. All 11 pass only
  `checked`/`onCheckedChange`/`disabled`/`aria-label`, so no API moved.
- **Disabled opacity** is now daisy's (`.2` for checkbox/radio, `.3` for
  toggle) rather than the previous uniform `.5`.
- `checkbox`'s checkmark is daisy's clip-path glyph, visually smaller than the
  removed `size-3.5` phosphor `CheckIcon`.

`checkbox` and `radio-group` still have **zero consumers outside the harness**
(unchanged since Tier 0), so their blast radius is nil; `switch` is the only
one with real reach.

#### Not converted — considered rejections

- **`card` → `card-body`/`card-actions`.** Re-confirmed against daisy's actual
  CSS this round: `.card-body` is a single `padding: var(--card-p)` flex
  container, while this component's `CardHeader`/`CardContent`/`CardFooter`
  each carry their own `--card-spacing` padding. Adopting it is a DOM and API
  change, not a class swap — same conclusion as Round 2, now verified from the
  stylesheet rather than the docs. `card` + `card-title` remain the extent of it.
- **`dialog`/`alert-dialog` → `modal`/`modal-box`.** Out of scope for this
  round by instruction, and the CSS confirms why it deserves a dedicated spike
  rather than a drive-by: `.modal::backdrop { display: none }` would silently
  disable the ~90 lines of tuned `::backdrop` colour, transition and
  `@starting-style` rules at globals.css — **which `sheet` shares** — replacing
  them with daisy's own `.modal[open]` opacity/background transition.
  `.modal-box` additionally ships an unconditional
  `box-shadow: 0 25px 50px -12px` that is **not** depth-gated, so the
  `--depth: 0` fix above would not remove it (Hard Rule 19), plus a
  `--radius-box` corner and a required inner-wrapper restructure with the close
  button moved inside. Blast radius is every modal plus `confirm-dialog`'s 72
  call sites.
- **`popover` → `dropdown`.** No viable target, for a structural reason rather
  than a stylistic one. `.dropdown-content` inherits nothing outside a
  `.dropdown` ancestor (every rule that gives it position, z-index and
  transition is scoped to `.dropdown .dropdown-content`), so adding the class
  alone is inert. And `.dropdown` itself positions via `position-area` /
  `position: relative` with an absolutely-positioned child and **no collision
  detection** — incompatible with this component's top-layer `popover="auto"`
  element and its JS viewport-clamping. Third time this conclusion has been
  reached for daisy's dropdown; treat it as settled.

#### Verification

Production build only (`pnpm build` + `pnpm start`) — never the dev server, per
the Phase 0 Turbopack finding. Driven by headless Chrome over CDP; `pnpm
typecheck` clean. Note `components/ui/**` is excluded in `biome.json`, so
`pnpm lint` does not cover these three files — don't read a green lint as
coverage here.

Confirmed on the untracked `/parity-harness` route, light **and** dark:

- Geometry and colour per control: checkbox 18×18, square, `base-300` unchecked
  border → primary fill + primary border + checkmark when checked; radio 18×18
  with `base-content` ring and 8px dot checked, `base-300` unchecked; toggle
  29.5×18 with the agreed daisy appearance.
- **Keyboard:** Space toggles checkbox and switch; ArrowDown moves selection
  *and* focus between radio items (the native shared-`name` behaviour the
  component banks on, still intact after the unwrap); Tab reaches all three.
- **Label pairing:** clicking `<Label htmlFor>` still drives the control.
- **Disabled:** click is a no-op, `cursor: not-allowed`, daisy's opacity.
- `data-slot` values, `role="switch"` and the `indeterminate` DOM property all
  present on the new single-element markup.

**One methodology note worth keeping.** The first probe run appeared to show a
clicked checkbox failing to fill — `checked` true, background transparent,
checkmark opacity 0. It was a measurement artifact: daisy's `.checkbox`
transitions `background-color .2s` and its `::before` opacity carries a `.1s`
delay, so a `getComputedStyle` read taken synchronously after `.click()` samples
mid-transition. Re-measured one frame later, the state is correct. When probing
daisy components, sample after the transition or the probe invents regressions.

### Round 4, 2026-08-10: structural primitives onto daisy's own component classes

Continues Round 2/3's consistency goal into the primitives that still had daisy
*tokens* but no daisy *component class*, plus a full re-audit of the four
"not converted" items Round 2 left open. Every decision below was checked
against daisy's **compiled CSS in `node_modules/daisyui/`**, not its docs, and
then verified in a production build driven by headless Chrome over CDP with
**trusted** input events (`Input.dispatchKeyEvent` / `dispatchMouseEvent`) —
synthetic `dispatchEvent` is not enough here, since Headless UI and native
`<dialog>`/`<details>` all discriminate on `isTrusted`.

#### Converted

| Primitive | Class | What daisy now owns | What we still override, and why |
|---|---|---|---|
| `tabs` | `tabs`, `tabs-box` (default variant), `tabs-border` (`line` variant), `tab` | Sizing, padding, inactive/hover colour, and the **active treatment** | `flex-1` (consumers pass `w-full`), the ring focus system, icon sizing. **The key finding:** daisy keys the active tab off `[aria-selected=true]`, which this component already set for accessibility — so the ~1,400-character hand-written class string with its four state-driven blocks (`data-active:*`, `group-data-[variant=line]/*`, and an `::after` underline) was deleted outright, not re-expressed. `.tab` is scoped `.tab:is(.tabs > .tab)`, so triggers must stay **direct children** of the list. |
| `accordion` | `collapse collapse-arrow`, `collapse-title`, `collapse-content` | Layout, padding, the caret, and the **open/close height animation** | `rounded-none` (daisy defaults to `--radius-box`; stacked rows are divided by a rule, not rounded cards) · `has-[summary:focus-visible]:outline-none` (daisy outlines the collapse; the app uses a ring on the summary). daisy has a dedicated `.collapse:is(details)` branch that animates `::details-content` — so this is a **capability gain**, not just a restyle: the hand-rolled version had no transition at all. The `CaretDownIcon` element was deleted; `collapse-arrow` draws it. |
| `breadcrumb` | `breadcrumbs` | The separator, its inline rhythm, and overflow (`overflow-x: auto` + `white-space: nowrap`) | Typography only. Round 2 left this open because "whether daisy's targeting is scoped narrowly enough to skip an `<li>` that is itself the separator wasn't verified." **Verified this round: it is not.** daisy renders the separator as `li + *::before`, so an explicit separator `<li>` gets one too — a visible double chevron. Resolved the way daisy intends: `<BreadcrumbSeparator>` was **deleted** and the two consumers updated. `reference-blocks.tsx` also needed its `<span>` wrappers removed so items are direct `<li>` children of the list, or the selector doesn't match at all. |
| `pagination` | `join`, `join-item` | Corner rounding and shared-border collapse | Nothing. Round 2 deferred this as "a design decision, not a token alignment" — taken now, since a connected segment group is what `Pagination` is for, and the component has **zero real consumers** (server-driven `<Link>` navigation is used instead), so the blast radius is nil. |
| `slider` | `range range-xs range-primary` | Track, thumb, and the **progress fill** | `w-full` (daisy clamps to `20rem`), ring focus. Deleted the absolutely-positioned track/fill overlay `<div>`s **and** both per-engine thumb rule sets (`::-webkit-slider-thumb`, `::-moz-range-thumb`). daisy paints the fill as a clipped inset `box-shadow` on the thumb — worth knowing before "fixing" it. |
| `select` (trigger) | `select` | The **caret**, the appearance reset, padding (including the inline-end room the caret occupies), radius | `w-full`, the base-200/base-300 field chrome shared with `input`, and an explicit `h-9` so the trigger matches `input`'s 36px rather than daisy's 40px. The rendered `<ChevronDown>` icon was **deleted** — daisy draws the caret with two `linear-gradient` background layers, so keeping the icon would double it. Headless UI's `Listbox` keeps 100% of the behaviour. |
| `toggle` | `btn btn-ghost` / `btn-outline`, via `buttonClasses()` | Everything a button's appearance involves | The pressed treatment. Rather than a second hand-written class string, `toggle.tsx` now maps its own variant/size API onto `Button`'s daisy-backed one (toggle's scale is exactly one step taller than Button's at every step, so the existing 2.5/2.25/2.75rem heights are preserved). Deliberately **not** daisy's `btn-active`: it derives its background from `--btn-color`, which `btn-ghost` leaves unset. |
| `toggle-group` | `join` / `join-item`, at `spacing={0}` only | Outer-corner rounding, shared-border collapse | The `gap` for non-zero spacing. Replaced a 12-selector `first:`/`last:`/`border-l-0`/`border-t-0` chain. `join` has no concept of a gap, so it is applied conditionally. |
| `alert-dialog` actions | `btn btn-error` (Action), `btn` outline (Cancel), `modal-action` (Footer) | Button appearance and the action-row layout | Nothing. Both buttons were hand-written class strings; they now route through `buttonClasses()`. Added one Button variant, `destructive-solid` → `btn-error`, so the solid affordance an alert dialog needs survives (the existing `destructive` is a deliberate 10% alpha tint — see Round 2's `btn-soft` finding). `modal-action` is safe here **because none of its declarations are scoped to a `.modal` ancestor** — unlike `modal-box`, see below. |
| `save-status` | `badge badge-sm` | Pill chrome | `rounded-full`, and the two alpha-tinted colour pairs (daisy's `badge-warning`/`badge-neutral` are opaque fills). This indicator is a pill with an icon and a short label — i.e. a badge — and had simply never been identified as one. |

#### Token bug found while auditing

Three files referenced **`var(--base-content)`**, which does not exist — daisy
defines `--color-base-content`. An invalid `var()` in a `color` declaration is
invalid at computed-value time, so those elements silently fell back to
`inherit` (which happened to look right, which is why it survived review):
`components/ui/icon-tooltip.tsx`, `components/ui/reaction-tooltip.tsx`,
`components/database/cell-action-overlay.tsx`. A fourth, `sonner.tsx`, passed
the same broken value into Sonner's `--normal-text`. All four fixed. Worth a
grep after any future token rename: `var\(--(base|primary|error)[a-z-]*\)`
without the `--color-` prefix is always a bug.

#### Re-audited and still not converted — with the CSS reason

Round 2 and 3 recorded four of these; all were re-checked against the compiled
CSS this round rather than carried forward on trust.

- **`separator` → `divider`.** Unchanged conclusion, now measured: `.divider`
  is `margin: var(--divider-m, 1rem 0)`, `height: 1rem`, with the line drawn by
  `::before`/`::after` at `.125rem`. This component *is* the line (`h-px`/`w-px`,
  zero margin). Adopting means neutralising the margin, the height and both
  pseudo-elements — i.e. neutralising essentially all of it.
- **`progress` → `.progress`.** Unchanged, and the CSS is unambiguous: the fill
  is `::-webkit-progress-value` / `::-moz-progress-bar`, which only exist on a
  real `<progress>` element. On this deliberate `div`+`div` bar the class would
  style the track and leave the fill unpainted — strictly worse than today.
- **`collapsible` → `collapse`.** New this round, and the counterpart to
  `accordion` above. `Collapsible` is a behaviour-only `<details>` wrapper with
  no visual of its own; `.collapse` would inject `display: grid`, `width: 100%`,
  a `--radius-box` corner and 1rem padding into every consumer's own layout.
  The rule that separates the two: **`accordion` is a visual component and gets
  `collapse`; `collapsible` is a headless wrapper and does not.**
- **`dialog`/`sheet` → `modal`/`modal-box`.** Confirmed again, with the decisive
  detail now pinned down: **`.modal-box` is inert on its own.** Its `opacity: 0`
  and `scale: .95` are reset only by `.modal[open] > .modal-box`, so adding the
  class without also adopting `.modal` as a full-viewport grid wrapper renders
  an invisible dialog. Adopting `.modal` in turn means `.modal::backdrop {
  display: none }` replaces the ~90 tuned `::backdrop` lines in `globals.css` —
  **which `sheet` shares, and `sheet` cannot use `.modal` at all** (it is
  edge-anchored, not centred). Plus `.modal-box`'s `box-shadow: 0 25px 50px
  -12px` is **not** depth-gated, so `--depth: 0` does not remove it (Hard Rule
  19). The native `<dialog>` engine is also the *correct* answer under the
  locked native → daisy → Headless UI order. `modal-action` was adopted; the
  shells were not.
- **`popover` → `dropdown`.** Unchanged; fourth time this conclusion has been
  reached. `.dropdown-content` inherits nothing outside a `.dropdown` ancestor,
  and `.dropdown` has no collision detection. Treat as settled.
- **Select's floating panel → `menu`.** New this round. daisy's `menu` styles
  `li > *`, not the `li` itself; Headless UI's `ListboxOption` *is* the
  focusable/selectable element, so the styling would land on its children
  instead of on it. The panel keeps hand-written surface classes built from
  daisy tokens.
- **`card` → `card-body`/`card-actions`.** Unchanged (see Round 3).

#### Verification

Production build only (`pnpm build` + `pnpm start`), never the dev server, per
the Phase 0 Turbopack finding. `pnpm typecheck` clean. `pnpm build` clean.
`pnpm lint` is unchanged at the repo's pre-existing 289 findings; on the two
non-`components/ui/**` files touched it went 14 → 12 (`components/ui/**` is
excluded in `biome.json`, so a green lint is **not** coverage for these files —
same caveat as Round 3).

**Compiled CSS checked, not assumed** — every adopted class was confirmed
present in `.next/static/chunks/*.css`: `.tabs`, `.tab:is(`, `.tabs-box`,
`.tabs-border`, `.collapse:not`, `.collapse-title`, `.collapse-content`,
`.collapse-arrow`, `.breadcrumbs`, `.join`, `.join-item`, `.range`,
`.range-xs`, `.select`, `.btn-error`, `.modal-action`, `.badge`, `.badge-sm`.
"Added the class name" is not evidence that it reaches the bundle.

**Behaviour, driven with trusted input events on `/parity-harness`:**

- **Tabs** — ArrowRight/ArrowLeft move focus *and* selection, roving `tabIndex`
  flips 0/−1, the panel follows, and `tabs-box` paints the active tab
  `base-100` against the list's `base-200`.
- **Select** — opens on click, panel is `role="listbox"` with `role="option"`
  children, anchored 4px below the trigger and never narrower than it,
  ArrowDown moves the focused option, Escape closes **and restores focus to the
  trigger**. Headless UI's behaviour is fully intact under daisy's `select`.
- **AlertDialog** — `:modal` true (real top-layer), focus starts inside, Escape
  closes; `modal-action` footer computes to `flex` / `flex-end` / `gap: 8px` /
  `margin-top: 24px`; the action button resolves to daisy's error fill with
  `error-content` text.
- **Accordion** — click opens, content height goes 20px → 36px, the
  `collapse-arrow` `::after` rotates 225°.
- **Toggle** — Space flips `aria-pressed` and the background, height 40px.
- **Slider** — ArrowRight steps the native range value 40 → 41.
- **Breadcrumb** — list children are `<li>` only, and exactly one carries
  daisy's separator `::before` (`content: ""`, `rotate: 45deg`, 1px border,
  `margin-inline: 8px 12px`); wrapper is `overflow-x: auto`.

**Both themes.** Re-probed with `.dark` + `data-theme="dark"`: every surface,
border and text colour flips to the dark theme's values, the `tabs-box` active
tab stays lighter than its list, and the breadcrumb separator resolves to
`base-content` at `opacity: .4`. No hardcoded colour survived anywhere in the
converted set.

**No shadows.** All `.btn` / `.tab` / `.collapse` / `.join-item` / `.range` /
`.select` / `.badge` nodes on the harness resolve their `box-shadow` and
`text-shadow` colour stops to fully transparent (`oklch(1 0 0 / 0)`,
`oklab(0 0 0 / 0)`), i.e. `--depth: 0` still holds through the newly adopted
classes. Hard Rule 19 intact.

#### Accepted visual changes

Agreed in advance, not discovered afterwards. Consumer reach is small: `tabs`
has 3 real consumers, `breadcrumb` 1, `select` 3, `save-status` several; and
`accordion`, `slider`, `pagination`, `toggle` and `toggle-group` have **no
consumers outside the harness**.

- **Tabs** take daisy's geometry: `tab-height` 40px, `--tab-p` 0.75rem, 14px
  text (was 12px), and the `line` variant's underline is now `tabs-border`'s
  3px `::before` instead of a hand-drawn 2px `::after`.
- **Accordion** takes daisy's 1rem padding and its own caret glyph, and gains an
  open/close animation it did not previously have.
- **Breadcrumb** separators become daisy's rotated border box rather than a
  `<ChevronRight>` icon, and spacing comes from the separator's inline margins
  rather than a flex `gap`. Long trails now scroll horizontally instead of
  wrapping.
- **Slider** becomes daisy's 16px filled range rather than a 2px hairline with
  a 12px dot.
- **Select** trigger shows daisy's gradient caret rather than a Lucide chevron.
- **Pagination** and **ToggleGroup** (at `spacing={0}`) become connected
  segment groups with rounded outer corners, replacing separated pills / square
  corners.
- **AlertDialog** buttons pick up daisy's `btn` geometry, and the footer gains
  `modal-action`'s 24px top margin (was `pt-2`).

#### One methodology note worth keeping

The first behaviour probe reported that the Select would not open by keyboard,
and that tab focus refused to move. Both were **measurement artifacts**, and in
opposite directions. The first: a synthetic `new KeyboardEvent(...)` dispatched
from `Runtime.evaluate` has `isTrusted: false`, and Headless UI ignores it — the
component was fine. The second: an `AlertDialog` left open earlier in the same
probe was correctly trapping focus, so `.focus()` on a tab outside it did
nothing — which was the focus trap *working*, reported as a tabs failure. Drive
these components with the CDP `Input` domain, and dismiss modals before probing
anything behind them, or the probe invents regressions. (Round 3's transition
sampling artifact is the third instance of this class of error; assume the probe
is wrong before the component is.)


### Postscript, 2026-08-03: `shadcn` package removed

One piece of Phase 5 ("Decommission") turned out not to depend on the rest of
it: `pnpm remove shadcn` · delete `components.json` · drop
`@import "shadcn/tailwind.css"`. Done, out of order, because it was safe in
isolation — checked first, not assumed:

- **The package had zero JS/TS imports anywhere in the app** — its only
  footprint was the CSS import, `components.json` (the CLI's own config, not
  a runtime dependency), and no `tailwind.config.*`/preset reference (Tailwind
  v4 here is CSS-first, no config file to reference it from).
- **`shadcn/tailwind.css` was not boilerplate — it defined real
  `@custom-variant`s** (`data-open`, `data-closed`, `data-selected`,
  `data-disabled`, `data-active`, `data-horizontal`, `data-vertical`), plus
  accordion keyframes and a `.no-scrollbar` utility. Checked real usage before
  touching anything: `data-open`/`data-closed` alone span 11 files (`dialog`,
  `sheet`, `popover`, `tooltip`, `dropdown-menu`, `context-menu`, `menubar`,
  `hover-card`, `navigation-menu`, `sidebar`, `drawer`) — all Tier 3/4 files
  explicitly left untouched above. `data-horizontal`/`data-vertical` also hit
  `separator.tsx`/`toggle-group.tsx`, which Tier 0 wrote and kept those exact
  classes on.
- **Inlined the used parts into `globals.css` verbatim, dropped the rest.**
  Accordion keyframes and `data-checked`/`data-unchecked` had zero real
  consumers (confirmed by grep — Tier 0's `accordion`/`checkbox`/`switch`/
  `radio-group` rewrites don't use them), so they were cut rather than carried
  forward as dead weight.
- **Verified against the actual build output**, not just "should work": all
  five still-used selectors (`data-open:animate-in`,
  `data-closed:animate-out`, `data-horizontal:h-px`, `data-vertical:w-px`,
  `.no-scrollbar`) present in the compiled CSS; both dropped pieces
  confirmed absent, not silently broken. `pnpm typecheck` clean, `shadcn`
  gone from `pnpm-lock.yaml`.

**Top risks**

1. **Control density — the live one.** daisy's default `btn`/`input` sizing is more generous than our dense UI. Under the parity decision this must be solved in the theme block, not per component. *Mitigation:* Phase 0 measures it and is an explicit go/no-go; if parity needs bespoke per-component CSS, we revisit the parity decision rather than absorbing the cost silently.
2. **Accessibility regression.** *Decided:* our contract wins — `--muted-foreground` / `--muted-foreground-subtle` stay as custom vars with their measured ratios, and any `/opacity` on text is a review defect. Residual risk is contributor drift toward daisy's idiom; add a lint rule or a review-checklist line.
3. **Mixed-styling window on `main`.** The incremental strategy means `main` carries both shadcn and daisy styling for several weeks. Acceptable because the Phase-2 shim keeps both resolving to identical values — but any release cut mid-Phase-3 must be visually QA'd, not assumed clean.
4. **Loss of design intent.** [globals.css](../../app/globals.css) encodes real reasoning (why the canvas is tinted, why elevation is luminance-based in dark mode, why the transition rule is scoped). Preserve the comments alongside the values.
5. **Scope creep from "refresh later."** Every primitive that misses parity lands on that list. If the list is never scheduled, the app ships permanently half-migrated visually. *Mitigation:* the list is a tracked backlog with an owner, not a comment in this doc.

## 5. Rollback

Phase 2 (the token-alias shim) never happened — cancelled as a no-op once
Phase 1's revised architecture made it unnecessary (see Phase 2 RESULTS). The
actual rollback point is the tip of `feat/daisyui-theme`: daisyUI installed,
themed, Tier 0's 13 primitives converted, `button` converted, and nothing
else touched. `git revert` back to before this branch's first commit if
daisyUI needs to come out entirely; the app is fully functional at every
commit on this branch, since each one was staged for review before merging.

## 6. Lint debt after migration

The migration branch was linted with Biome (`pnpm lint`, ultracite preset)
after the DaisyUI work landed. This section records what was fixed, what was
deliberately left, and why — so the remaining output is not mistaken for
migration breakage.

### Trajectory

| Stage | Errors | What was fixed |
| --- | ---: | --- |
| Start | 291 | — |
| Phase 0 | 266 | Formatter, `noReactForwardRef` (React 19 ref-as-prop), all 21 `useExhaustiveDependencies` |
| Phase 1 | 256 | `<label onClick={stopPropagation}>` moved onto the real control, at the 5 sites where it was provably safe |
| Phase 2 | 196 | 24 interactive-element sites given real semantics (`<button>`, `<Link>`, stretched-action overlays) |
| Phase 3 | 177 | `noNestedComponentDefinitions`, `noLabelWithoutControl`, `noDescendingSpecificity` → 0; stable ids for invite rows |
| Phase 4 | 176 | Natural stable key for ToC headings (`h.pos`) |

TypeScript and the production build passed at every stage. No lint rule was
disabled, `biome.jsonc` was not modified, and no suppression comment exists in
the tree.

### None of the remaining 176 come from the migration

- `app/globals.css` is clean (the two `noDescendingSpecificity` errors in the
  ProseMirror list rules were fixed by reordering; the selectors are mutually
  exclusive so there is no visual effect).
- `components/ui/**` — all 43 DaisyUI primitives — is **excluded from Biome**
  by the pre-existing `!components/ui` entry in `biome.jsonc`. It reports zero
  errors because it is never linted, not because it is verified clean. Worth
  revisiting separately; it was left alone here because changing lint scope is
  not migration work.

Every remaining error is in application/feature code and predates or is
orthogonal to the DaisyUI work.

### Remaining categories

**B — legitimate limitation / rule false positive (~28 sites)**

- `<img onError>` / `<img onLoad>` (6): resource-lifecycle handlers, not user
  interactions. No semantic HTML alternative exists; removing them breaks the
  avatar and thumbnail fallbacks.
- Hover-only tooltip triggers (10): passive badges whose sole interaction is a
  hover tooltip. There is a real gap (the tooltip is unavailable to keyboard
  and AT users) but closing it means reworking the tooltip system.
- Right-click context-menu surfaces (~6): board/gallery/calendar cards. A
  right-click affordance has no native equivalent; the same actions are already
  reachable from a visible "…" menu button.
- Portal bubbling guards (~9): popup containers whose only handler is
  `onClick={(e) => e.stopPropagation()}`. All use `createPortal`, so the guard
  is isolating **React-tree** bubbling to the row that opened them — it is
  load-bearing, not dead code.
- `contentEditable` title editors (2) and `dangerouslySetInnerHTML` for KaTeX
  output (2).

**C — static / positional index keys (~40 of the 54)**

Constant calendar grids (`CAL_WEEKS`), literal day-name arrays, gantt month
bands and day ticks, chart bars, static template previews, ProseMirror node
lists, and the `react-email` digest template (rendered once to an HTML string,
where keys are inert). Position is the identity in all of these.

These are *not* suppressed. An earlier attempt showed that a `biome-ignore`
comment above a JSX attribute suppresses the **entire enclosing JSX node** —
six comments silenced nineteen diagnostics across three files, including sites
that were never reviewed. Those suppressions were reverted. Until the rule can
be scoped to a single attribute, leaving the error visible is safer than a
suppression that quietly covers unrelated code.

**D — requires a data-model decision (3 sites)**

- `FilterRule` / `SortRule` (`components/database/types.ts`) have no `id`, and
  `propertyId` can legitimately repeat (two filters on one date property for a
  range). `filter-bar.tsx` and `sort-bar.tsx` therefore key reorderable rows by
  index. Giving them stable identity means adding an `id` to the rule shape,
  which is persisted as JSON on the view record.
- `reference-blocks.tsx` `draftBlocks` is written straight into TipTap node
  attributes, so an added `id` would change the stored document JSON.

> Requires a separate data-model decision; not appropriate for DaisyUI
> migration/lint cleanup.

### Verification status

Lint, `tsc --noEmit`, `next build`, and the formatter were run directly and
their exit codes recorded. The application itself was **not** exercised in a
browser — it needs PostgreSQL and an authenticated session. Interaction changes
in Phase 2 were verified by hit-testing the exact positioning in headless
Chrome (plain content routes to the row action; nested controls keep their own
clicks; the action is keyboard-reachable), but rendered appearance of the
`div` → `<button>` conversions is unconfirmed.

> Remaining lint findings are application-wide quality debt and are not
> blockers for the DaisyUI migration.

Recommended follow-up: **`chore/cleanup-biome-lint-errors`**, scoped to the
category B/C/D items above, plus a decision on whether `components/ui/**`
should stay outside Biome's file scope.
