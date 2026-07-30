# Bug: inline database view tabs get clipped and "Add a view" becomes unreachable

**Reported:** 2026-07-30 (user-reported, with a screenshot of an inline database showing a "Calendar" view tab rendered as "Cale")

## Symptom

In an inline database (embedded in a page, narrower than a full-page database), the active view tab's name was cut off mid-word (e.g. "Calendar" showed as "Cale"), and there was no visible way to add a new view of a different type (e.g. Board) — the "+ Add a view" button, which opens the view-type picker, wasn't reachable at all.

## Root cause

`components/database/toolbar.tsx` renders view tabs ("Default View", "Calendar", …) inside a `flex-1 min-w-0 overflow-x-auto` strip with its scrollbar hidden (`[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`), by design — so a growing number of views scrolls internally instead of pushing the always-visible Filter/Sort/Properties actions cluster off the right edge of a narrow container.

Two problems combined in the inline/narrow case:

1. The "Add a view" button was rendered as the *last* child inside that same scrollable strip (`toolbar.tsx`, previously right after the `views.map()` loop). When the strip is narrower than its content — normal for an inline database — the button simply falls past the visible/scrollable boundary with no scrollbar or affordance to reach it, making the view-type picker undiscoverable.
2. The strip's scroll position never adjusted to keep the active tab in view. It starts at `scrollLeft: 0`, so a view further along the list (here, the 2nd of 2) has no guarantee of being fully visible — its trailing characters can sit past the container's right edge and get clipped, with no scrollbar hint that more content exists.

Both stem from the same design tradeoff (hide the scrollbar, let the strip silently overflow) without anything to compensate — no scroll-into-view behavior for the active tab, and no guarantee that reachable-but-important controls (Add a view) stay outside the overflow-clipped region.
