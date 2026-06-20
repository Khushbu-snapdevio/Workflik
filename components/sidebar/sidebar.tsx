"use client";

import {
  CaretDoubleRightIcon,
  GearIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SignOutIcon,
  SquaresFourIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { FavoritesSection } from "@/components/sidebar/favorites-section";
import { PageTree } from "@/components/sidebar/page-tree";
import { RecentlyVisitedSection } from "@/components/sidebar/recently-visited-section";
import { WorkspaceSwitcher } from "@/components/sidebar/workspace-switcher";
import { TemplateGalleryModal } from "@/components/templates/template-gallery-modal";
import { NotificationBell } from "@/components/notifications/notification-bell";

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
  const [pagesLoading, setPagesLoading] = useState(true);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [recentlyVisited, setRecentlyVisited] = useState<{ id: string; pageId: string; visitedAt: string }[]>([]);
  const [newMenu, setNewMenu] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);

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

  const fetchPages = useCallback(() => {
    setPagesLoading(true);
    fetch(`/api/workspaces/${workspaceId}/pages/tree`)
      .then((r) => r.json())
      .then((d) => { setPages(Array.isArray(d) ? d : []); setPagesLoading(false); })
      .catch(() => setPagesLoading(false));
  }, [workspaceId]);

  useEffect(() => { fetchPages(); }, [fetchPages, pathname]);

  useEffect(() => {
    window.addEventListener("pages:refresh", fetchPages);
    return () => window.removeEventListener("pages:refresh", fetchPages);
  }, [fetchPages]);

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

  useEffect(() => {
    function h(e: MouseEvent) {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) setNewMenu(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

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
          <CollapsedSearchItem label="Search"><MagnifyingGlassIcon size={17} /></CollapsedSearchItem>
          <NotificationBell workspaceSlug={workspaceSlug} workspaceId={workspaceId} collapsed />
          <CollapsedNavItem href={`/app/${workspaceSlug}/settings`}     label="Settings"      ><GearIcon size={17} /></CollapsedNavItem>
          <div className="my-1 w-6 border-t border-sidebar-border" />
          <CollapsedNavItem href={`/app/${workspaceSlug}/new`}          label="New Page">
            <svg viewBox="0 0 16 16" className="size-[17px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.5 2H4a1.5 1.5 0 00-1.5 1.5v9A1.5 1.5 0 004 14h8a1.5 1.5 0 001.5-1.5V6.5L9.5 2z"/>
              <path d="M9.5 2v4.5H14"/>
              <line x1="5" y1="9" x2="11" y2="9"/>
            </svg>
          </CollapsedNavItem>
          <CollapsedNavItem href={`/app/${workspaceSlug}/new-database`} label="New Database">
            <svg viewBox="0 0 16 16" className="size-[17px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <rect x="1.5" y="1.5" width="13" height="13" rx="1.5"/>
              <line x1="1.5" y1="5.5" x2="14.5" y2="5.5"/>
              <line x1="1.5" y1="9.5" x2="14.5" y2="9.5"/>
              <line x1="5.5" y1="5.5" x2="5.5" y2="14.5"/>
            </svg>
          </CollapsedNavItem>
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
      data-tour="sidebar"
      className="relative flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      style={{ width }}
    >
      {/* Workspace header */}
      <div className="flex shrink-0 items-center gap-1 border-b border-sidebar-border px-2 py-2">
        <div className="min-w-0 flex-1">
          <WorkspaceSwitcher currentSlug={workspaceSlug} />
        </div>
        {/* ── New dropdown ── */}
        <div className="relative" ref={newMenuRef}>
          <button
            data-tour="new-page"
            onClick={() => setNewMenu((v) => !v)}
            title="Create new…"
            type="button"
            className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
              newMenu
                ? "bg-sidebar-accent text-sidebar-foreground"
                : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            }`}
          >
            <PlusIcon size={12} weight="bold" />
            <span>New</span>
          </button>

          {newMenu && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
              {/* New Page */}
              <Link
                href={`/app/${workspaceSlug}/new`}
                onClick={() => setNewMenu(false)}
                className="group flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-accent"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground/60 transition-colors group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary">
                  <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 1.5H3A1.5 1.5 0 001.5 3v8A1.5 1.5 0 003 12.5h8A1.5 1.5 0 0012.5 11V6L8 1.5z"/>
                    <path d="M8 1.5V6h4.5"/>
                    <line x1="4" y1="8.5" x2="10" y2="8.5"/>
                    <line x1="4" y1="10.5" x2="7" y2="10.5"/>
                  </svg>
                </span>
                <span>
                  <span className="block text-[12.5px] font-semibold leading-tight text-foreground">New Page</span>
                  <span className="block text-[11px] leading-tight text-muted-foreground">Docs, notes, wikis</span>
                </span>
              </Link>

              <div className="mx-3 border-t border-border/60" />

              {/* New Database */}
              <Link
                href={`/app/${workspaceSlug}/new-database`}
                onClick={() => setNewMenu(false)}
                className="group flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-accent"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground/60 transition-colors group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary">
                  <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1.5" y="1.5" width="11" height="11" rx="1.5"/>
                    <line x1="1.5" y1="5" x2="12.5" y2="5"/>
                    <line x1="1.5" y1="8.5" x2="12.5" y2="8.5"/>
                    <line x1="5" y1="5" x2="5" y2="12.5"/>
                  </svg>
                </span>
                <span>
                  <span className="block text-[12.5px] font-semibold leading-tight text-foreground">New Database</span>
                  <span className="block text-[11px] leading-tight text-muted-foreground">Tables, boards, calendars</span>
                </span>
              </Link>

              <div className="mx-3 border-t border-border/60" />

              {/* From Template */}
              <button
                type="button"
                onClick={() => { setNewMenu(false); setShowTemplateGallery(true); }}
                className="group flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-accent"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground/60 transition-colors group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary">
                  <SquaresFourIcon size={13} />
                </span>
                <span>
                  <span className="block text-[12.5px] font-semibold leading-tight text-foreground">From Template</span>
                  <span className="block text-[11px] leading-tight text-muted-foreground">Start from a template</span>
                </span>
              </button>
            </div>
          )}

          {showTemplateGallery && (
            <TemplateGalleryModal
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
              onClose={() => setShowTemplateGallery(false)}
            />
          )}
        </div>
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
          <span data-tour="search"><SearchNavButton icon={<MagnifyingGlassIcon size={15} />} /></span>
          <span data-tour="notifications">
            <NotificationBell workspaceSlug={workspaceSlug} workspaceId={workspaceId} />
          </span>
          <NavButton
            href={`/app/${workspaceSlug}/settings`}
            icon={<GearIcon size={15} />}
            label="Settings"
          />
          <NavButton
            href={`/app/${workspaceSlug}/templates`}
            icon={<SquaresFourIcon size={15} />}
            label="Templates"
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
            loading={pagesLoading}
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
          <SignOutButton
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            title="Sign out"
          >
            <SignOutIcon size={13} />
          </SignOutButton>
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

function CollapsedSearchItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group relative w-full">
      <button
        type="button"
        onClick={() => document.dispatchEvent(new CustomEvent("workflik:open-search"))}
        className="flex w-full items-center justify-center rounded-md py-2 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
      >
        {children}
      </button>
      <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        <p className="text-xs font-semibold text-popover-foreground">{label}</p>
      </div>
    </div>
  );
}

function SearchNavButton({ icon }: { icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => document.dispatchEvent(new CustomEvent("workflik:open-search"))}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-left">Search</span>
      <span className="shrink-0 text-2xs text-sidebar-foreground/30">Ctrl+K</span>
    </button>
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
