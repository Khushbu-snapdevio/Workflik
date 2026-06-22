"use client";

import {
  BookOpenIcon,
  CaretDoubleRightIcon,
  CaretDownIcon,
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
import { NewPageButton } from "@/components/workspace/new-page-button";

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

const MIN_WIDTH     = 260;
const MAX_WIDTH     = 480;
const DEFAULT_WIDTH = 280;

export function Sidebar({ workspaceId, workspaceSlug, userEmail, isAdmin = false }: Props) {
  const pathname = usePathname();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [filter] = useState("");
  const [pages, setPages] = useState<PageItem[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [recentlyVisited, setRecentlyVisited] = useState<{ id: string; pageId: string; visitedAt: string }[]>([]);
  const [newMenu, setNewMenu] = useState(false);
  const [pagesExpanded, setPagesExpanded] = useState(true);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);

  const favoritePageIds = new Set(favorites.map((f) => f.pageId));

  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const currentWidthRef = useRef(DEFAULT_WIDTH);

  useEffect(() => {
    fetch("/api/user/preferences")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.sidebarWidth === "number") {
          const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, d.sidebarWidth));
          setWidth(clamped);
          currentWidthRef.current = clamped;
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

  const fetchFavorites = useCallback(() => {
    fetch(`/api/user/favorites?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => setFavorites(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [workspaceId]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  useEffect(() => {
    window.addEventListener("workflik:favorites-changed", fetchFavorites);
    return () => window.removeEventListener("workflik:favorites-changed", fetchFavorites);
  }, [fetchFavorites]);

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

  function handleToggleFavorite(pageId: string, isFav: boolean) {
    window.dispatchEvent(new CustomEvent("workflik:favorites-changed", { detail: { pageId, isFavorited: !isFav } }));
    if (isFav) {
      setFavorites((prev) => prev.filter((f) => f.pageId !== pageId));
      fetch(`/api/user/favorites/${pageId}`, { method: "DELETE" }).catch(() => {});
    } else {
      // Optimistic add
      const tempId = crypto.randomUUID();
      setFavorites((prev) => [...prev, { id: tempId, pageId, orderIndex: prev.length }]);
      fetch("/api/user/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, workspaceId }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setFavorites((prev) => prev.map((f) => (f.id === tempId ? data : f)));
          }
        })
        .catch(() => {
          setFavorites((prev) => prev.filter((f) => f.id !== tempId));
        });
    }
  }

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
      <aside className="flex h-screen w-[64px] shrink-0 flex-col items-center border-r border-primary/20 bg-sidebar text-sidebar-foreground">

        {/* Expand button */}
        <div className="flex w-full items-center justify-center border-b border-sidebar-border py-[11px]">
          <button
            onClick={toggleCollapse}
            title="Expand sidebar"
            type="button"
            className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-sidebar-foreground/35 outline-none transition-all hover:bg-primary/[0.06] hover:text-sidebar-foreground active:scale-[0.92]"
          >
            <CaretDoubleRightIcon size={16} />
          </button>
        </div>

        {/* Primary nav */}
        <nav className="flex w-full flex-col items-center gap-1 px-2 py-3">
          <CollapsedNavItem href={`/app/${workspaceSlug}`} label="Home" active={pathname === `/app/${workspaceSlug}`}>
            <HouseIcon size={18} weight={pathname === `/app/${workspaceSlug}` ? "fill" : "regular"} />
          </CollapsedNavItem>
          <CollapsedSearchItem label="Search"><MagnifyingGlassIcon size={18} /></CollapsedSearchItem>
          <NotificationBell workspaceSlug={workspaceSlug} workspaceId={workspaceId} collapsed />
          <CollapsedNavItem href={`/app/${workspaceSlug}/library`} label="Library" active={pathname.startsWith(`/app/${workspaceSlug}/library`)}>
            <BookOpenIcon size={18} weight={pathname.startsWith(`/app/${workspaceSlug}/library`) ? "fill" : "regular"} />
          </CollapsedNavItem>
          <CollapsedNavItem href={`/app/${workspaceSlug}/templates`} label="Templates" active={pathname.startsWith(`/app/${workspaceSlug}/templates`)}>
            <SquaresFourIcon size={18} weight={pathname.startsWith(`/app/${workspaceSlug}/templates`) ? "fill" : "regular"} />
          </CollapsedNavItem>
          <div className="my-1 w-8 border-t border-sidebar-border/70" />
          <div className="group relative w-full">
            <NewPageButton
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
              className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-sidebar-foreground/50 transition-all hover:bg-primary/[0.05] hover:text-sidebar-foreground disabled:opacity-60"
            >
              <PlusIcon size={18} weight="bold" />
            </NewPageButton>
            <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-popover px-2.5 py-1.5 opacity-0 shadow-[var(--shadow-float)] transition-opacity group-hover:opacity-100">
              <p className="text-xs font-semibold text-popover-foreground">New Page</p>
            </div>
          </div>
        </nav>

        <div className="flex-1" />

        {/* Footer nav */}
        <nav className="flex w-full flex-col items-center gap-1 border-t border-sidebar-border px-2 py-3">
          <CollapsedNavItem href={`/app/${workspaceSlug}/trash`} label="Trash"><TrashIcon size={18} /></CollapsedNavItem>
          <CollapsedNavItem href={`/app/${workspaceSlug}/settings`} label="Settings"><GearIcon size={18} /></CollapsedNavItem>
          {isAdmin && (
            <CollapsedNavItem href="/Orbit-admin/orbit" label="Admin Panel">
              <svg className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V5l7-3z"/>
              </svg>
            </CollapsedNavItem>
          )}
        </nav>

        {/* User avatar */}
        <div className="flex w-full items-center justify-center border-t border-sidebar-border py-3">
          <div className="group relative">
            <div className="flex size-8 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] bg-primary text-[13px] font-bold uppercase text-primary-foreground shadow-sm transition-all hover:scale-105 hover:shadow-md hover:ring-2 hover:ring-primary/30">
              {userEmail[0].toUpperCase()}
            </div>
            <div className="pointer-events-none absolute bottom-0 left-full z-50 ml-3 min-w-[160px] whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-popover px-3 py-2 opacity-0 shadow-[var(--shadow-float)] transition-opacity group-hover:opacity-100">
              <p className="text-xs font-semibold text-popover-foreground">{userEmail.split("@")[0]}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{userEmail}</p>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      data-tour="sidebar"
      className="relative flex h-screen shrink-0 flex-col border-r border-primary/20 bg-sidebar text-sidebar-foreground"
      style={{ width }}
    >
      {/* Workspace header */}
      <div className="flex shrink-0 items-center gap-1 border-b border-sidebar-border px-2 py-1.5">
        <div className="min-w-0 flex-1">
          <WorkspaceSwitcher currentSlug={workspaceSlug} />
        </div>

        {/* New dropdown */}
        <div className="relative" ref={newMenuRef}>
          <button
            data-tour="new-page"
            onClick={() => setNewMenu((v) => !v)}
            title="Create new…"
            type="button"
            className={`flex size-7 items-center justify-center rounded-[var(--radius-sm)] outline-none transition-all ${
              newMenu
                ? "bg-primary text-white"
                : "text-sidebar-foreground/35 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
            }`}
          >
            <PlusIcon size={14} weight="bold" />
          </button>

          {newMenu && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-popover p-1 shadow-[var(--shadow-float)]">
              <NewPageButton
                workspaceId={workspaceId}
                workspaceSlug={workspaceSlug}
                onBeforeCreate={() => setNewMenu(false)}
                className="group flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors hover:bg-accent disabled:opacity-60"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-muted text-muted-foreground">
                  <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 1.5H3A1.5 1.5 0 001.5 3v8A1.5 1.5 0 003 12.5h8A1.5 1.5 0 0012.5 11V6L8 1.5z"/>
                    <path d="M8 1.5V6h4.5"/>
                    <line x1="4.5" y1="8.5" x2="9.5" y2="8.5"/>
                  </svg>
                </span>
                <span>
                  <span className="block text-xs font-semibold text-foreground">New Page</span>
                  <span className="block text-xs text-muted-foreground">Docs, notes, wikis</span>
                </span>
              </NewPageButton>

              <Link
                href={`/app/${workspaceSlug}/new-database`}
                onClick={() => setNewMenu(false)}
                className="group flex items-center gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 transition-colors hover:bg-accent"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-muted text-muted-foreground">
                  <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1.5" y="1.5" width="11" height="11" rx="1.5"/>
                    <line x1="1.5" y1="5" x2="12.5" y2="5"/>
                    <line x1="1.5" y1="8.5" x2="12.5" y2="8.5"/>
                    <line x1="5" y1="5" x2="5" y2="12.5"/>
                  </svg>
                </span>
                <span>
                  <span className="block text-xs font-semibold text-foreground">New Database</span>
                  <span className="block text-xs text-muted-foreground">Tables, boards, calendars</span>
                </span>
              </Link>

              <div className="my-1 border-t border-border" />

              <button
                type="button"
                onClick={() => { setNewMenu(false); setShowTemplateGallery(true); }}
                className="group flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors hover:bg-accent"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-muted text-muted-foreground">
                  <SquaresFourIcon size={13} />
                </span>
                <span>
                  <span className="block text-xs font-semibold text-foreground">From Template</span>
                  <span className="block text-xs text-muted-foreground">Start from a template</span>
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
          className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-sidebar-foreground/35 outline-none transition-all hover:bg-sidebar-accent/70 hover:text-sidebar-foreground active:scale-[0.92]"
          onClick={toggleCollapse}
          title="Collapse sidebar"
          type="button"
        >
          <CaretDoubleRightIcon className="rotate-180" size={13} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Quick nav */}
        <nav className="px-2 py-1.5">
          <NavButton
            href={`/app/${workspaceSlug}`}
            icon={<HouseIcon size={15} weight={pathname === `/app/${workspaceSlug}` ? "fill" : "regular"} />}
            label="Home"
            active={pathname === `/app/${workspaceSlug}`}
          />
          <span data-tour="search"><SearchNavButton icon={<MagnifyingGlassIcon size={15} />} /></span>
          <span data-tour="notifications">
            <NotificationBell workspaceSlug={workspaceSlug} workspaceId={workspaceId} />
          </span>
          <NavButton
            href={`/app/${workspaceSlug}/library`}
            icon={<BookOpenIcon size={15} weight={pathname.startsWith(`/app/${workspaceSlug}/library`) ? "fill" : "regular"} />}
            label="Library"
            active={pathname.startsWith(`/app/${workspaceSlug}/library`)}
          />
          <NavButton
            href={`/app/${workspaceSlug}/templates`}
            icon={<SquaresFourIcon size={15} weight={pathname.startsWith(`/app/${workspaceSlug}/templates`) ? "fill" : "regular"} />}
            label="Templates"
            active={pathname.startsWith(`/app/${workspaceSlug}/templates`)}
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
          <SectionLabel label="Pages" expanded={pagesExpanded} onToggle={() => setPagesExpanded(v => !v)} />
          {pagesExpanded && <PageTree
            favoritePageIds={favoritePageIds}
            filter={filter}
            loading={pagesLoading}
            onPagesChange={setPages}
            onToggleFavorite={handleToggleFavorite}
            pages={pages}
            workspaceId={workspaceId}
            workspaceSlug={workspaceSlug}
          />}
        </div>

        <div className="mx-2 border-t border-sidebar-border" />

        {/* Trash */}
        <div className="px-2 py-1.5">
          <NavButton
            href={`/app/${workspaceSlug}/trash`}
            icon={<TrashIcon size={15} />}
            label="Trash"
            active={pathname.startsWith(`/app/${workspaceSlug}/trash`)}
          />
        </div>
      </div>

      {/* Bottom nav — Settings + Admin */}
      <div className="shrink-0 border-t border-sidebar-border px-2 py-1.5">
        <NavButton
          href={`/app/${workspaceSlug}/settings`}
          icon={<GearIcon size={15} />}
          label="Settings"
          active={pathname.startsWith(`/app/${workspaceSlug}/settings`)}
        />
        {isAdmin && (
          <NavButton
            href="/Orbit-admin/orbit"
            icon={
              <svg className="size-[15px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M12 2l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V5l7-3z"/>
              </svg>
            }
            label="Orbit Admin"
            active={pathname.startsWith("/Orbit-admin")}
          />
        )}
      </div>

      {/* User footer */}
      <div className="shrink-0 border-t border-sidebar-border px-2 py-2">
        <div className="group flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-1.5 transition-all hover:bg-primary/[0.07] hover:ring-1 hover:ring-primary/20">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary text-xs font-bold uppercase text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
            {userEmail[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-sidebar-foreground group-hover:text-foreground">
              {userEmail.split("@")[0]}
            </p>
            <p className="truncate text-[10px] text-sidebar-foreground/50 group-hover:text-muted-foreground">
              {userEmail}
            </p>
          </div>
          <SignOutButton
            className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-sidebar-foreground/30 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
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
      className={`group flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-[7px] text-[13px] font-medium transition-all duration-100 ${
        active
          ? "bg-background text-foreground shadow-[var(--shadow-card)]"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      }`}
      href={href}
    >
      <span className={`shrink-0 transition-colors ${active ? "text-primary" : "text-muted-foreground/50 group-hover:text-muted-foreground"}`}>{icon}</span>
      <span className={`flex-1 ${active ? "font-semibold" : ""}`}>{label}</span>
      {shortcut && (
        <kbd className="shrink-0 rounded bg-sidebar-border/50 px-1 py-0.5 text-[10px] font-medium text-sidebar-foreground/35">
          {shortcut}
        </kbd>
      )}
      {active && <span className="ml-auto flex size-1.5 shrink-0 rounded-full bg-primary" />}
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
        className={`flex size-9 items-center justify-center rounded-[var(--radius-md)] transition-all duration-100 ${
          active
            ? "bg-background text-primary shadow-[var(--shadow-card)]"
            : "text-muted-foreground/50 hover:bg-muted/50 hover:text-foreground"
        }`}
      >
        {children}
      </Link>
      {/* Tooltip — appears to the right on hover */}
      <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-popover px-2.5 py-1.5 opacity-0 shadow-[var(--shadow-float)] transition-opacity group-hover:opacity-100">
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
        className="flex size-9 items-center justify-center rounded-[var(--radius-md)] text-muted-foreground/50 transition-all duration-100 hover:bg-muted/50 hover:text-foreground"
      >
        {children}
      </button>
      <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-popover px-2.5 py-1.5 opacity-0 shadow-[var(--shadow-float)] transition-opacity group-hover:opacity-100">
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
      className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-[7px] text-[13px] font-medium text-muted-foreground transition-all duration-100 hover:bg-muted/50 hover:text-foreground"
    >
      <span className="shrink-0 text-muted-foreground/50">{icon}</span>
      <span className="flex-1 text-left">Search</span>
      <kbd className="shrink-0 rounded bg-sidebar-border/50 px-1 py-0.5 text-[10px] font-medium text-sidebar-foreground/35">Ctrl+K</kbd>
    </button>
  );
}

function SectionLabel({ label, expanded, onToggle }: { label: string; expanded?: boolean; onToggle?: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="group mb-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-[7px] text-[13px] font-medium text-muted-foreground transition-all duration-100 hover:bg-muted/50 hover:text-foreground"
    >
      <svg className="size-[15px] shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
      <span className="flex-1 text-left">{label}</span>
      <CaretDownIcon
        size={13}
        className={`shrink-0 text-muted-foreground/40 transition-transform duration-150 group-hover:text-muted-foreground ${expanded ? "" : "-rotate-90"}`}
      />
    </button>
  );
}
