# Bug: browser back from an opened entry always lands on the database's first view tab

**Reported:** 2026-07-28

## Symptom

On a full-page database (e.g. "Brainstorm Session"), switching to a non-default view tab — "Gallery" — then opening any card/entry as a full page, then clicking the browser's back button, does **not** return to the "Gallery" tab. It always lands back on the first tab ("All Ideas"), discarding whichever tab the user was actually on.

## Root cause

`components/templates/template-page-client.tsx` (`TemplatePageClient`, the client component behind every full-page database) tracks the active view tab in plain React state:

```
const initView  = initViews.find((v) => v.id === defaultViewId) ?? initViews[0];
const [activeViewId, setActiveViewId] = useState(initView?.id ?? "");
```

Switching tabs (`switchView`) only calls `setActiveViewId(viewId)` — it never writes the choice to the URL or persists it server-side. Opening an entry (`handleClickEntry`) does a real `router.push` to a different route (`/app/{workspace}/{entryShortId}`), which unmounts `TemplatePageClient`. Clicking browser back re-navigates to the database's URL, which reloads the page fresh: the server re-renders `TemplatePageClient` from scratch and re-initializes `activeViewId` from `page.defaultViewId` — the database's stored default view (normally the first-created one, "All Ideas") — with no record anywhere of the "Gallery" tab the user had switched to.

The embedded database view (`components/database/database-page.tsx`, used for inline database blocks) has the identical pattern (`useState<string | null>(null)` reset to `data.views[0].id` on every mount), but the reported flow (a standalone "Test > Brainstorm Session" page) goes through `TemplatePageClient`.
