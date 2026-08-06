# Solution: use a fixed width instead of fighting Headless UI's own collision-avoidance max-width

**Fixed:** 2026-08-08

## What changed

**`components/database/toolbar.tsx`** — both affected panels' `className`
changed `w-[calc(100vw-24px)] max-w-80` to a plain fixed `w-80`:

- "Add a view" `MenuItems` (the view-type picker).
- "Layout" `PopoverPanel` (the view-type-change picker opened from a view's
  `⋯` menu).

## Why this fixes the root cause

Headless UI's `anchor`-based floating panels already have their own
small-viewport safety net: `@floating-ui/react`'s `size()` middleware
computes `availableWidth` (viewport minus collision boundaries) on every
position update and force-sets it as an **inline** `maxWidth` on the panel
element — which cannot be beaten by any `max-w-*` Tailwind class, since
inline styles always win over stylesheet rules for the same property. That
made the old `max-w-80` class pure dead weight; it never actually applied.

The fix doesn't try to out-fight that middleware — it cooperates with it.
`w-80` sets an intended `width: 20rem` (320px) via a class, which Headless
UI's middleware never touches (it only ever sets `maxWidth`/`maxHeight`/
`overflow` on the floating element). On any normal desktop viewport,
`availableWidth` computed by floating-ui is far larger than 320px, so the
(still inline, still present, still "winning" over any class) `max-width`
never actually constrains anything — the panel renders at its intended
320px. On a genuinely narrow viewport, floating-ui's own `maxWidth` now
correctly does its job and shrinks the 320px panel down to fit, which is
exactly the safety net `w-[calc(100vw-24px)]` was manually — and
incorrectly — trying to reimplement by hand.

This also matches how every other fixed-width `MenuItems`/`Listbox` panel
in the same file (`w-48`, etc.) is already styled — no `calc(100vw...)`
involved, because none of them needed it; Headless UI already handles that
job.

## Verification

`npx tsc --noEmit -p .` is clean. Started a temporary local dev server
(`next dev --turbopack` on a scratch port, stopped afterward) purely to
inspect the **compiled** Tailwind output — no login/browser interaction,
no touching real workspace data:

- Before the fix: confirmed `.max-w-80 { max-width: calc(var(--spacing) * 80); }`
  and `.w-\[calc\(100vw-24px\)\] { width: calc(100vw - 24px); }` both exist
  correctly in the compiled CSS (ruling out a Tailwind/globals.css
  generation problem — both classes were being generated correctly; the
  bug was Headless UI overriding one of them at runtime via inline style,
  not a missing CSS rule).
- After the fix: confirmed `.w-80 { width: calc(var(--spacing) * 80); }`
  is present in the freshly recompiled CSS bundle.
- Traced the override mechanism by reading
  `node_modules/@headlessui/react/dist/internal/floating.js`'s `size()`
  middleware `apply` callback directly, confirming it does
  `Object.assign(elements.floating.style, { maxWidth: ... })` unconditionally
  on every position update, which is what made the `max-w-80` class
  ineffective.

Not verified with an interactive browser session (no test credentials for
this dev instance's real workspace data — see the sibling "blink" fix's
solution doc for the same caveat). Recommend a quick visual check: open
"Add a view" and confirm the panel is a small ~320px box under the button,
not spanning the page.

## Related, not fixed here

`components/workspace/workspace-share-button.tsx`'s `PopoverPanel` has the
identical `anchor` + `w-[calc(100vw-24px)] max-w-80` pattern and the same
latent bug. Out of scope for this fix (not part of what was reported), but
should get the same `w-80` treatment.
