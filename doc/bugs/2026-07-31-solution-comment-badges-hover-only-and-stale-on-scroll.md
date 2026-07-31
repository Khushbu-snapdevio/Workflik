# Solution: show every commented block's badge, clamped to the editor's scrollport

**Fixed:** 2026-07-31

## What changed

All in `components/editor/comment-gutter.tsx`.

**1 — Badges are always visible.** The render filter dropped the hover condition:

```ts
const visible = indicators.filter((i) => i.blockId !== activeBlockId && i.inView);
```

The block whose comment card is currently open is still skipped (the open card already marks it).

**2 — Deleted the hover machinery.** `hoveredBlockId` and the ~95-line effect that maintained it (mousemove hit-testing, safe zone, hide timer, scroll re-resolve, window-leave handler) are gone — it existed solely to drive the removed condition. This also removes a document-level `mousemove` listener doing `elementFromPoint` on every pointer move.

**3 — Added a visible-band clamp.** Because these are `position: fixed`, "always visible" would otherwise paint badges for blocks scrolled out of the editor's scrollport — over the page topbar, which is a fixed-height flex sibling *above* the scroll container and therefore not excluded by the editor's own rect. A new `getScrollParent()` walks up to the nearest `overflow-y: auto/scroll/overlay` ancestor, and each indicator is tagged `inView`:

```ts
const inView =
  top <= editorRect.bottom - 10 &&      // pre-existing: clear of page-level comments
  top >= bandTop &&                     // new: below the scrollport top (topbar)
  top + INDICATOR_HEIGHT <= bandBottom; // new: above the scrollport bottom
```

**4 — Fixed the scroll listener.** `window` → capture-phase `document`, matching `components/ui/icon-tooltip-button.tsx:33`:

```ts
document.addEventListener("scroll", debouncedMeasure, { passive: true, capture: true });
```

**5 — Corrected the anti-wipe guard.** It previously read `if (result.length > 0) setIndicators(result)` to avoid clearing every badge when measurement partially failed. With off-screen badges now filtered, an empty result is a legitimate state (all commented blocks scrolled away), which that guard would have misread as failure and left stale badges on screen. It now counts successfully *located* blocks instead of *visible* ones:

```ts
let located = 0;
// ...located++ on each successful measure, regardless of visibility
if (located > 0) setIndicators(result);
```

## Why this fixes the root cause

The badge's whole purpose is to answer "where are the comments on this page?" before the reader knows where to look, so gating it on already-pointing-at-the-block defeated it. Rendering all of them restores that, and the clamp is what makes it safe to do with fixed-position elements: visibility is now decided by the scrollport's geometry rather than by cursor position, so badges appear exactly where content is actually visible.

## Verification

Both new behaviours were measured in headless Chromium against a DOM mirroring the real page shell (`flex-col overflow-hidden` > 44px topbar + `overflow-y-auto` content > editor with 40 blocks):

| Scroll position | Scroll parent resolved | Band | Badges shown | Overlapping topbar |
|---|---|---|---|---|
| top | container (not window) | 44–600 | blocks 0–12 (13) | **0** |
| mid (scrollTop 500) | container | 44–600 | blocks 12–25 (14) | **0** |
| bottom | container | 44–600 | blocks 27–39 (13) | **0** |

Only on-screen badges paint (13–14 at a time, not all 40), the visible set tracks scrolling, and nothing ever lands on the topbar.

Separately confirmed the listener fix: scrolling an inner `overflow-y-auto` container fired a `window` scroll listener **0 times** and a capture-phase `document` listener **1 time**.

`tsc --noEmit` reports no errors, and `hoveredBlockId` has no remaining references.
