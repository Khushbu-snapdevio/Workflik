"use client";

import {
  BellIcon,
  CaretDoubleRightIcon,
  GearIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SignOutIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import { FavoritesSection } from "@/components/sidebar/favorites-section";
import { PageTree } from "@/components/sidebar/page-tree";
import { RecentlyVisitedSection } from "@/components/sidebar/recently-visited-section";
import { WorkspaceSwitcher } from "@/components/sidebar/workspace-switcher";

type PageItem = {
  id: string;
  shortId: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  orderIndex: number;
  kind: string;
  isPrivate: boolean;
};

type FavoriteItem = {
  id: string;
  pageId: string;
  orderIndex: number;
};

type Props = {
  workspaceId: string;
  workspaceSlug: string;
  userEmail: string;
  isAdmin?: boolean;
};

const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export function Sidebar({ workspaceId, workspaceSlug, userEmail, isAdmin = false }: Props) {
  const [width, setWidth] = useState(240);
  const [collapsed, setCollapsed] = useState(false);
  const [filter, setFilter] = useState("");
  const [pages, setPages] = useState<PageItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [recentlyVisited, setRecentlyVisited] = useState<{ id: string; pageId: string; visitedAt: string }[]>([]);

  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const currentWidthRef = useRef(240);

  useEffect(() => {
    fetch("/api/user/preferences")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.sidebarWidth === "number") {
          setWidth(d.sidebarWidth);
          currentWidthRef.current = d.sidebarWidth;
        }
        if (typeof d.sidebarCollapsed === "boolean") {
          setCollapsed(d.sidebarCollapsed);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}/pages/tree`)
      .then((r) => r.json())
      .then((d) => setPages(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    fetch(`/api/user/favorites?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => setFavorites(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    fetch(`/api/user/recently-visited?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => setRecentlyVisited(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [workspaceId]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    resizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = currentWidthRef.current;
    e.preventDefault();
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!resizingRef.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + e.clientX - startXRef.current));
      currentWidthRef.current = next;
      setWidth(next);
    }
    function onUp() {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sidebarWidth: currentWidthRef.current }),
      }).catch(() => {});
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sidebarCollapsed: next }),
    }).catch(() => {});
  }

  const pagesMap = Object.fromEntries(pages.map((p) => [p.id, p]));

  if (collapsed) {
    return (
      <aside className="flex h-screen w-12 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-3 text-sidebar-foreground">
        <button
          className="flex size-8 items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground"
          onClick={toggleCollapse}
          title="Expand sidebar"
          type="button"
        >
          <CaretDoubleRightIcon size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="relative flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      style={{ width }}
    >
      {/* Workspace header */}
      <div className="flex items-center gap-1 border-b border-sidebar-border px-2 py-2">
        <div className="min-w-0 flex-1">
          <WorkspaceSwitcher currentSlug={workspaceSlug} />
        </div>
        <Link
          className="flex size-7 shrink-0 items-center justify-center text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          href={`/${workspaceSlug}/new`}
          title="New page"
        >
          <PlusIcon size={15} weight="bold" />
        </Link>
      </div>

      {/* Scrollable body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Quick nav */}
        <nav className="px-2 py-2">
          <NavButton
            href={`/${workspaceSlug}/search`}
            icon={<MagnifyingGlassIcon size={15} />}
            label="Search"
            shortcut="Ctrl+K"
          />
          <NavButton
            href={`/${workspaceSlug}/notifications`}
            icon={<BellIcon size={15} />}
            label="Notifications"
          />
          <NavButton
            href={`/${workspaceSlug}/settings`}
            icon={<GearIcon size={15} />}
            label="Settings"
          />
        </nav>

        <div className="mx-2 border-t border-sidebar-border" />

        {/* Favorites */}
        <FavoritesSection
          favorites={favorites}
          onRemove={(pageId) => {
            setFavorites((prev) => prev.filter((f) => f.pageId !== pageId));
            fetch(`/api/user/favorites/${pageId}`, { method: "DELETE" }).catch(() => {});
          }}
          onReorder={(ids) => {
            fetch("/api/user/favorites/reorder", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids }),
            }).catch(() => {});
          }}
          pagesMap={pagesMap}
          workspaceSlug={workspaceSlug}
        />

        {/* Recently Visited */}
        <RecentlyVisitedSection
          items={recentlyVisited}
          pagesMap={pagesMap}
          workspaceSlug={workspaceSlug}
        />

        <div className="mx-2 border-t border-sidebar-border" />

        {/* Page tree with filter */}
        <div className="flex flex-1 flex-col px-2 py-2">
          <SectionLabel label="Pages">
            <input
              className="min-w-0 flex-1 bg-transparent text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus:outline-none"
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter…"
              type="text"
              value={filter}
            />
          </SectionLabel>
          <PageTree
            filter={filter}
            onPagesChange={setPages}
            pages={pages}
            workspaceId={workspaceId}
            workspaceSlug={workspaceSlug}
          />
        </div>

        <div className="mx-2 border-t border-sidebar-border" />

        {/* Trash */}
        <div className="px-2 py-2">
          <NavButton
            href={`/${workspaceSlug}/trash`}
            icon={<TrashIcon size={15} />}
            label="Trash"
          />
        </div>
      </div>

      {/* Footer nav — Dashboard & Admin */}
      <div className="border-t border-sidebar-border px-2 py-2">
        <NavButton
          href="/dashboard"
          icon={
            <svg className="size-[15px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          }
          label="Dashboard"
        />
        {isAdmin && (
          <NavButton
            href="/orbit"
            icon={
              <svg className="size-[15px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            label="Admin Panel"
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2">
          <button
            className="flex size-7 shrink-0 items-center justify-center text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={toggleCollapse}
            title="Collapse sidebar"
            type="button"
          >
            <CaretDoubleRightIcon className="rotate-180" size={14} />
          </button>
          <span className="min-w-0 flex-1 truncate text-2xs font-semibold uppercase tracking-ui text-sidebar-foreground/30">
            {userEmail}
          </span>
          <form action={logoutAction}>
            <button
              className="flex size-7 shrink-0 items-center justify-center text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              title="Sign out"
              type="submit"
            >
              <SignOutIcon size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* Resize handle */}
      <button
        aria-label="Resize sidebar"
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize border-0 bg-transparent p-0 transition-colors hover:bg-sidebar-accent"
        onMouseDown={handleResizeStart}
        tabIndex={-1}
        type="button"
      />
    </aside>
  );
}

function NavButton({
  href,
  icon,
  label,
  shortcut,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}) {
  return (
    <Link
      className="flex w-full items-center gap-2.5 px-2 py-1.5 text-xs font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      href={href}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="shrink-0 text-2xs text-sidebar-foreground/30">
          {shortcut}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-1 flex items-center gap-2 px-2">
      <span className="text-2xs font-semibold uppercase tracking-ui text-sidebar-foreground/30">
        {label}
      </span>
      {children}
    </div>
  );
}
