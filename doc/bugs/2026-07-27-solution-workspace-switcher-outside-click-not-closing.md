# Solution: portal the click-catcher to `document.body`

**Fixed:** 2026-07-27

## What changed

**`components/sidebar/workspace-switcher.tsx`** — wrapped the full-screen click-catcher in `createPortal(..., document.body)`, matching the pattern already used elsewhere in this codebase for exactly this situation (`components/database/cells/cell-editor.tsx`'s `CellEditorPopover`):

```tsx
{createPortal(
  <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />,
  document.body
)}
```

## Why this fixes the root cause

Rendering the click-catcher as a direct child of `<body>` sidesteps whatever was clipping it inside the sidebar's nested DOM tree — a `document.body` child's `position: fixed` box is guaranteed to size against the true viewport. This is the same proven fix already relied on elsewhere in the app for viewport-spanning overlays.

## Verification

Reproduced and verified with a scripted Playwright session against the running dev server: before the fix, the overlay measured 260×900 (clipped to the sidebar's width) and a click in the main content area left the dropdown open; after the fix, the overlay is parented directly to `<body>`, measures the full 1400×900 viewport, and clicking outside correctly closes the dropdown (reopening still works, no console errors).
