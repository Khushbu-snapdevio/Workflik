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
        <div className="hidden shrink-0 border-b border-border bg-card/95 md:block">
          <div className="mx-auto flex w-full max-w-[1100px] items-center justify-end px-4 py-2.5 md:px-8">
            <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary/10 px-2.5 py-1">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3 text-primary">
                <path d="M6 1L2 2.5v3.5C2 8.8 3.8 11 6 12c2.2-1 4-3.2 4-6V2.5L6 1z"/>
              </svg>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Orbit Admin</span>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </AdminShell>
  );
}
