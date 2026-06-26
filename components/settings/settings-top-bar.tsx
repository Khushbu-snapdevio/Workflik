"use client";

import { Bell, ChevronRight, Home, Menu, Search, Settings, Shield, User, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { useSettingsUser } from "./settings-user-context";

const AVATAR_BG_CLASSES = [
  "bg-primary", "bg-destructive", "bg-success", "bg-warning",
  "bg-muted-foreground", "bg-primary/70", "bg-destructive/70", "bg-success/70",
];
function avatarBgClass(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AVATAR_BG_CLASSES[Math.abs(h) % AVATAR_BG_CLASSES.length]!;
}

interface Props {
  workspaceSlug: string;
  workspaceName: string;
}

function getNavItems(slug: string) {
  const base = `/app/${slug}/settings`;
  return [
    { label: "My profile",          href: `${base}/profile`,       icon: User },
    { label: "Notifications",       href: `${base}/notifications`, icon: Bell },
    { label: "Security & sessions", href: `${base}/sessions`,      icon: Shield },
    { label: "General",             href: `${base}/general`,       icon: Settings },
    { label: "Members",             href: `${base}/members`,       icon: Users },
  ];
}

export function SettingsTopBar({ workspaceSlug, workspaceName }: Props) {
  const { user }       = useSettingsUser();
  const pathname       = usePathname();
  const [search, setSearch]       = useState("");
  const [open, setOpen]           = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = user.name?.trim() || user.email;
  const initials    = displayName.slice(0, 2).toUpperCase();
  const bg          = avatarBgClass(displayName);
  const profileHref = `/app/${workspaceSlug}/settings/profile`;

  const navItems = getNavItems(workspaceSlug);
  const results  = search.trim()
    ? navItems.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <>
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 bg-card px-3">
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileNav((v) => !v)}
          className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-foreground/60 transition-colors hover:bg-accent hover:text-foreground md:hidden"
          aria-label="Toggle navigation"
        >
          {mobileNav ? <X size={16} /> : <Menu size={16} />}
        </button>

        {/* Breadcrumb — matches library/templates topbar style */}
        <nav className="hidden min-w-0 items-center gap-0.5 text-xs md:flex">
          <Link
            href={`/app/${workspaceSlug}`}
            className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-foreground transition-colors hover:bg-accent"
          >
            <Home size={13} className="shrink-0 text-foreground" />
            <span className="font-medium">{workspaceName}</span>
          </Link>
          <ChevronRight size={12} className="shrink-0 text-foreground/40" />
          <span className="px-2 py-1 font-semibold text-foreground/80">Settings</span>
        </nav>

        {/* Right — search + avatar */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="Search settings…"
              className="h-7 w-[160px] rounded-[var(--radius-md)] border border-input bg-muted/40 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary/20 md:w-[200px]"
            />
            {open && results.length > 0 && (
              <div
                onMouseDown={(e) => e.preventDefault()}
                className="absolute right-0 top-full z-[200] mt-1 w-[220px] overflow-hidden rounded-[var(--radius-md)] border border-border bg-popover p-1 "
              >
                {results.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => { setSearch(""); setOpen(false); }}
                      className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Icon size={14} className="shrink-0 text-muted-foreground" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
            {open && search.trim() && results.length === 0 && (
              <div
                onMouseDown={(e) => e.preventDefault()}
                className="absolute right-0 top-full z-[200] mt-1 w-[220px] rounded-[var(--radius-md)] border border-border bg-popover p-3 text-center text-xs text-muted-foreground "
              >
                No results for &ldquo;{search}&rdquo;
              </div>
            )}
          </div>

          {/* Avatar */}
          <Link
            href={profileHref}
            title="Go to profile settings"
            className="group flex items-center rounded-full transition-opacity hover:opacity-80"
          >
            {user.image ? (
              <img
                src={user.image}
                alt={displayName}
                className="size-7 rounded-full object-cover ring-1 ring-border transition-all group-hover:ring-primary/40"
              />
            ) : (
              <div className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${bg}`}>
                {initials}
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile nav drawer (below the top bar, above content) */}
      {mobileNav && (
        <div className="shrink-0 border-b border-border/60 bg-sidebar px-2 py-2 md:hidden">
          {navItems.map((item) => {
            const Icon  = item.icon;
            const isActive = item.href.includes("profile")
              ? pathname === item.href.replace("/profile", "") || pathname.startsWith(item.href)
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNav(false)}
                className={`flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground/70 hover:bg-primary/10 hover:text-primary"
                }`}
              >
                <Icon size={14} className={isActive ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-primary"} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
