import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminShell } from "@/components/layout/admin-shell";
import { requireAdmin } from "@/lib/authz";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <AdminShell
      sidebar={
        <AdminSidebar
          email={session.user.email}
          image={(session.user as { image?: string | null }).image ?? null}
        />
      }
    >
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar — visible on desktop; mobile uses AdminShell's header */}
        <div className="hidden h-11 shrink-0 items-center border-b border-border/60 bg-card px-4 md:flex md:px-8">
          <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3 text-primary">
                <path d="M6 1L2 2.5v3.5C2 8.8 3.8 11 6 12c2.2-1 4-3.2 4-6V2.5L6 1z"/>
              </svg>
              <span className="font-semibold text-foreground">Orbit Admin</span>
            </div>
            <span className="rounded-[var(--radius-xs)] bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">Live</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </AdminShell>
  );
}
