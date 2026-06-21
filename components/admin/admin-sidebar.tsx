"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PRODUCT_NAME } from "@/config/platform";

const NAV = [
  {
    href: "/Orbit-admin/orbit", label: "Overview", exact: true,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
        <rect x="1" y="1" width="5" height="5" rx="1"/><rect x="8" y="1" width="5" height="5" rx="1"/>
        <rect x="1" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/Orbit-admin/orbit/users", label: "Users", exact: false,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
        <circle cx="5" cy="4.5" r="2.5"/><path d="M1 12c0-2.2 1.8-4 4-4s4 1.8 4 4"/>
        <path d="M10 2a2.5 2.5 0 010 5M12.5 9.5c1.2.4 2 1.5 2 2.5"/>
      </svg>
    ),
  },
  {
    href: "/Orbit-admin/orbit/workspaces", label: "Workspaces", exact: false,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
        <path d="M2 5h10M2 9h10M5 1v12M9 1v12"/><rect x="1" y="1" width="12" height="12" rx="2"/>
      </svg>
    ),
  },
  {
    href: "/Orbit-admin/orbit/templates", label: "Templates", exact: false,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
        <rect x="1" y="1" width="12" height="12" rx="2"/><path d="M1 5h12M5 5v8"/>
      </svg>
    ),
  },
  {
    href: "/Orbit-admin/orbit/analytics", label: "Analytics", exact: false,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
        <path d="M1 11l3.5-3.5 2.5 2.5 4.5-5.5"/>
      </svg>
    ),
  },
  {
    href: "/Orbit-admin/orbit/audit", label: "Audit Trail", exact: false,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
        <path d="M3.5 3.5h7M3.5 7h7M3.5 10.5h4"/><rect x="1" y="1" width="12" height="12" rx="2"/>
      </svg>
    ),
  },
];

const SECONDARY = [
  {
    href: "/Orbit-admin/orbit/queues", label: "Queues",
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
        <rect x="1" y="2" width="12" height="2.5" rx="0.75"/><rect x="1" y="5.75" width="12" height="2.5" rx="0.75"/>
        <rect x="1" y="9.5" width="12" height="2.5" rx="0.75"/>
      </svg>
    ),
  },
  {
    href: "/Orbit-admin/orbit/email", label: "Email",
    icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
        <rect x="1" y="3" width="12" height="8" rx="1.5"/>
        <path d="M1 4.5l6 4.5 6-4.5"/>
      </svg>
    ),
  },
];

export function AdminSidebar({ email }: { email: string }) {
  const pathname     = usePathname();
  const avatarLetter = email[0]?.toUpperCase() ?? "A";

  return (
    <aside className="flex h-screen w-[280px] shrink-0 flex-col border-r border-border/60 bg-sidebar">

      {/* Brand */}
      <div className="px-4 pb-3 pt-4">
        <Link href="/platform/post-auth" className="flex items-center gap-2.5 rounded-[var(--radius-md)] transition hover:opacity-80">
          <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-primary to-sky-400 text-xs font-black text-white shadow-[0_2px_8px_rgba(2,132,199,0.35)]">
            WF
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold leading-none tracking-tight text-foreground">{PRODUCT_NAME}</p>
            <p className="mt-[3px] text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">Orbit Admin</p>
          </div>
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-4 mb-3 h-px bg-border/50" />

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-2">
        <p className="mb-1 px-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40">Main</p>
        <div className="space-y-0.5">
          {NAV.map(({ href, label, icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`group flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-[7px] text-sm font-medium transition-all duration-100 ${
                  active
                    ? "bg-background text-foreground shadow-[var(--shadow-card)]"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}>
                <span className={`shrink-0 transition-colors ${active ? "text-primary" : "text-muted-foreground/50 group-hover:text-muted-foreground"}`}>
                  {icon}
                </span>
                <span className={active ? "font-semibold" : ""}>{label}</span>
                {active && (
                  <span className="ml-auto flex size-1.5 shrink-0 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="mx-2.5 my-3 h-px bg-border/50" />
        <p className="mb-1 px-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40">System</p>
        <div className="space-y-0.5">
          {SECONDARY.map(({ href, label, icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`group flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-[7px] text-sm font-medium transition-all duration-100 ${
                  active
                    ? "bg-background text-foreground shadow-[var(--shadow-card)]"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}>
                <span className={`shrink-0 transition-colors ${active ? "text-primary" : "text-muted-foreground/50 group-hover:text-muted-foreground"}`}>
                  {icon}
                </span>
                <span className={active ? "font-semibold" : ""}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border/60 px-2 py-3">
        <Link href="/platform/post-auth"
          className="flex items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted/50 hover:text-foreground">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 shrink-0">
            <path d="M8 6H2M4 3.5L1.5 6 4 8.5"/><path d="M5 1.5h5a.5.5 0 01.5.5v8a.5.5 0 01-.5.5H5"/>
          </svg>
          Back to workspace
        </Link>

        <div className="mx-2.5 my-2 h-px bg-border/50" />

        <div className="group flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-1.5 transition-all hover:bg-primary/[0.07] hover:ring-1 hover:ring-primary/20">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary text-[10px] font-bold text-white shadow-sm transition-transform group-hover:scale-105">
            {avatarLetter}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground/80 group-hover:text-foreground">
              {email.split("@")[0]}
            </p>
            <p className="truncate text-[10px] text-muted-foreground/60 group-hover:text-muted-foreground">
              {email}
            </p>
          </div>
          <SignOutButton
            className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground/30 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
            title="Sign out">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
              <path d="M4 6h7M8.5 3.5L11 6l-2.5 2.5"/><path d="M7 1.5H2a.5.5 0 00-.5.5v8a.5.5 0 00.5.5h5"/>
            </svg>
          </SignOutButton>
        </div>
      </div>
    </aside>
  );
}
