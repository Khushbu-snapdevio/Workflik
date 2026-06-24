"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";

const NAV = [
  {
    href: "/Orbit-admin/orbit", label: "Overview", exact: true,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
        <rect x="1" y="1" width="5" height="5" rx="1"/><rect x="8" y="1" width="5" height="5" rx="1"/>
        <rect x="1" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/Orbit-admin/orbit/users", label: "Users", exact: false,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
        <circle cx="5" cy="4.5" r="2.5"/><path d="M1 12c0-2.2 1.8-4 4-4s4 1.8 4 4"/>
        <path d="M10 2a2.5 2.5 0 010 5M12.5 9.5c1.2.4 2 1.5 2 2.5"/>
      </svg>
    ),
  },
  {
    href: "/Orbit-admin/orbit/workspaces", label: "Workspaces", exact: false,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
        <path d="M2 5h10M2 9h10M5 1v12M9 1v12"/><rect x="1" y="1" width="12" height="12" rx="2"/>
      </svg>
    ),
  },
  {
    href: "/Orbit-admin/orbit/templates", label: "Templates", exact: false,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
        <rect x="1" y="1" width="12" height="12" rx="2"/><path d="M1 5h12M5 5v8"/>
      </svg>
    ),
  },
  {
    href: "/Orbit-admin/orbit/analytics", label: "Analytics", exact: false,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
        <path d="M1 11l3.5-3.5 2.5 2.5 4.5-5.5"/>
      </svg>
    ),
  },
  {
    href: "/Orbit-admin/orbit/audit", label: "Audit Trail", exact: false,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
        <path d="M3.5 3.5h7M3.5 7h7M3.5 10.5h4"/><rect x="1" y="1" width="12" height="12" rx="2"/>
      </svg>
    ),
  },
];

const SECONDARY = [
  {
    href: "/Orbit-admin/orbit/queues", label: "Queues",
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
        <rect x="1" y="2" width="12" height="2.5" rx="0.75"/><rect x="1" y="5.75" width="12" height="2.5" rx="0.75"/>
        <rect x="1" y="9.5" width="12" height="2.5" rx="0.75"/>
      </svg>
    ),
  },
  {
    href: "/Orbit-admin/orbit/email", label: "Email",
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
        <rect x="1" y="3" width="12" height="8" rx="1.5"/>
        <path d="M1 4.5l6 4.5 6-4.5"/>
      </svg>
    ),
  },
];

function UserAvatar({ image, email, className }: { image: string | null; email: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [image]);
  const showImage = Boolean(image) && !failed;
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden font-bold uppercase ${showImage ? "rounded-full bg-transparent" : "rounded-[var(--radius-sm)] bg-primary text-primary-foreground"} ${className ?? ""}`}>
      {showImage ? (
        <img src={image!} alt="" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        email[0].toUpperCase()
      )}
    </div>
  );
}

export function AdminSidebar({ email, image }: { email: string; image: string | null }) {
  const pathname      = usePathname();
  const displayName   = email.split("@")[0].split(".").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const [userMenu, setUserMenu] = useState(false);
  const userMenuRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenu(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <aside className="flex h-screen w-[280px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">

      {/* Brand header */}
      <div className="flex h-11 shrink-0 items-center border-b border-sidebar-border px-3">
        <Link
          href="/platform/post-auth"
          className="flex items-center gap-2.5 rounded-[var(--radius-md)] px-1.5 py-1 transition-colors duration-150 hover:bg-sidebar-accent"
        >
          <Image src="/icon-32.png" unoptimized alt="Workflik" width={28} height={28} className="size-7 shrink-0 rounded-[var(--radius-sm)]" />
          <div className="min-w-0">
            <p className="text-[13px] font-bold leading-tight tracking-tight text-sidebar-foreground">Workflik</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/40">Orbit Admin</p>
          </div>
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/40">Main</p>
        <div className="space-y-0.5">
          {NAV.map(({ href, label, icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 ${
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <span className={`shrink-0 transition-colors duration-150 ${active ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"}`}>
                  {icon}
                </span>
                <span className={`flex-1 ${active ? "font-semibold" : ""}`}>{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mx-2 my-3 h-px bg-sidebar-border" />

        <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/40">System</p>
        <div className="space-y-0.5">
          {SECONDARY.map(({ href, label, icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 ${
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <span className={`shrink-0 transition-colors duration-150 ${active ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"}`}>
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
          className="group flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-[13px] font-medium text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <span className="shrink-0 text-sidebar-foreground/40 transition-colors duration-150 group-hover:text-sidebar-foreground/70">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
              <path d="M9 7H3M5 4L2 7l3 3"/><path d="M6 2h5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5H6"/>
            </svg>
          </span>
          Back to workspace
        </Link>
      </div>

      {/* User footer — same popup pattern as workspace sidebar */}
      <div className="relative shrink-0 border-t border-sidebar-border px-2 py-2" ref={userMenuRef}>

        {/* Popup — appears above */}
        {userMenu && (
          <div className="absolute bottom-[calc(100%+8px)] left-2 right-2 z-50 overflow-hidden rounded-[var(--radius-xl)] border border-border/70 bg-popover shadow-[0_8px_32px_-6px_rgba(0,0,0,0.18),0_2px_10px_-2px_rgba(0,0,0,0.08)]">

            {/* User info */}
            <div className="px-3.5 pb-3 pt-3.5">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <UserAvatar image={image} email={email} className="size-10 text-[15px]" />
                  <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-popover bg-success" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold leading-tight text-foreground">{displayName}</p>
                  <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">{email}</p>
                </div>
              </div>
            </div>

            <div className="mx-3 h-px bg-border/50" />

            {/* Back to workspace */}
            <div className="p-1.5">
              <Link
                href="/platform/post-auth"
                onClick={() => setUserMenu(false)}
                className="group flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 transition-colors duration-150 hover:bg-accent"
              >
                <span className="flex size-[26px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-muted text-muted-foreground transition-colors duration-150 group-hover:bg-primary/10 group-hover:text-primary">
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
                    <path d="M9 7H3M5 4L2 7l3 3"/><path d="M6 2h5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5H6"/>
                  </svg>
                </span>
                <span className="text-[13px] font-medium text-foreground">Back to workspace</span>
              </Link>
            </div>

            <div className="mx-3 h-px bg-border/50" />

            {/* Sign out */}
            <div className="p-1.5">
              <SignOutButton className="group flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 transition-colors duration-150 hover:bg-destructive/[0.07]">
                <span className="flex size-[26px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-destructive/10 text-destructive">
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
                    <path d="M5 7h8M9.5 4L12 7l-2.5 3"/><path d="M8 2H3a.5.5 0 00-.5.5v9A.5.5 0 003 12h5"/>
                  </svg>
                </span>
                <span className="text-[13px] font-medium text-destructive">Sign out</span>
              </SignOutButton>
            </div>
          </div>
        )}

        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setUserMenu((v) => !v)}
          className={`flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-2 transition-colors duration-150 ${userMenu ? "bg-sidebar-accent" : "hover:bg-sidebar-accent"}`}
        >
          <UserAvatar image={image} email={email} className="size-8 text-[13px]" />
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[13px] font-semibold text-sidebar-foreground">{displayName}</p>
            <p className="truncate text-[11px] text-sidebar-foreground/50">{email}</p>
          </div>
          <svg
            viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className={`size-[13px] shrink-0 text-sidebar-foreground/40 transition-transform duration-200 ${userMenu ? "rotate-180" : ""}`}
          >
            <path d="M2.5 5l4.5 4.5L11.5 5"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}
