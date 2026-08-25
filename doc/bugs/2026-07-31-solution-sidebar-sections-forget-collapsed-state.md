# Solution: persist each section's expand/collapse state to localStorage

**Fixed:** 2026-07-31

## What changed

**`hooks/use-persisted-toggle.ts`** (new) — `usePersistedToggle(key, defaultValue)`, a drop-in replacement for `useState<boolean>` that also reads/writes a localStorage entry under `key`. Supports both `set(true)` and `set((prev) => !prev)`, matching how the three call sites already used `setExpanded`.

**`components/sidebar/favorites-section.tsx`**, **`recently-visited-section.tsx`**, **`private-section.tsx`** — each section's `const [expanded, setExpanded] = useState(true)` is now `usePersistedToggle("pagevo:sidebar-<section>-expanded", true)`, with a distinct key per section.

## Why this fixes the root cause

The state itself was never wrong — toggling a section did update its own `expanded` value correctly. It just had nowhere to live once the component unmounted. Storing it in localStorage means remounting (sidebar collapse/expand, or a full page reload) reads back whatever the user last set instead of always starting from the hardcoded default.

## Verification

`tsc --noEmit` and `biome check` are clean on the new hook and all three changed files (the changed lines in each section file are minimal — one import, one line — with no new lint issues).
