# Solution: Render flag emoji via flag-icons in the shared PageIcon renderer

## What changed

- **New shared helper** [lib/emoji-flags.ts](../../lib/emoji-flags.ts) — `flagIconCode(emoji)`
  maps a flag emoji (regional-indicator pair, plus the three GB subdivision tag-sequence
  flags) to its `flag-icons` code, or returns `null` for non-flags. Extracted verbatim
  from the picker so both the picker and the icon renderer share one implementation.
- [components/pages/page-icon.tsx](../../components/pages/page-icon.tsx) — in the `emoji`
  branch, `PageIcon` now checks `flagIconCode`; if the emoji is a flag it renders
  `<span class="fi fi-<code> fis" style={{ fontSize: size }}>` (the same SVG set the
  picker grid uses, sized by `fontSize` so it scales with the existing `size` prop)
  instead of the native glyph. All other emoji render natively as before.
- [components/pages/emoji-grid-picker.tsx](../../components/pages/emoji-grid-picker.tsx) —
  now imports `flagIconCode` from the shared helper; its local copy (and the
  regional-indicator constants) were removed. No behavior change in the picker.

## Why this fixes the root cause

`PageIcon` is the single renderer used everywhere a page icon appears — header,
breadcrumb, sidebar tree, database views, templates (61 call sites). Routing flag emoji
through the `flag-icons` SVG set there means flags now display as flags on every
platform, including Windows where the native emoji font can't draw them. The picker and
the rendered icon now use the exact same code path, so what you pick is what you see.

## Not covered (minor)

The `@`-mention dropdown renders a page's icon as a raw emoji string
([components/editor/mention-list.tsx](../../components/editor/mention-list.tsx)) rather
than through `PageIcon`, so a page whose icon is a flag would still show the letter pair
there. Left as-is to keep this fix scoped to the reported page-icon rendering; can be
switched to `PageIcon` later for full consistency.
