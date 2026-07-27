# Bug: country-flag page icons render as raw letter pairs in the search popup

**Reported:** 2026-07-27

## Symptom

A page with a country-flag emoji icon showed the correct flag in the sidebar and the Library page list, but in the global search popup ("Search pages, databases, and more...") the same page showed only a two-letter country-code badge (e.g. "TR", "CG", "YE") instead of the flag.

## Root cause

The sidebar and Library table render page icons through the shared `PageIcon` component (`components/pages/page-icon.tsx`), which resolves a flag emoji's regional-indicator codepoints into an ISO country code and renders it via the `flag-icons` SVG set — necessary because raw regional-indicator glyphs don't render as flags on some platforms/fonts (they fall back to showing the two letters).

The search modal (`components/search/search-dialog.tsx`) had its own separate, simplified icon renderers — `SourceIcon` (for search results) and an inline icon block in `RecentRow` (for "Recently visited") — that just printed the raw icon string in a `<span>` when it was short, never calling into `PageIcon`/`flagIconCode`. On any font/platform that doesn't draw regional-indicator glyphs as flags, that's exactly the raw letter-pair fallback the user saw.
