# Bug: block comment badges only appear on hover, and don't follow the content when scrolling

**Reported:** 2026-07-31

## Symptom

**1 — Comments are undiscoverable.** The gutter badge marking a block as commented (`💬 1`) only rendered while the cursor was hovering that exact block. A reader opening a page saw no indication anywhere that any line had comments on it; the only way to find them was to sweep the mouse down every line of the document. Existing discussion was effectively invisible.

**2 — Badges don't track scrolling.** The badges are `position: fixed`, so they need re-measuring whenever content moves. They were re-measured on `window` scroll, which never fires for this editor.

## Root cause

**Hover-only rendering** — `components/editor/comment-gutter.tsx` gated the render on a `hoveredBlockId` state:

```ts
const visible = indicators.filter((i) => i.blockId !== activeBlockId && i.blockId === hoveredBlockId);
```

A comment above the state claimed this matched Notion, "where the indicator doesn't persist for every commented block, only the one you're pointing at." That trades away all discoverability: an indicator that is only visible once you've already found the thing it indicates does no work.

Roughly 95 lines of supporting machinery existed only to feed that one state — a `mousemove` handler doing `elementFromPoint` hit-testing, a safe-zone rect extending past the editor so travelling toward the badge didn't dismiss it, a 300 ms hide timer, a scroll re-resolve using the last known cursor point, and an `<html>` `mouseleave` handler for the cursor leaving the window entirely.

**Stale positions on scroll** — measurement was registered as:

```ts
window.addEventListener("scroll", debouncedMeasure, { passive: true });
```

`scroll` does not bubble. The editor lives inside its own `overflow-y-auto` container (`app/app/[workspace]/layout.tsx`), so scrolling it fires the event on that element and never reaches a `window` listener. Verified in a browser: scrolling an inner container fired the `window` listener **0 times** while a capture-phase `document` listener fired. The badges therefore kept whatever coordinates they were last measured at.

This was largely masked by bug 1 — with badges shown only under the cursor, a stale position was rarely on screen long enough to notice. Making badges persistent would have exposed it immediately as badges stranded mid-page while text scrolled beneath them.

The same file's `IconTooltipButton` (`components/ui/icon-tooltip-button.tsx:33`) already uses the correct capture-phase form for exactly this reason.
