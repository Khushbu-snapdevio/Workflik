# Bug: unread-count badge covers the bell icon once the count reaches two digits

**Reported:** 2026-07-27

## Symptom

In the expanded sidebar, the Notifications bell showed its unread-count badge correctly for single-digit counts, but once unread reached a two-digit number (e.g. "10"), the badge widened enough to visually swallow the bell icon underneath it — the row showed only a circular number badge where the bell should be.

## Root cause

`components/notifications/notification-bell.tsx`'s expanded-row badge was anchored with a fixed `right` offset on a wrapper sized exactly to the 15px bell icon, with only `min-w-[14px]` (no max-width):

```tsx
<span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] ...">{badge}</span>
```

Anchoring by `right` means the badge's *right* edge stays fixed while its *left* edge moves further left as the number gets wider. A single digit only nibbled a small corner of the icon; two digits widened the badge enough that its left edge crept most of the way across the 15px icon, visually replacing it.
