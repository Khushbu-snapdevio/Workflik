"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/platform/dashboard", label: "Dashboard" },
  { href: "/platform/dashboard/profile", label: "Profile" },
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
  return (
    <div className="min-h-screen bg-page text-foreground">
      <header className="border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
          <Link className="flex items-center gap-3" href="/platform/dashboard">
            <Image src="/workflik-logo.png" unoptimized alt="Workflik" width={160} height={40} className="h-8 w-auto" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                className="rounded-[var(--radius-sm)] px-3 py-2 text-xs font-medium tracking-[0.125px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button asChild variant="outline" size="sm">
                <Link href="/Orbit-admin/orbit">Admin Panel</Link>
              </Button>
            )}
            <span className="hidden max-w-56 truncate text-muted-foreground text-sm sm:block">
              {email}
            </span>
            <SignOutButton>
              <Button asChild variant="secondary" size="sm">
                <span>Sign out</span>
              </Button>
            </SignOutButton>
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3 md:hidden">
          {navLinks.map((link) => (
            <Link
              className="rounded-[var(--radius-sm)] px-3 py-2 text-xs font-medium tracking-[0.125px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              className="rounded-[var(--radius-sm)] px-3 py-2 text-xs font-medium tracking-[0.125px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              href="/Orbit-admin/orbit"
            >
              Admin Panel
            </Link>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
