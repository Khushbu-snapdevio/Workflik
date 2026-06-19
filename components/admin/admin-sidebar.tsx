"use client";

import {
  ArrowLeftIcon,
  ChartBarIcon,
  EnvelopeIcon,
  SignOutIcon,
  SquaresFourIcon,
  StackIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PRODUCT_NAME } from "@/config/platform";

const navItems = [
  { href: "/Orbit-admin/orbit", label: "Overview", icon: ChartBarIcon, exact: true },
  { href: "/Orbit-admin/orbit/users", label: "Users", icon: UsersIcon, exact: false },
  { href: "/Orbit-admin/orbit/templates", label: "Templates", icon: SquaresFourIcon, exact: false },
  { href: "/Orbit-admin/orbit/queues", label: "Queues", icon: StackIcon, exact: false },
  { href: "/Orbit-admin/orbit/email", label: "Email", icon: EnvelopeIcon, exact: false },
];

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const avatarLetter = email[0].toUpperCase();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">

      {/* Brand header */}
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-3.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-[10px] font-black text-primary-foreground shadow-sm">
          WF
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black leading-none tracking-tight text-foreground">{PRODUCT_NAME}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-ui text-muted-foreground">
            Admin Panel
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3">
        <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-ui text-sidebar-foreground/40">
          Navigation
        </p>
        <div className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent font-semibold text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <Icon size={15} weight={isActive ? "fill" : "regular"} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-2 py-3 space-y-1">
        <Link
          href="/platform/post-auth"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <ArrowLeftIcon size={14} />
          Back to workspace
        </Link>

        <div className="mx-0.5 border-t border-sidebar-border my-1" />

        <div className="flex items-center gap-2 px-1 py-1">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold uppercase text-primary">
            {avatarLetter}
          </div>
          <span className="min-w-0 flex-1 truncate text-[11px] text-sidebar-foreground/60">{email}</span>
          <SignOutButton
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            title="Sign out"
          >
            <SignOutIcon size={12} />
          </SignOutButton>
        </div>
      </div>
    </aside>
  );
}
