"use client";

import {
 BookOpen,
 PanelLeft,
 ChevronDown,
 Settings,
 Home,
 Search,
 Plus,
 LogOut,
 LayoutGrid,
 Trash2,
 FileText,
 Database,
 Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { FavoritesSection } from "@/components/sidebar/favorites-section";
import { PageTree } from "@/components/sidebar/page-tree";
import { PrivateSection } from "@/components/sidebar/private-section";
import { RecentlyVisitedSection } from "@/components/sidebar/recently-visited-section";
import { WorkspaceSwitcher } from "@/components/sidebar/workspace-switcher";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NewPageButton } from "@/components/workspace/new-page-button";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { useHoverTooltip } from "@/hooks/use-hover-tooltip";

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
 initialUserName: string | null;
 initialUserImage: string | null;
 isAdmin?: boolean;
 initialPages: PageItem[];
 initialFavorites: FavoriteItem[];
 initialRecentlyVisited: { id: string; pageId: string; visitedAt: string }[];
 initialSidebarWidth: number;
 initialSidebarCollapsed: boolean;
};

const MIN_WIDTH = 260;
const MAX_WIDTH = 480;

export function Sidebar({
 workspaceId,
 workspaceSlug,
 userEmail,
 initialUserName,
 initialUserImage,
 isAdmin = false,
 initialPages,
 initialFavorites,
 initialRecentlyVisited,
 initialSidebarWidth,
 initialSidebarCollapsed,
}: Props) {
 const pathname = usePathname();
 const [userImage, setUserImage] = useState<string | null>(initialUserImage);
 const [userName, setUserName] = useState<string | null>(initialUserName);
 const [width, setWidth] = useState(Math.max(MIN_WIDTH, initialSidebarWidth || MIN_WIDTH));
 const [collapsed, setCollapsed] = useState(initialSidebarCollapsed);
 const [filter] = useState("");
 const [pages, setPages] = useState<PageItem[]>(initialPages);
 const [pagesLoading, setPagesLoading] = useState(false);
 // Lets fetchPages check "do we already have pages?" without depending on
 // `pages` (which would redefine the callback, and the pages:refresh
 // listener, on every mutation).
 const pagesRef = useRef(pages);
 useEffect(() => { pagesRef.current = pages; }, [pages]);
 const [favorites, setFavorites] = useState<FavoriteItem[]>(initialFavorites);
 const [recentlyVisited, setRecentlyVisited] = useState<{ id: string; pageId: string; visitedAt: string }[]>(initialRecentlyVisited);
 const [newMenu, setNewMenu] = useState(false);
 const [userMenu, setUserMenu] = useState(false);
 const [pagesExpanded, setPagesExpanded] = useState(true);
 const [searchOpen, setSearchOpen] = useState(false);
 const newMenuRef = useRef<HTMLDivElement>(null);
 const userMenuRef = useRef<HTMLDivElement>(null);
 const { tooltip, showTooltip, hideTooltip } = useHoverTooltip();

 const favoritePageIds = new Set(favorites.map((f) => f.pageId));
 const displayName = userName?.trim() || formatEmailAsName(userEmail);

 const resizingRef = useRef(false);
 const startXRef = useRef(0);
 const startWidthRef = useRef(0);
 const currentWidthRef = useRef(initialSidebarWidth);

 // Re-fetch page tree only when a mutation explicitly fires the refresh event.
 // Only show the loading skeleton when there's no tree to keep showing yet —
 // a background refresh (e.g. after adding/duplicating a page) swaps the
 // data in silently instead of flashing the whole tree to a skeleton.
 const fetchPages = useCallback(() => {
  if (pagesRef.current.length === 0) setPagesLoading(true);
  fetch(`/api/workspaces/${workspaceId}/pages/tree`)
   .then((r) => r.json())
   .then((d) => { setPages(Array.isArray(d) ? d : []); setPagesLoading(false); })
   .catch(() => setPagesLoading(false));
 }, [workspaceId]);

 useEffect(() => {
  window.addEventListener("pages:refresh", fetchPages);
  return () => window.removeEventListener("pages:refresh", fetchPages);
 }, [fetchPages]);

 useEffect(() => {
  function h(e: Event) {
   setUserImage((e as CustomEvent<{ image: string | null }>).detail.image);
  }
  window.addEventListener("workflik:user-image-changed", h);
  return () => window.removeEventListener("workflik:user-image-changed", h);
 }, []);

 useEffect(() => {
  function h(e: Event) {
   setUserName((e as CustomEvent<{ name: string | null }>).detail.name);
  }
  window.addEventListener("workflik:user-name-changed", h);
  return () => window.removeEventListener("workflik:user-name-changed", h);
 }, []);

 useEffect(() => {
  const open = () => setSearchOpen(true);
  const close = () => setSearchOpen(false);
  document.addEventListener("workflik:open-search", open);
  document.addEventListener("workflik:search-closed", close);
  return () => {
   document.removeEventListener("workflik:open-search", open);
   document.removeEventListener("workflik:search-closed", close);
  };
 }, []);

 const fetchFavorites = useCallback(() => {
  fetch(`/api/user/favorites?workspaceId=${workspaceId}`)
   .then((r) => r.json())
   .then((d) => setFavorites(Array.isArray(d) ? d : []))
   .catch(() => {});
 }, [workspaceId]);

 // "workflik:favorites-changed" exists so components that toggle a favorite
 // without going through handleToggleFavorite (favorite-button.tsx,
 // entry-context-menu.tsx) can tell the sidebar to pick up the change. But
 // handleToggleFavorite's OWN dispatch (fired to keep those same components
 // in sync when the toggle originates *here*) would otherwise also land on
 // this listener and kick off a refetch that races the optimistic update
 // a few lines below it — the GET can resolve with pre-toggle data and
 // silently wipe out the just-applied change. skipNextFavoritesEventRef
 // marks that one dispatch as already handled so it's not double-applied.
 const skipNextFavoritesEventRef = useRef(false);

 useEffect(() => {
  function onFavoritesChanged() {
   if (skipNextFavoritesEventRef.current) {
    skipNextFavoritesEventRef.current = false;
    return;
   }
   fetchFavorites();
  }
  window.addEventListener("workflik:favorites-changed", onFavoritesChanged);
  return () => window.removeEventListener("workflik:favorites-changed", onFavoritesChanged);
 }, [fetchFavorites]);

 useEffect(() => {
  function h(e: MouseEvent) {
   if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) setNewMenu(false);
   if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenu(false);
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
  skipNextFavoritesEventRef.current = true;
  window.dispatchEvent(new CustomEvent("workflik:favorites-changed", { detail: { pageId, isFavorited: !isFav } }));
  if (isFav) {
   const removed = favorites.find((f) => f.pageId === pageId);
   setFavorites((prev) => prev.filter((f) => f.pageId !== pageId));
   fetch(`/api/user/favorites/${pageId}`, { method: "DELETE" })
    .then((r) => {
     if (!r.ok && removed) {
      setFavorites((prev) => [...prev, removed]);
      toast.error("Couldn't remove favorite — please try again.");
     }
    })
    .catch(() => {
     if (removed) setFavorites((prev) => [...prev, removed]);
     toast.error("Couldn't remove favorite — please try again.");
    });
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
     } else {
      setFavorites((prev) => prev.filter((f) => f.id !== tempId));
      toast.error("Couldn't add favorite — please try again.");
     }
    })
    .catch(() => {
     setFavorites((prev) => prev.filter((f) => f.id !== tempId));
     toast.error("Couldn't add favorite — please try again.");
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

 return (
  <aside
   data-tour="sidebar"
   className="relative flex h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out"
   style={{ width: collapsed ? 64 : width }}
  >
   {/* ── Header ── collapses to a single centered icon, expands to full bar */}
   {collapsed ? (
    <div className="flex h-11 w-full shrink-0 items-center justify-center border-b border-sidebar-border">
     <button
      onClick={toggleCollapse}
      onMouseEnter={(e) => showTooltip("Expand sidebar", e)}
      onMouseLeave={hideTooltip}
      type="button"
      className="group relative flex size-9 items-center justify-center rounded-[var(--radius-sm)] outline-none transition-colors duration-150 hover:bg-sidebar-accent"
     >
      <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-200 group-hover:opacity-0">
       <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary text-[11px] font-bold uppercase text-primary-foreground">
        {workspaceSlug.charAt(0)}
       </span>
      </span>
      <span className="absolute inset-0 flex items-center justify-center text-sidebar-foreground/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-hover:text-sidebar-foreground">
       <PanelLeft size={16} />
      </span>
     </button>
    </div>
   ) : (
    /* Expanded header: workspace switcher + new-menu dropdown */
    <div className="relative shrink-0" ref={newMenuRef}>
     <div className="flex h-11 items-center gap-1 border-b border-sidebar-border px-2">
      <div className="min-w-0 flex-1">
       <WorkspaceSwitcher currentSlug={workspaceSlug} />
      </div>
      <button
       data-tour="new-page"
       onClick={() => setNewMenu((v) => !v)}
       onMouseEnter={(e) => showTooltip("Create new…", e)}
       onMouseLeave={hideTooltip}
       type="button"
       className={`flex size-7 items-center justify-center rounded-[var(--radius-sm)] outline-none transition-colors duration-150 ${
        newMenu
         ? "bg-primary text-primary-foreground"
         : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
       }`}
      >
       <Plus size={14} />
      </button>
      <button
       className="relative z-50 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-sidebar-foreground/70 outline-none transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
       onClick={toggleCollapse}
       onMouseEnter={(e) => showTooltip("Collapse sidebar", e)}
       onMouseLeave={hideTooltip}
       type="button"
      >
       <PanelLeft size={16} />
      </button>
     </div>
     {newMenu && (
      <div className="absolute right-2 top-[44px] z-[200] w-[240px] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-popover">
       <div className="px-3 pb-1 pt-2">
        <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground">Create</p>
        <NewPageButton
         workspaceId={workspaceId}
         workspaceSlug={workspaceSlug}
         onBeforeCreate={() => setNewMenu(false)}
         className="group flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-2 text-left transition-colors duration-150 hover:bg-accent disabled:opacity-60"
        >
         <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 text-primary">
          <FileText size={14} />
         </span>
         <span>
          <span className="block text-sm font-medium text-foreground">New Page</span>
          <span className="block text-xs text-muted-foreground">Docs, notes, wikis</span>
         </span>
        </NewPageButton>
       </div>
       <div className="mx-3 my-1 h-px bg-border/60" />
       <div className="px-3 pb-2.5 pt-1">
        <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground">More</p>
        <NewDatabaseButton
         workspaceId={workspaceId}
         workspaceSlug={workspaceSlug}
         onBeforeCreate={() => setNewMenu(false)}
        />
        <Link
         href={`/app/${workspaceSlug}/templates`}
         onClick={() => setNewMenu(false)}
         className="group mt-0.5 flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-2 text-left transition-colors duration-150 hover:bg-accent"
        >
         <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-warning/10 text-warning">
          <LayoutGrid size={14} />
         </span>
         <span>
          <span className="block text-sm font-medium text-foreground">From Template</span>
          <span className="block text-xs text-muted-foreground">Start from a template</span>
         </span>
        </Link>
       </div>
      </div>
     )}
    </div>
   )}

   {/* ── Collapsed body: icon-only nav ── */}
   {collapsed && (
    <>
     <nav className="flex w-full flex-col items-center gap-1 px-2 py-3">
      <CollapsedNavItem href={`/app/${workspaceSlug}`} label="Home" active={pathname === `/app/${workspaceSlug}` && !searchOpen}>
       <Home size={18} />
      </CollapsedNavItem>
      <CollapsedSearchItem><Search size={18} /></CollapsedSearchItem>
      <NotificationBell workspaceSlug={workspaceSlug} workspaceId={workspaceId} collapsed />
      <CollapsedNavItem href={`/app/${workspaceSlug}/library`} label="Library" active={pathname.startsWith(`/app/${workspaceSlug}/library`)}>
       <BookOpen size={18} />
      </CollapsedNavItem>
      <CollapsedNavItem href={`/app/${workspaceSlug}/templates`} label="Templates" active={pathname.startsWith(`/app/${workspaceSlug}/templates`)}>
       <LayoutGrid size={18} />
      </CollapsedNavItem>
      <div className="my-1 w-8 border-t border-sidebar-border/70" />
      <div className="group relative w-full">
       <NewPageButton
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        className="flex h-9 w-full items-center justify-center rounded-[var(--radius-sm)] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground disabled:opacity-60"
       >
        <Plus size={18} />
       </NewPageButton>
       <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-popover px-2.5 py-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <p className="text-xs font-semibold text-popover-foreground">New Page</p>
       </div>
      </div>
     </nav>
     <div className="flex-1" />
     <nav className="flex w-full flex-col items-center gap-1 border-t border-sidebar-border px-2 py-3">
      <CollapsedNavItem href={`/app/${workspaceSlug}/trash`} label="Trash"><Trash2 size={18} /></CollapsedNavItem>
      {isAdmin && (
       <CollapsedNavItem href="/orbit-admin/orbit" label="Orbit Admin">
        <Shield size={18} />
       </CollapsedNavItem>
      )}
     </nav>
     <div className="flex w-full items-center justify-center border-t border-sidebar-border py-3">
      <div className="group relative">
       <UserAvatar image={userImage} name={displayName} className="size-8 text-sm transition-opacity duration-150 hover:opacity-80" />
       <div className="pointer-events-none absolute bottom-0 left-full z-50 ml-3 min-w-[160px] whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-popover px-3 py-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <p className="text-xs font-semibold text-popover-foreground">{displayName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{userEmail}</p>
       </div>
      </div>
     </div>
    </>
   )}

   {/* ── Expanded body: full scrollable tree ── */}
   {!collapsed && <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
    {/* Quick nav */}
    <nav className="px-2 py-1.5">
     <NavButton
      href={`/app/${workspaceSlug}`}
      icon={<Home size={15} />}
      label="Home"
      active={pathname === `/app/${workspaceSlug}` && !searchOpen}
     />
     <span data-tour="search"><SearchNavButton icon={<Search size={15} />} /></span>
     <span data-tour="notifications">
      <NotificationBell workspaceSlug={workspaceSlug} workspaceId={workspaceId} />
     </span>
     <NavButton
      href={`/app/${workspaceSlug}/library`}
      icon={<BookOpen size={15} />}
      label="Library"
      active={pathname.startsWith(`/app/${workspaceSlug}/library`)}
     />
     <NavButton
      href={`/app/${workspaceSlug}/templates`}
      icon={<LayoutGrid size={15} />}
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

    {/* Private */}
    <PrivateSection
     pages={pages}
     workspaceId={workspaceId}
     workspaceSlug={workspaceSlug}
     favoritePageIds={favoritePageIds}
     onToggleFavorite={handleToggleFavorite}
     onPagesChange={setPages}
    />

    <div className="mx-2 border-t border-sidebar-border" />

    {/* Page tree with filter */}
    <div className="flex flex-1 flex-col px-2 py-2">
     <SectionLabel
      label="Pages"
      expanded={pagesExpanded}
      onToggle={() => setPagesExpanded(v => !v)}
      workspaceId={workspaceId}
      workspaceSlug={workspaceSlug}
      onBeforeAdd={() => setPagesExpanded(true)}
     />
     {/* Grid-rows trick animates height without measuring it in JS — see
         favorites-section.tsx for the full rationale. */}
     <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${pagesExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
      <div className="overflow-hidden">
       <PageTree
        favoritePageIds={favoritePageIds}
        filter={filter}
        loading={pagesLoading}
        onPagesChange={setPages}
        onToggleFavorite={handleToggleFavorite}
        pages={pages}
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
       />
      </div>
     </div>
    </div>

    <div className="mx-2 border-t border-sidebar-border" />

    {/* Trash */}
    <div className="px-2 py-1.5">
     <NavButton
      href={`/app/${workspaceSlug}/trash`}
      icon={<Trash2 size={15} />}
      label="Trash"
      active={pathname.startsWith(`/app/${workspaceSlug}/trash`)}
     />
    </div>
   </div>}

   {/* ── Expanded: admin nav + user footer ── */}
   {!collapsed && isAdmin && (
    <div className="shrink-0 border-t border-sidebar-border px-2 py-1.5">
     <NavButton
      href="/orbit-admin/orbit"
      icon={<Shield size={15} />}
      label="Orbit Admin"
      active={pathname.startsWith("/orbit-admin")}
     />
    </div>
   )}

   {!collapsed && (
    <div className="relative shrink-0 border-t border-sidebar-border px-2 py-2" ref={userMenuRef}>
     {/* Stays mounted and animates via opacity/transform (instead of
         conditional mount + animate-in-only) so closing eases out the same
         way opening eases in — matching the Pages/Favorites/Recently
         Visited sections' grid-rows collapse, which animates both
         directions because their content never unmounts either. */}
     <div
      aria-hidden={!userMenu}
      className={`absolute bottom-[calc(100%+8px)] left-2 right-2 z-50 origin-bottom overflow-hidden rounded-[var(--radius-xl)] border border-border/70 bg-popover transition-all duration-150 ease-out ${
       userMenu ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
      }`}
     >
      <div className="px-3.5 pb-3 pt-3.5">
       <div className="flex items-center gap-3">
        <div className="relative shrink-0">
         <UserAvatar image={userImage} name={displayName} className="size-10 text-sm" />
         <span className="absolute bottom-0 right-0 size-2.5 translate-x-1/3 translate-y-1/3 rounded-full border-2 border-popover bg-success" />
        </div>
        <div className="min-w-0 flex-1">
         <p className="truncate text-sm font-semibold leading-tight text-foreground">
          {displayName}
         </p>
         <p className="mt-0.5 truncate text-xs leading-tight text-muted-foreground">{userEmail}</p>
        </div>
       </div>
      </div>
      <div className="mx-3 h-px bg-border/50" />
      <div className="p-1.5">
       <Link
        href={`/app/${workspaceSlug}/settings`}
        onClick={() => setUserMenu(false)}
        className="group flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 transition-colors duration-150 hover:bg-accent"
       >
        <span className="flex size-[26px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-muted text-muted-foreground transition-colors duration-150 group-hover:bg-primary/10 group-hover:text-primary">
         <Settings size={13} />
        </span>
        <span className="text-sm font-medium text-foreground">Settings</span>
       </Link>
      </div>
      <div className="mx-3 h-px bg-border/50" />
      <div className="p-1.5">
       <SignOutButton className="group flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 transition-colors duration-150 hover:bg-destructive/10">
        <span className="flex size-[26px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-destructive/10 text-destructive">
         <LogOut size={13} />
        </span>
        <span className="text-sm font-medium text-destructive">Sign out</span>
       </SignOutButton>
      </div>
     </div>
     <button
      type="button"
      onClick={() => setUserMenu((v) => !v)}
      className={`flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-2 transition-colors duration-150 ${userMenu ? "bg-primary/10" : "hover:bg-primary/10"}`}
     >
      <UserAvatar image={userImage} name={displayName} className="size-8 text-sm" />
      <div className="min-w-0 flex-1 text-left">
       <p className="truncate text-sm font-semibold text-sidebar-foreground">
        {displayName}
       </p>
       <p className="truncate text-xs text-sidebar-foreground/70">{userEmail}</p>
      </div>
      <ChevronDown
       size={13}
       className={`shrink-0 text-sidebar-foreground/60 transition-transform duration-200 ${userMenu ? "rotate-180" : ""}`}
      />
     </button>
    </div>
   )}

   {/* Resize handle — expanded only */}
   {!collapsed && (
    <button
     aria-label="Resize sidebar"
     className="absolute right-0 top-0 h-full w-1 cursor-col-resize border-0 bg-transparent p-0 transition-colors duration-150 hover:bg-sidebar-accent"
     onMouseDown={handleResizeStart}
     tabIndex={-1}
     type="button"
    />
   )}
   {tooltip && typeof document !== "undefined" && createPortal(
    <IconTooltip rect={tooltip.rect} label={tooltip.label} />,
    document.body,
   )}
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
   className={`group flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm font-medium transition-colors duration-150 ${
    active
     ? "bg-primary/[0.2] text-primary"
     : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
   }`}
   href={href}
  >
   <span className={`shrink-0 transition-colors duration-150 ${active ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground"}`}>{icon}</span>
   <span className={`flex-1 ${active ? "font-semibold" : ""}`}>{label}</span>
   {shortcut && (
    <kbd className="shrink-0 rounded bg-muted px-1 py-0.5 text-xs font-medium text-muted-foreground">
     {shortcut}
    </kbd>
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
    className={`flex h-9 w-full items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-150 ${
     active
      ? "bg-primary/[0.2] text-primary"
      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    }`}
   >
    {children}
   </Link>
   <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-popover px-2.5 py-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
    <p className="text-xs font-semibold text-popover-foreground">{label}</p>
   </div>
  </div>
 );
}

function CollapsedSearchItem({ children }: { children: React.ReactNode }) {
 return (
  <div className="group relative w-full">
   <button
    type="button"
    onClick={() => document.dispatchEvent(new CustomEvent("workflik:open-search"))}
    className="flex h-9 w-full items-center justify-center rounded-[var(--radius-sm)] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
   >
    {children}
   </button>
   <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-popover px-2.5 py-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
    <p className="text-xs font-semibold text-popover-foreground">Search</p>
   </div>
  </div>
 );
}

function SearchNavButton({ icon }: { icon: React.ReactNode }) {
 const [searchOpen, setSearchOpen] = useState(false);

 useEffect(() => {
  function onOpen() { setSearchOpen(true); }
  function onClose() { setSearchOpen(false); }
  document.addEventListener("workflik:open-search", onOpen);
  document.addEventListener("workflik:search-closed", onClose);
  return () => {
   document.removeEventListener("workflik:open-search", onOpen);
   document.removeEventListener("workflik:search-closed", onClose);
  };
 }, []);

 return (
  <button
   type="button"
   onClick={() => document.dispatchEvent(new CustomEvent("workflik:open-search"))}
   className={`group flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm font-medium transition-colors duration-150 ${
    searchOpen
     ? "bg-primary/[0.2] text-primary font-semibold"
     : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
   }`}
  >
   <span className={`shrink-0 transition-colors duration-150 ${searchOpen ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground"}`}>{icon}</span>
   <span className="flex-1 text-left">Search</span>
   <kbd className="shrink-0 rounded-[var(--radius-xs)] bg-sidebar-accent px-1 py-0.5 text-xs font-medium text-sidebar-foreground/70">Ctrl+K</kbd>
  </button>
 );
}

function formatEmailAsName(email: string): string {
 return email.split("@")[0].split(".").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function initialsFromName(name: string): string {
 const words = name.trim().split(/\s+/).filter(Boolean);
 if (words.length === 0) return "";
 return words.length === 1 ? words[0][0].toUpperCase() : (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function UserAvatar({
 image,
 name,
 className,
}: {
 image: string | null;
 name: string;
 className?: string;
}) {
 const [failed, setFailed] = useState(false);
 useEffect(() => { setFailed(false); }, [image]);
 const showImage = Boolean(image) && !failed;
 return (
  <div
   className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold uppercase ${showImage ? "bg-transparent" : "bg-primary text-primary-foreground"} ${className ?? ""}`}
  >
   {showImage ? (
    <img
     src={image!}
     alt=""
     className="size-full object-cover"
     onError={() => setFailed(true)}
    />
   ) : (
    initialsFromName(name)
   )}
  </div>
 );
}

function SectionLabel({
 label, expanded, onToggle, workspaceId, workspaceSlug, onBeforeAdd,
}: {
 label: string;
 expanded?: boolean;
 onToggle?: () => void;
 workspaceId?: string;
 workspaceSlug?: string;
 onBeforeAdd?: () => void;
}) {
 return (
  <div className="group mb-0.5 flex w-full items-center justify-between rounded-[var(--radius-md)] pr-1 transition-colors duration-150 hover:bg-sidebar-accent">
   <button
    type="button"
    onClick={onToggle}
    className="flex min-w-0 cursor-pointer items-center gap-1 rounded-[var(--radius-md)] px-2.5 py-2 text-sm font-medium text-sidebar-foreground/60 transition-colors duration-150 group-hover:text-sidebar-accent-foreground"
   >
    <span className="truncate">{label}</span>
    <ChevronDown
     size={14}
     className={`shrink-0 text-sidebar-foreground/60 transition-transform duration-150 group-hover:text-sidebar-accent-foreground ${expanded ? "" : "-rotate-90"}`}
    />
   </button>
   {workspaceId && workspaceSlug && (
    <NewPageButton
     workspaceId={workspaceId}
     workspaceSlug={workspaceSlug}
     title="Add a page"
     onBeforeCreate={onBeforeAdd}
     className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-sidebar-foreground/60 transition-colors duration-150 hover:bg-primary/10 hover:text-sidebar-accent-foreground disabled:opacity-60"
    >
     <Plus size={14} />
    </NewPageButton>
   )}
  </div>
 );
}

function NewDatabaseButton({
 workspaceId,
 workspaceSlug,
 onBeforeCreate,
}: {
 workspaceId: string;
 workspaceSlug: string;
 onBeforeCreate?: () => void;
}) {
 const router = useRouter();
 const [loading, setLoading] = useState(false);

 async function handleClick() {
  if (loading) return;
  onBeforeCreate?.();
  setLoading(true);
  try {
   const res = await fetch(`/api/workspaces/${workspaceId}/databases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Untitled Database" }),
   });
   if (res.ok) {
    const db = await res.json();
    window.dispatchEvent(new CustomEvent("pages:refresh"));
    router.push(`/app/${workspaceSlug}/${db.shortId}`);
   }
  } catch {
   // no-op
  } finally {
   setLoading(false);
  }
 }

 return (
  <button
   type="button"
   onClick={handleClick}
   disabled={loading}
   className="group flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-2 text-left transition-colors duration-150 hover:bg-accent disabled:opacity-60"
  >
   <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-success/10 text-success">
    <Database size={14} />
   </span>
   <span>
    <span className="block text-sm font-medium text-foreground">New Database</span>
    <span className="block text-xs text-muted-foreground">Tables, boards, calendars</span>
   </span>
  </button>
 );
}
