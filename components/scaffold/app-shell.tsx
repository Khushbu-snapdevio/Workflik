"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import { PRODUCT_NAME } from "@/config/platform";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/post-auth", label: "Workspace" },
];

export function AppShell({
  children,
  email,
  isAdmin = false,
}: {
  children: ReactNode;
  email: string;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-page text-foreground">

      {/* ── Top nav ─────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">

          {/* Logo */}
          <Link className="flex items-center gap-3" href="/dashboard">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-[11px] font-black text-primary-foreground shadow-sm">
              WF
            </span>
            <span className="text-sm font-black tracking-tight text-foreground">
              {PRODUCT_NAME}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-ui transition-colors ${
                    active
                      ? "bg-secondary text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/orbit"
                className="rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-ui text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Admin Panel
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <span className="hidden max-w-48 truncate text-xs text-muted-foreground sm:block">
              {email}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-ui text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="mx-auto flex max-w-7xl gap-0.5 overflow-x-auto px-6 pb-3 md:hidden">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-ui transition-colors ${
                  active
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/orbit"
              className="rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-ui text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Admin Panel
            </Link>
          )}
        </nav>
      </header>

      {/* ── Page content ────────────────────────── */}
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
