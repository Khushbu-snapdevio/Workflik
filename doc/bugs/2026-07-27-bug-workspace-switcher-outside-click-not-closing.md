# Bug: workspace switcher dropdown doesn't close when clicking outside it

**Reported:** 2026-07-27

## Symptom

Opening the sidebar's workspace switcher and then clicking anywhere in the main content area (outside the dropdown) left the dropdown open instead of closing it.

## Root cause

`components/sidebar/workspace-switcher.tsx` closed the dropdown with a full-screen click-catcher rendered as a plain nested sibling inside the sidebar's own DOM tree, not portaled to `document.body`:

```tsx
<div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
```

Reproduced live in a browser: this element's actual rendered box was clipped to 260×900 — the sidebar's own width — instead of the full viewport, despite `position: fixed; inset: 0`. None of the standard CSS mechanisms that legally change a `position: fixed` element's containing block (`transform`, `filter`, `perspective`, `will-change`, `contain`, `container-type`) were present on any ancestor, so the exact cause of the clipping wasn't pinned down further — but the effect was consistent and reproducible: clicks outside the sidebar's own bounds never reached the click-catcher at all.
