"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";

const NAV = [
  {
    href: "/orbit-admin/orbit", label: "Overview", exact: true,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.75">
        <rect x="1" y="1" width="5" height="5" rx="1"/><rect x="8" y="1" width="5" height="5" rx="1"/>
        <rect x="1" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/orbit-admin/orbit/analytics", label: "Analytics", exact: false,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.75">
        <path d="M1 11l3.5-3.5 2.5 2.5 4.5-5.5"/>
      </svg>
    ),
  },
  {
    href: "/orbit-admin/orbit/users", label: "Users", exact: false,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.75">
        <circle cx="5" cy="4.5" r="2.5"/><path d="M1 12c0-2.2 1.8-4 4-4s4 1.8 4 4"/>
        <path d="M10 2a2.5 2.5 0 010 5M12.5 9.5c1.2.4 2 1.5 2 2.5"/>
      </svg>
    ),
  },
  {
    href: "/orbit-admin/orbit/workspaces", label: "Workspaces", exact: false,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.75">
        <path d="M2 5h10M2 9h10M5 1v12M9 1v12"/><rect x="1" y="1" width="12" height="12" rx="2"/>
      </svg>
    ),
  },
  {
    href: "/orbit-admin/orbit/templates", label: "Templates", exact: false,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.75">
        <rect x="1" y="1" width="12" height="12" rx="2"/><path d="M1 5h12M5 5v8"/>
      </svg>
    ),
  },
  {
    href: "/orbit-admin/orbit/templates/categories", label: "Categories", exact: true,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.75">
        <path d="M1.5 3h4l1.5 2h5.5v6a1 1 0 01-1 1h-9a1 1 0 01-1-1v-7a1 1 0 011-1z"/>
      </svg>
    ),
  },
  {
    href: "/orbit-admin/orbit/audit", label: "Audit Trail", exact: false,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.75">
        <path d="M3.5 3.5h7M3.5 7h7M3.5 10.5h4"/><rect x="1" y="1" width="12" height="12" rx="2"/>
      </svg>
    ),
  },
];

// Some hrefs are prefixes of others (Templates vs. Templates/Categories) — a
// plain `pathname.startsWith(href)` check would light up both at once when
// on the more specific page. Pick the single longest matching href across
// both nav groups so only the most specific item wins.
function isHrefMatch(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function computeActiveHref(pathname: string) {
  let best: string | null = null;
  for (const item of [...NAV, ...SECONDARY]) {
    const exact = (item as { exact?: boolean }).exact;
    if (isHrefMatch(pathname, item.href, exact) && (!best || item.href.length > best.length)) {
      best = item.href;
    }
  }
  return best;
}

const SECONDARY = [
  {
    href: "/orbit-admin/orbit/email", label: "Email",
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.75">
        <rect x="1" y="3" width="12" height="8" rx="1.5"/>
        <path d="M1 4.5l6 4.5 6-4.5"/>
      </svg>
    ),
  },
  {
    href: "/orbit-admin/orbit/settings", label: "Settings",
    icon: <Settings className="size-3.75" strokeWidth={1.5} />,
  },
];

