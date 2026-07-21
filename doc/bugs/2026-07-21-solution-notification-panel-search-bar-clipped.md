# Solution: give the Notification Inbox's backdrop the app's standard dim treatment

**Fixed:** 2026-07-21

## What changed

**`components/notifications/notification-panel.tsx`**: the backdrop `<div>` now renders `bg-black/20` (matching `SheetOverlay`/`DialogOverlay`'s convention exactly) and fades its opacity in/out with the same `animIn` flag that already drives the panel's own slide/fade animation, via an inline `opacity`/`transition: "opacity 0.18s ease"` pair (this component is hand-rolled, not built on the Radix-backed `Sheet`/`Dialog` primitives, so it can't pick up their `data-open`/`data-closed` Tailwind variants directly — the inline style mirrors the same timing by hand). The click-to-close behavior (`onClick={closePanel}`) and `pointerEvents` gating are unchanged.

## Why this fixes the root cause

The clipped-looking search bar was never a z-index bug — the panel was already correctly stacked above the page content it overlaps. The actual problem was that page content in the panel's band had *no visual cue* that it was now behind an open overlay, so a wide element (the search bar) straddling the panel's left edge looked abruptly cut off rather than dimmed. Giving the backdrop the same dim treatment every other overlay in the app already uses makes the whole page recede uniformly behind the panel, the same way it does for a `Sheet` or `Dialog` — no more hard edge, and no page-specific layout changes needed since the fix is in the shared panel itself.

## Verification

`npx tsc --noEmit` passed with no new errors.
