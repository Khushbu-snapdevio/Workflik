# Bug: Orbit Admin Workspaces list shows "0h ago" for workspaces created seconds/minutes ago

**Reported:** 2026-07-27

## Symptom

On `/orbit-admin/orbit/workspaces`, a workspace created moments ago showed "0h ago" instead of a meaningful relative time like "5s ago" or "2m ago".

## Root cause

`app/orbit-admin/orbit/workspaces/page.tsx` had its own local `ago()` helper that only handled the hours and days tiers:

```ts
function ago(d: Date | null | undefined) {
 if (!d) return "—";
 const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
 if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
 return `${Math.floor(s / 86400)}d ago`;
}
```

Every other Orbit Admin page (Overview, Users, Workspace detail, Audit Trail) has its own copy of this helper that *does* include seconds and minutes tiers — this one copy was missing them, so anything under an hour old floor-divided to `0h ago`.
