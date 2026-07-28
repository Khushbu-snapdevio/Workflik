# Bug: "Clear all" button clipped off the edge of the notifications panel

**Reported:** 2026-07-28

## Symptom

In the notifications panel filter-tabs row (All / Mentions / Comments / Updates), the "Clear all" button on the right is partially cut off by the panel's right edge — only a fragment ("Clea" + icon) is visible, and part of it renders outside the panel border.

## Root cause

`components/notifications/notification-panel.tsx` renders the filter tabs and the "Clear all" button in one `flex items-center justify-between` row. The tabs wrapper (`<div className="flex items-center gap-0.5">`) has no `min-w-0`, so as a flex item its minimum width defaults to its content's intrinsic width (all four tab labels laid out on one line). The "Clear all" button is `shrink-0`, so it never gives up width either. With no flexible item able to shrink, the four tab buttons' combined intrinsic width plus the button's width exceeds the panel's content width (360px minus padding), so the row overflows the panel and pushes "Clear all" partly outside the visible/clipped area.
