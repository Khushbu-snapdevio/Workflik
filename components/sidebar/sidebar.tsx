"use client";

import {
  BellIcon,
  CaretDoubleRightIcon,
  GearIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SignOutIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
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
      <aside className="flex h-screen w-[52px] shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar text-sidebar-foreground">

        {/* Expand button */}
        <div className="flex w-full items-center justify-center border-b border-sidebar-border py-[11px]">
          <button
            onClick={toggleCollapse}
            title="Expand sidebar"
            type="button"
            className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <CaretDoubleRightIcon size={15} />
          </button>
        </div>

        {/* Primary nav */}
        <nav className="flex w-full flex-col items-center gap-1 px-1.5 py-3">
          <CollapsedNavItem href={`/app/${workspaceSlug}`}              label="Home"          active={pathname === `/app/${workspaceSlug}`}><HouseIcon size={17} /></CollapsedNavItem>
          <CollapsedNavItem href={`/app/${workspaceSlug}/search`}       label="Search"        ><MagnifyingGlassIcon size={17} /></CollapsedNavItem>
          <CollapsedNavItem href={`/app/${workspaceSlug}/notifications`} label="Notifications" ><BellIcon size={17} /></CollapsedNavItem>
          <CollapsedNavItem href={`/app/${workspaceSlug}/settings`}     label="Settings"      ><GearIcon size={17} /></CollapsedNavItem>
        </nav>

        <div className="flex-1" />

        {/* Footer nav */}
        <nav className="flex w-full flex-col items-center gap-1 border-t border-sidebar-border px-1.5 py-3">
          <CollapsedNavItem href={`/app/${workspaceSlug}/trash`} label="Trash"><TrashIcon size={17} /></CollapsedNavItem>
          <CollapsedNavItem href="/platform/dashboard" label="Dashboard">
            <svg className="size-[17px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </CollapsedNavItem>
          {isAdmin && (
            <CollapsedNavItem href="/Orbit-admin/orbit" label="Admin Panel">
              <svg className="size-[17px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </CollapsedNavItem>
          )}
        </nav>

        {/* User avatar */}
        <div className="flex w-full items-center justify-center border-t border-sidebar-border py-3">
          <div className="group relative">
            <div
              className="flex size-7 cursor-default items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold uppercase text-primary"
            >
              {userEmail[0].toUpperCase()}
            </div>
            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-0 left-full z-50 ml-2.5 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              <p className="text-xs font-medium text-popover-foreground">{userEmail}</p>
            </div>
          </div>
        </div>

      </aside>
    );
  }

  return (
    <aside
      className="relative flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      style={{ width }}
    >
      {/* Workspace header */}
      <div className="flex shrink-0 items-center gap-1 border-b border-sidebar-border px-2 py-2">
        <div className="min-w-0 flex-1">
          <WorkspaceSwitcher currentSlug={workspaceSlug} />
        </div>
        <Link
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          href={`/app/${workspaceSlug}/new`}
          title="New page"
        >
          <PlusIcon size={15} weight="bold" />
        </Link>
        <button
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={toggleCollapse}
          title="Collapse sidebar"
          type="button"
        >
          <CaretDoubleRightIcon className="rotate-180" size={14} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Quick nav */}
        <nav className="px-2 py-2">
          <NavButton
            href={`/app/${workspaceSlug}`}
            icon={<HouseIcon size={15} />}
            label="Home"
            active={pathname === `/app/${workspaceSlug}`}
          />
          <NavButton
            href={`/app/${workspaceSlug}/search`}
            icon={<MagnifyingGlassIcon size={15} />}
            label="Search"
            shortcut="Ctrl+K"
          />
          <NavButton
            href={`/app/${workspaceSlug}/notifications`}
            icon={<BellIcon size={15} />}
            label="Notifications"
          />
          <NavButton
            href={`/app/${workspaceSlug}/settings`}
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
            href={`/app/${workspaceSlug}/trash`}
            icon={<TrashIcon size={15} />}
            label="Trash"
          />
        </div>
      </div>

      {/* Footer nav — Dashboard & Admin */}
      <div className="border-t border-sidebar-border px-2 py-2">
        <NavButton
          href="/platform/dashboard"
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
            href="/Orbit-admin/orbit"
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
      <div className="shrink-0 border-t border-sidebar-border px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold uppercase text-primary">
            {userEmail[0].toUpperCase()}
          </div>
          <span className="min-w-0 flex-1 truncate text-xs text-sidebar-foreground/60">
            {userEmail}
          </span>
          <form action={logoutAction}>
            <button
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              title="Sign out"
              type="submit"
            >
              <SignOutIcon size={13} />
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
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  active?: boolean;
}) {
  return (
    <Link
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground ${
        active
          ? "bg-sidebar-accent text-sidebar-primary font-semibold"
          : "text-sidebar-foreground/70"
      }`}
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

function CollapsedNavItem({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative w-full">
      <Link
        href={href}
        className={`flex w-full items-center justify-center rounded-md py-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground ${
          active
            ? "bg-sidebar-accent text-sidebar-primary"
            : "text-sidebar-foreground/50"
        }`}
      >
        {children}
      </Link>
      {/* Tooltip — appears to the right on hover */}
      <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        <p className="text-xs font-semibold text-popover-foreground">{label}</p>
      </div>
    </div>
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
      <span className="text-2xs font-semibold uppercase tracking-ui text-sidebar-foreground/50">
        {label}
      </span>
      {children}
    </div>
  );
}
