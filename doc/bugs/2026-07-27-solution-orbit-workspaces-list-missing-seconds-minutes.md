# Solution: add the missing seconds/minutes tiers to the workspaces list's `ago()` helper

**Fixed:** 2026-07-27

## What changed

**`app/orbit-admin/orbit/workspaces/page.tsx`** — added the same `s < 60` / `s < 3600` tiers already present in every other Orbit Admin page's `ago()` helper:

```ts
if (s < 60) return `${s}s ago`;
if (s < 3600) return `${Math.floor(s / 60)}m ago`;
```

## Why this fixes the root cause

This brings the one inconsistent copy of `ago()` in line with the other four copies already in the codebase (Overview, Users, Workspace detail, Audit Trail), which never had this gap. No shared helper existed to extract into, so the fix matches the existing per-page duplication pattern rather than introducing a new abstraction.
