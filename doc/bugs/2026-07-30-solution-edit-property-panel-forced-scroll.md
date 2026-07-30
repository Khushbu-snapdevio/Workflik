# Solution: "Edit property" panel forces an internal scrollbar even for short content

**Fixed:** 2026-07-30

## What changed

`components/database/edit-property-panel.tsx`, in the panel's positioning logic:

1. **Open toward whichever side actually has more room**, instead of biasing toward "below" past a fixed 260px threshold:
   ```ts
   const openBelow = spaceBelow >= spaceAbove;
   ```
2. **Raised the height cap from 480px to 560px**, giving the panel a bit more headroom before it needs to constrain itself, on top of the positioning fix.

## Why this fixes the root cause

The squeeze happened because the panel could pick the side with *less* available space (below) purely because it cleared a fixed threshold, even when the other side (above) had substantially more room. Comparing `spaceBelow` against `spaceAbove` directly and picking the larger one means `maxHeight` is now always the larger of the two available amounts (still capped at 560px), so the Name/Type section is squeezed only when both directions are genuinely short on room — not whenever the trigger merely sits in the lower half of the page.
