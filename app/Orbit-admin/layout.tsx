import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/authz";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <AdminSidebar email={session.user.email} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar — branding only; "Back to workspace" is in the sidebar footer */}
        <div className="shrink-0 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-[1100px] items-center justify-end px-8 py-2.5">
            <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary/10 px-2.5 py-1">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3 text-primary">
                <path d="M6 1L2 2.5v3.5C2 8.8 3.8 11 6 12c2.2-1 4-3.2 4-6V2.5L6 1z"/>
              </svg>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-primary">Orbit Admin</span>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1100px] px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
