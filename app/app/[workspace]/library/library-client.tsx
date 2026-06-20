"use client";

import Link from "next/link";
import { useState } from "react";

type PageRow = {
  id:           string;
  shortId:      string;
  title:        string;
  icon:         string | null;
  kind:         string;
  isPrivate:    boolean;
  createdAt:    string;
  updatedAt:    string;
  creatorName:  string;
  visitedAt:    string | null;
  isRecent:     boolean;
  isFavorited:  boolean;
};

type Tab = "all" | "recents" | "favorites" | "private";

const TABS: { id: Tab; label: string }[] = [
  { id: "all",       label: "All Pages" },
  { id: "recents",   label: "Recents" },
  { id: "favorites", label: "Favorites" },
  { id: "private",   label: "Private" },
];

function PageIcon({ icon, kind }: { icon: string | null; kind: string }) {
  if (icon) return <span className="text-base leading-none">{icon}</span>;
  if (kind === "database") {
    return (
      <svg className="size-4 text-foreground/40" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/>
      </svg>
    );
  }
  return (
    <svg className="size-4 text-foreground/40" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  if (weeks < 5)  return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function LibraryClient({ pages, workspaceSlug }: { pages: PageRow[]; workspaceSlug: string }) {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const filtered = pages.filter((p) => {
    if (tab === "recents")   return p.isRecent;
    if (tab === "favorites") return p.isFavorited;
    if (tab === "private")   return p.isPrivate;
    return true;
  }).filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Title + search */}
      <div className="border-b border-border/60 px-8 pt-8 pb-0">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Library</h1>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              {t.id === "all" && (
                <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              )}
              {t.id === "recents" && (
                <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              )}
              {t.id === "favorites" && (
                <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              )}
              {t.id === "private" && (
                <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              )}
              {t.label}
              <span className="ml-0.5 text-xs text-muted-foreground">
                {tab === t.id ? filtered.length : (
                  t.id === "all"       ? pages.length :
                  t.id === "recents"   ? pages.filter((p) => p.isRecent).length :
                  t.id === "favorites" ? pages.filter((p) => p.isFavorited).length :
                                         pages.filter((p) => p.isPrivate).length
                )}
              </span>
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs">
              <svg className="size-3.5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="w-36 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                placeholder="Search pages…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                type="text"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-8 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="mb-4 size-12 text-muted-foreground/30" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <p className="text-sm font-medium text-muted-foreground">No pages found</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              {search ? "Try a different search term" : "Create your first page to get started"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="pb-2 pr-4 text-left text-xs font-semibold text-muted-foreground">Page name</th>
                <th className="pb-2 pr-4 text-left text-xs font-semibold text-muted-foreground">Created by</th>
                <th className="pb-2 pr-4 text-left text-xs font-semibold text-muted-foreground">Last edited</th>
                <th className="pb-2 pr-4 text-left text-xs font-semibold text-muted-foreground">Created</th>
                {tab === "recents" && (
                  <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Last visited</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((page) => (
                <tr
                  key={page.id}
                  className="group border-b border-border/30 transition-colors hover:bg-accent/40"
                >
                  <td className="py-2.5 pr-4">
                    <Link
                      href={`/app/${workspaceSlug}/${page.shortId}`}
                      className="flex min-w-0 items-center gap-2 font-medium text-foreground/90 hover:text-foreground"
                    >
                      <span className="shrink-0">
                        <PageIcon icon={page.icon} kind={page.kind} />
                      </span>
                      <span className="min-w-0 truncate max-w-xs">{page.title || "Untitled"}</span>
                      {page.isPrivate && (
                        <svg className="size-3 shrink-0 text-muted-foreground/50" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                        </svg>
                      )}
                      {page.isFavorited && (
                        <svg className="size-3 shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      )}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                    {page.creatorName}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                    {timeAgo(page.updatedAt)}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                    {timeAgo(page.createdAt)}
                  </td>
                  {tab === "recents" && (
                    <td className="py-2.5 text-xs text-muted-foreground">
                      {page.visitedAt ? timeAgo(page.visitedAt) : "—"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
