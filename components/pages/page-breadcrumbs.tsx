"use client";

import { useEffect, useState } from "react";
import { ChevronRight, FileText, Home } from "lucide-react";
import { PageIcon } from "@/components/pages/page-icon";
import { pageNavSourceHref, pageNavSourceLabel, type PageNavSource } from "@/lib/pages/navigation-source";

export interface BreadcrumbAncestor {
  id:      string;
  shortId: string;
  title:   string | null;
  icon:    string | null;
}

interface PageBreadcrumbsProps {
  workspaceSlug: string;
  workspaceName: string;
  ancestors:     BreadcrumbAncestor[];
  currentPageId: string;
  initialTitle:  string | null;
  initialIcon:   string | null;
  navSource?:    PageNavSource;
}

// Server-fetched titles/icons are frozen at request time; listening for the
// shared "workflik:page-title-changed" event keeps crumbs live without a reload.
export function PageBreadcrumbs({
  workspaceSlug, workspaceName, ancestors: initialAncestors,
  currentPageId, initialTitle, initialIcon, navSource,
}: PageBreadcrumbsProps) {
  const [ancestors, setAncestors] = useState(initialAncestors);
  const [title, setTitle] = useState(initialTitle);
  const [icon, setIcon]   = useState(initialIcon);

  useEffect(() => {
    function onTitleChanged(e: Event) {
      const detail = (e as CustomEvent<{ pageId: string; title?: string; icon?: string | null }>).detail;
      if (!detail) return;
      if (detail.pageId === currentPageId) {
        if (detail.title !== undefined) setTitle(detail.title);
        if (detail.icon !== undefined) setIcon(detail.icon);
        return;
      }
      setAncestors((prev) => prev.map((a) => a.id === detail.pageId
        ? { ...a, title: detail.title !== undefined ? detail.title : a.title, icon: detail.icon !== undefined ? detail.icon : a.icon }
        : a));
    }
    window.addEventListener("workflik:page-title-changed", onTitleChanged);
    return () => window.removeEventListener("workflik:page-title-changed", onTitleChanged);
  }, [currentPageId]);

  return (
    <nav className="flex min-w-0 items-center gap-0.5 text-sm">
      <a
        href={`/app/${workspaceSlug}`}
        className="flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-1 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
      >
        <Home size={13} className="shrink-0" />
        <span className="font-medium">{workspaceName}</span>
      </a>

      {navSource && (() => {
        const label = pageNavSourceLabel(navSource);
        const href  = pageNavSourceHref(navSource, workspaceSlug);
        return (
          <span className="flex min-w-0 items-center gap-0.5">
            <ChevronRight size={12} className="shrink-0 text-foreground/50" />
            {href ? (
              <a
                href={href}
                className="max-w-30 truncate rounded-sm px-2 py-1 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
              >
                {label}
              </a>
            ) : (
              <span className="max-w-30 truncate px-2 py-1 text-muted-foreground">
                {label}
              </span>
            )}
          </span>
        );
      })()}

      {ancestors.map((crumb) => (
        <span key={crumb.id} className="flex min-w-0 items-center gap-0.5">
          <ChevronRight size={12} className="shrink-0 text-foreground/50" />
          <a
            href={`/app/${workspaceSlug}/${crumb.shortId}`}
            className="flex max-w-30 items-center gap-1.5 truncate rounded-sm px-2 py-1 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
          >
            {crumb.icon
              ? <PageIcon icon={crumb.icon} size={12} />
              : <FileText size={12} className="shrink-0" />
            }
            {crumb.title || "Untitled"}
          </a>
        </span>
      ))}

      <span className="flex min-w-0 items-center gap-0.5">
        <ChevronRight size={12} className="shrink-0 text-foreground/50" />
        <span className="flex max-w-60 items-center gap-1.5 truncate px-2 py-1 text-sm font-semibold text-foreground">
          {icon
            ? <PageIcon icon={icon} size={12} />
            : <FileText size={12} className="shrink-0 text-muted-foreground" />
          }
          {title || "Untitled"}
        </span>
      </span>
    </nav>
  );
}