function UserAvatar({ image, email, className }: { image: string | null; email: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [image]);
  const showImage = Boolean(image) && !failed;
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden font-bold uppercase ${showImage ? "rounded-full bg-transparent" : "rounded-sm bg-primary text-primary-foreground"} ${className ?? ""}`}>
      {showImage ? (
        <img src={image!} alt="" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        email[0].toUpperCase()
      )}
    </div>
  );
}

export function AdminSidebar({
  email,
  image,
  version,
}: {
  email: string;
  image: string | null;
  version?: string;
}) {
  const pathname      = usePathname();
  const activeHref    = computeActiveHref(pathname);
  const displayName   = email.split("@")[0].split(".").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  return (
    <aside className="flex h-dvh w-70 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">

      {/* Brand header */}
      <div className="flex h-11 shrink-0 items-center border-b border-sidebar-border px-3">
        <Link
          href="/platform/post-auth"
          className="flex items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors duration-150 hover:bg-primary/10"
        >
          <Image src="/icon-32.png" unoptimized alt="Workflik" width={28} height={28} className="size-7 shrink-0 rounded-sm" />
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight tracking-tight text-sidebar-foreground">Workflik</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/60">Orbit Admin</p>
          </div>
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <p className="mb-1 px-2.5 text-xs font-semibold uppercase tracking-wide text-primary/60">Main</p>
        <div className="space-y-0.5">
          {NAV.map(({ href, label, icon }) => {
            const active = href === activeHref;
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-150 ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground/70 hover:bg-primary/10 hover:text-primary"
                }`}
              >
                <span className={`shrink-0 transition-colors duration-150 ${active ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-primary"}`}>
                  {icon}
                </span>
                <span className={`flex-1 ${active ? "font-semibold" : ""}`}>{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mx-2 my-3 h-px bg-sidebar-border" />

        <p className="mb-1 px-2.5 text-xs font-semibold uppercase tracking-wide text-primary/60">System</p>
        <div className="space-y-0.5">
          {SECONDARY.map(({ href, label, icon }) => {
            const active = href === activeHref;
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-150 ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground/70 hover:bg-primary/10 hover:text-primary"
                }`}
              >
                <span className={`shrink-0 transition-colors duration-150 ${active ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-primary"}`}>
                  {icon}
                </span>
                <span className={`flex-1 ${active ? "font-semibold" : ""}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Back to workspace */}
      <div className="shrink-0 border-t border-sidebar-border px-2 py-1.5">
        <Link
          href="/platform/post-auth"
          className="group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors duration-150 hover:bg-primary/10 hover:text-primary"
        >
          <span className="shrink-0 text-sidebar-foreground/60 transition-colors duration-150 group-hover:text-primary">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.75">
              <path d="M9 7H3M5 4L2 7l3 3"/><path d="M6 2h5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5H6"/>
            </svg>
          </span>
          Back to workspace
        </Link>
        {version && (
          <p className="px-2.5 pt-1 text-xs text-sidebar-foreground/40">v{version}</p>
        )}
      </div>

      {/* User footer — same popup pattern as workspace sidebar */}
      <div className="relative shrink-0 border-t border-sidebar-border px-2 py-2">
        {/* MenuItems is deliberately un-anchored (no `anchor` prop) — see the
            matching comment in components/sidebar/sidebar.tsx's user menu. */}
        <Menu>
          <MenuItems
            transition
            className="absolute bottom-[calc(100%+8px)] left-2 right-2 z-50 origin-bottom overflow-hidden rounded-xl border border-border bg-popover transition-all duration-150 ease-out data-leave:scale-95 data-leave:opacity-0"
          >
            {/* User info */}
            <div className="px-3.5 pb-3 pt-3.5">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <UserAvatar image={image} email={email} className="size-10 text-sm" />
                  <span className="absolute bottom-0 right-0 z-10 size-2.5 rounded-full bg-success ring-2 ring-popover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight text-foreground">{displayName}</p>
                  <p className="mt-0.5 truncate text-xs leading-tight text-muted-foreground">{email}</p>
                </div>
              </div>
            </div>

            <div className="mx-3 h-px bg-border" />

            {/* Sign out — "Back to workspace" deliberately omitted here: it
                already lives as an always-visible link right below this
                popup, so repeating it here was pure duplication. */}
            <div className="p-1.5">
              <MenuItem as="div" className="rounded-md data-focus:bg-destructive/10">
                <SignOutButton className="group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors duration-150 hover:bg-destructive/10">
                  <span className="flex size-6.5 shrink-0 items-center justify-center rounded-sm bg-destructive/10 text-destructive">
                    <LogOut size={13} />
                  </span>
                  <span className="text-sm font-medium text-destructive">Sign out</span>
                </SignOutButton>
              </MenuItem>
            </div>
          </MenuItems>

          {/* Trigger button */}
          <MenuButton className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 transition-colors duration-150 hover:bg-primary/10 data-open:bg-primary/10">
            <UserAvatar image={image} email={email} className="size-8 text-sm" />
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">{displayName}</p>
              <p className="truncate text-xs text-sidebar-foreground/70">{email}</p>
            </div>
            <ChevronDown size={13} className="shrink-0 text-sidebar-foreground/60 transition-transform duration-200 data-open:rotate-180" />
          </MenuButton>
        </Menu>
      </div>
    </aside>
  );
}
