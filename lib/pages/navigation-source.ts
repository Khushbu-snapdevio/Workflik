// Registry of non-hierarchical entry points a page can be opened from (Library,
// Favorites, Search, Recently Visited, Notifications). Carried as a `?from=`
// query param on navigation so the breadcrumb can show where the user actually
// came from instead of always falling back to the page's real parent chain —
// see PageBreadcrumbs. A single registry keeps every source's label/link in one
// place instead of the breadcrumb hardcoding each source's name.
export const PAGE_NAV_SOURCES = {
  library:       { label: "Library",          href: (workspaceSlug: string) => `/app/${workspaceSlug}/library` },
  favorites:     { label: "Favorites",         href: (): string | null => null },
  search:        { label: "Search",            href: (): string | null => null },
  recent:        { label: "Recently Visited",  href: (): string | null => null },
  notifications: { label: "Notifications",     href: (): string | null => null },
} as const;

export type PageNavSource = keyof typeof PAGE_NAV_SOURCES;

export function isPageNavSource(value: string | undefined | null): value is PageNavSource {
  return !!value && value in PAGE_NAV_SOURCES;
}

export function pageNavSourceLabel(source: PageNavSource): string {
  return PAGE_NAV_SOURCES[source].label;
}

export function pageNavSourceHref(source: PageNavSource, workspaceSlug: string): string | null {
  return PAGE_NAV_SOURCES[source].href(workspaceSlug);
}
