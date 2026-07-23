# Solution: Flip the mention dropdown above the caret and clamp it to the viewport

## What changed

[components/editor/mention-list.tsx](../../components/editor/mention-list.tsx) — added
viewport-aware positioning, mirroring (and slightly improving on) the slash menu:

- A `useLayoutEffect` measures the rendered popup's actual height (`offsetHeight`)
  after layout but before paint, then computes its position:
  - **Prefers below** the caret; **flips above** only when the list doesn't fit below
    *and* there is more room above.
  - Sets a `maxHeight` equal to the available space, with `overflowY: auto`, so a list
    that still can't fully fit scrolls instead of overflowing.
  - Clamps `left` so the popup can't spill past the right (or left) viewport edge.
- The container's `overflow-hidden` was replaced with inline `overflowY: auto` /
  `overflowX: hidden` to support the capped, scrollable height.
- Until the first measurement lands, it falls back to the previous below-the-caret
  position, so there's no visible jump (the layout effect corrects before paint).

Positioning recomputes on every `suggestionProps` change (each keystroke / async item
load), since the list height changes as results come and go.

### Follow-up: close on outside scroll

Because the popup is `position: fixed`, scrolling the page (or any scroll container the
editor lives in) moved the caret while the popup stayed glued to the viewport — it
visibly detached from the `@`. Rather than re-anchor it, the popup now **closes** on any
scroll originating outside itself (matches Notion): a capture-phase `scroll` listener
calls `exitSuggestion` for both plugin keys, but ignores scrolls whose target is inside
the popup so its own capped-height list can still scroll internally. `resize` simply
repositions via the extracted `updatePosition` callback.

## Why this fixes the root cause

The popup is no longer locked to opening downward. When the caret is low in the
viewport it now opens upward, and in the rare case it fits neither way it scrolls
within the available space — so its rows are always fully visible and reachable.

The slash menu already had equivalent flip + clamp logic, so it was unaffected and
needed no change; this brings the mention list to parity. (The mention list measures
the real height rather than assuming a fixed one, so it flips only when genuinely
necessary.)
