# Bug: workspace-home search bar looks clipped/hidden when the Notification Inbox opens

**Reported:** 2026-07-21

## Symptom

On the workspace Home page, opening the Notification Inbox (bell icon) slides in a 360px panel docked to the right edge of the screen. The home page's topbar search bar sits in that same horizontal band, so once the panel opens, the search bar appears to be cut in half — its left portion still visible, its right portion abruptly hidden right where the panel's left edge falls. It reads as broken/glitchy rather than as "a panel opened over this."

## Root cause

`components/notifications/notification-panel.tsx` renders a backdrop `<div>` behind the panel purely as an invisible click-catcher (`onClick={closePanel}`) — it was never given a visual treatment:

```tsx
<div
  className="fixed inset-0"
  style={{ zIndex: 599, pointerEvents: animIn ? "auto" : "none" }}
  onClick={closePanel}
/>
```

Every other overlay in this codebase that sits above page content — the shadcn `Sheet`/`Dialog` primitives (`components/ui/sheet.tsx`, `components/ui/dialog.tsx`) — dims what's underneath with `bg-black/20`. Without that same dimming, whatever page content happens to fall in the panel's horizontal band (here, the home page's search bar, wide enough to visibly straddle the panel's left edge) just looks abruptly clipped instead of legibly "behind an open overlay."

## Reproduction

1. Go to the workspace Home page (search bar visible in the topbar).
2. Click the Notifications bell to open the Inbox panel.
3. The search bar's right portion, in the panel's horizontal band, disappears with a hard edge instead of fading behind a dimmed backdrop.
