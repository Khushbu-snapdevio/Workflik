"use client";

import {
 BookOpen,
 ChevronsRight,
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
import { SignOutButton } from "@/components/auth/sign-out-button";
import { FavoritesSection } from "@/components/sidebar/favorites-section";
import { PageTree } from "@/components/sidebar/page-tree";
import { RecentlyVisitedSection } from "@/components/sidebar/recently-visited-section";
import { WorkspaceSwitcher } from "@/components/sidebar/workspace-switcher";
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
 const [width, setWidth] = useState(initialSidebarWidth);
 const [collapsed, setCollapsed] = useState(initialSidebarCollapsed);
 const [filter] = useState("");
 const [pages, setPages] = useState<PageItem[]>(initialPages);
 const [pagesLoading, setPagesLoading] = useState(false);
 const [favorites, setFavorites] = useState<FavoriteItem[]>(initialFavorites);
 const [recentlyVisited, setRecentlyVisited] = useState<{ id: string; pageId: string; visitedAt: string }[]>(initialRecentlyVisited);
 const [newMenu, setNewMenu] = useState(false);
 const [userMenu, setUserMenu] = useState(false);
 const [pagesExpanded, setPagesExpanded] = useState(true);
 const newMenuRef = useRef<HTMLDivElement>(null);
 const userMenuRef = useRef<HTMLDivElement>(null);

 const favoritePageIds = new Set(favorites.map((f) => f.pageId));

 const resizingRef = useRef(false);
 const startXRef = useRef(0);
 const startWidthRef = useRef(0);
 const currentWidthRef = useRef(initialSidebarWidth);

 // Re-fetch page tree only when a mutation explicitly fires the refresh event
 const fetchPages = useCallback(() => {
  setPagesLoading(true);
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

 const fetchFavorites = useCallback(() => {
  fetch(`/api/user/favorites?workspaceId=${workspaceId}`)
   .then((r) => r.json())
   .then((d) => setFavorites(Array.isArray(d) ? d : []))
   .catch(() => {});
 }, [workspaceId]);

 useEffect(() => {
  window.addEventListener("workflik:favorites-changed", fetchFavorites);
  return () => window.removeEventListener("workflik:favorites-changed", fetchFavorites);
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
   <aside className="flex h-screen w-[64px] shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar text-sidebar-foreground">

    {/* Expand button */}
    <div className="flex w-full items-center justify-center border-b border-sidebar-border py-3">
     <button
      onClick={toggleCollapse}
      title="Expand sidebar"
      type="button"
      className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-sidebar-foreground/50 outline-none transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
     >
      <ChevronsRight size={16} />
     </button>
    </div>

    {/* Primary nav */}
    <nav className="flex w-full flex-col items-center gap-1 px-2 py-3">
     <CollapsedNavItem href={`/app/${workspaceSlug}`} label="Home" active={pathname === `/app/${workspaceSlug}`}>
      <Home size={18} />
     </CollapsedNavItem>
     <CollapsedSearchItem label="Search"><Search size={18} /></CollapsedSearchItem>
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
       className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-sidebar-foreground/50 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground disabled:opacity-60"
      >
       <Plus size={18} />
      </NewPageButton>
      <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-popover px-2.5 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
       <p className="text-xs font-semibold text-popover-foreground">New Page</p>
      </div>
     </div>
    </nav>

    <div className="flex-1" />

    {/* Footer nav */}
    <nav className="flex w-full flex-col items-center gap-1 border-t border-sidebar-border px-2 py-3">
     <CollapsedNavItem href={`/app/${workspaceSlug}/trash`} label="Trash"><Trash2 size={18} /></CollapsedNavItem>
     <CollapsedNavItem href={`/app/${workspaceSlug}/settings`} label="Settings"><Settings size={18} /></CollapsedNavItem>
     {isAdmin && (
      <CollapsedNavItem href="/Orbit-admin/orbit" label="Admin Panel">
       <Shield size={18} />
      </CollapsedNavItem>
     )}
    </nav>

    {/* User avatar */}
    <div className="flex w-full items-center justify-center border-t border-sidebar-border py-3">
     <div className="group relative">
      <UserAvatar image={userImage} email={userEmail} className="size-8 text-[13px] transition-opacity duration-150 hover:opacity-80" />
      <div className="pointer-events-none absolute bottom-0 left-full z-50 ml-3 min-w-[160px] whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-popover px-3 py-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
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
   className="relative flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
   style={{ width }}
  >
   {/* Workspace header */}
   <div className="flex h-11 shrink-0 items-center gap-1 border-b border-sidebar-border px-2">
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
      className={`flex size-7 items-center justify-center rounded-[var(--radius-sm)] outline-none transition-colors duration-150 ${
       newMenu
        ? "bg-primary text-primary-foreground"
        : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      }`}
     >
      <Plus size={14} />
     </button>

     {newMenu && (
      <div className="absolute right-0 top-full z-50 mt-1.5 w-60 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-popover shadow-lg">
       {/* Section: Create */}
       <div className="px-3 pb-1 pt-2.5">
        <p className="mb-1 text-[10px] font-medium tracking-[0.125px] text-muted-foreground/50">Create</p>
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
          <span className="block text-[13px] font-medium text-foreground">New Page</span>
          <span className="block text-xs text-muted-foreground">Docs, notes, wikis</span>
         </span>
        </NewPageButton>
       </div>

       <div className="mx-3 my-1 h-px bg-border/60" />

       {/* Section: More */}
       <div className="px-3 pb-2.5 pt-1">
        <p className="mb-1 text-[10px] font-medium tracking-[0.125px] text-muted-foreground/50">More</p>
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
          <span className="block text-[13px] font-medium text-foreground">From Template</span>
          <span className="block text-xs text-muted-foreground">Start from a template</span>
         </span>
        </Link>
       </div>
      </div>
     )}

    </div>

    <button
     className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-sidebar-foreground/50 outline-none transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
     onClick={toggleCollapse}
     title="Collapse sidebar"
     type="button"
    >
     <ChevronsRight className="rotate-180" size={16} />
    </button>
   </div>

   {/* Scrollable body */}
   <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
    {/* Quick nav */}
    <nav className="px-2 py-1.5">
     <NavButton
      href={`/app/${workspaceSlug}`}
      icon={<Home size={15} />}
      label="Home"
      active={pathname === `/app/${workspaceSlug}`}
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
      icon={<Trash2 size={15} />}
      label="Trash"
      active={pathname.startsWith(`/app/${workspaceSlug}/trash`)}
     />
    </div>
   </div>

   {/* Bottom nav — Settings + Admin */}
   <div className="shrink-0 border-t border-sidebar-border px-2 py-1.5">
    <NavButton
     href={`/app/${workspaceSlug}/settings`}
     icon={<Settings size={15} />}
     label="Settings"
     active={pathname.startsWith(`/app/${workspaceSlug}/settings`)}
    />
    {isAdmin && (
     <NavButton
      href="/Orbit-admin/orbit"
      icon={<Shield size={15} />}
      label="Orbit Admin"
      active={pathname.startsWith("/Orbit-admin")}
     />
    )}
   </div>

   {/* User footer */}
   <div className="relative shrink-0 border-t border-sidebar-border px-2 py-2" ref={userMenuRef}>

    {/* User menu dropdown — appears above */}
    {userMenu && (
     <div className="absolute bottom-[calc(100%+8px)] left-2 right-2 z-50 overflow-hidden rounded-[var(--radius-xl)] border border-border/70 bg-popover shadow-[0_8px_32px_-6px_rgba(0,0,0,0.18),0_2px_10px_-2px_rgba(0,0,0,0.08)]">

      {/* User info */}
      <div className="px-3.5 pb-3 pt-3.5">
       <div className="flex items-center gap-3">
        <div className="relative shrink-0">
         <UserAvatar image={userImage} email={userEmail} className="size-10 text-[15px]" />
         <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-popover bg-success" />
        </div>
        <div className="min-w-0 flex-1">
         <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
          {userEmail.split("@")[0].split(".").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
         </p>
         <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">{userEmail}</p>
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
        <span className="text-[13px] font-medium text-foreground">Settings</span>
       </Link>
      </div>

      <div className="mx-3 h-px bg-border/50" />

      <div className="p-1.5">
       <SignOutButton className="group flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 transition-colors duration-150 hover:bg-destructive/[0.07]">
        <span className="flex size-[26px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-destructive/10 text-destructive">
         <LogOut size={13} />
        </span>
        <span className="text-[13px] font-medium text-destructive">Sign out</span>
       </SignOutButton>
      </div>
     </div>
    )}

    {/* Trigger row */}
    <button
     type="button"
     onClick={() => setUserMenu((v) => !v)}
     className={`flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-2 transition-colors duration-150 ${userMenu ? "bg-sidebar-accent" : "hover:bg-sidebar-accent"}`}
    >
     <UserAvatar image={userImage} email={userEmail} className="size-8 text-[13px]" />
     <div className="min-w-0 flex-1 text-left">
      <p className="truncate text-[13px] font-semibold text-sidebar-foreground">
       {userEmail.split("@")[0].split(".").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
      </p>
      <p className="truncate text-[11px] text-sidebar-foreground/50">
       {userEmail}
      </p>
     </div>
     <ChevronDown
      size={13}
      className={`shrink-0 text-sidebar-foreground/40 transition-transform duration-200 ${userMenu ? "rotate-180" : ""}`}
     />
    </button>
   </div>

   {/* Resize handle */}
   <button
    aria-label="Resize sidebar"
    className="absolute right-0 top-0 h-full w-1 cursor-col-resize border-0 bg-transparent p-0 transition-colors duration-150 hover:bg-sidebar-accent"
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
   className={`group flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 ${
    active
     ? "bg-sidebar-accent text-sidebar-foreground"
     : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
   }`}
   href={href}
  >
   <span className={`shrink-0 transition-colors duration-150 ${active ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"}`}>{icon}</span>
   <span className={`flex-1 ${active ? "font-semibold" : ""}`}>{label}</span>
   {shortcut && (
    <kbd className="shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
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
    className={`flex size-9 items-center justify-center rounded-[var(--radius-md)] transition-colors duration-150 ${
     active
      ? "bg-sidebar-accent text-primary"
      : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
    }`}
   >
    {children}
   </Link>
   {/* Tooltip — appears to the right on hover */}
   <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-popover px-2.5 py-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
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
    className="flex size-9 items-center justify-center rounded-[var(--radius-md)] text-sidebar-foreground/50 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
   >
    {children}
   </button>
   <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-popover px-2.5 py-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
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
   className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-[13px] font-medium text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
  >
   <span className="shrink-0 text-sidebar-foreground/40">{icon}</span>
   <span className="flex-1 text-left">Search</span>
   <kbd className="shrink-0 rounded-[var(--radius-xs)] bg-sidebar-accent px-1 py-0.5 text-[10px] font-medium text-sidebar-foreground/50">Ctrl+K</kbd>
  </button>
 );
}

function UserAvatar({
 image,
 email,
 className,
}: {
 image: string | null;
 email: string;
 className?: string;
}) {
 const [failed, setFailed] = useState(false);
 useEffect(() => { setFailed(false); }, [image]);
 const showImage = Boolean(image) && !failed;
 return (
  <div
   className={`flex shrink-0 items-center justify-center overflow-hidden font-bold uppercase ${showImage ? "rounded-full bg-transparent" : "rounded-[var(--radius-sm)] bg-primary text-primary-foreground"} ${className ?? ""}`}
  >
   {showImage ? (
    <img
     src={image!}
     alt=""
     className="size-full object-cover"
     onError={() => setFailed(true)}
    />
   ) : (
    email[0].toUpperCase()
   )}
  </div>
 );
}

function SectionLabel({ label, expanded, onToggle }: { label: string; expanded?: boolean; onToggle?: () => void }) {
 return (
  <button
   type="button"
   onClick={onToggle}
   className="group mb-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-[13px] font-medium text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
  >
   <FileText size={15} className="shrink-0 text-sidebar-foreground/40 transition-colors duration-150 group-hover:text-sidebar-foreground/70" />
   <span className="flex-1 text-left">{label}</span>
   <ChevronDown
    size={13}
    className={`shrink-0 text-muted-foreground/40 transition-transform duration-150 group-hover:text-muted-foreground ${expanded ? "" : "-rotate-90"}`}
   />
  </button>
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
    <span className="block text-[13px] font-medium text-foreground">New Database</span>
    <span className="block text-xs text-muted-foreground">Tables, boards, calendars</span>
   </span>
  </button>
 );
}
