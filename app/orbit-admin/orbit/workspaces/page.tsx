import { count, desc, eq, ilike, or } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { workspaceMembers, workspaces } from "@/lib/db/schema";
import { AdminSearchBox } from "@/components/orbit/admin-search-box";
import { PaginationControls } from "@/components/orbit/pagination-controls";

export const metadata = { title: "Workspaces – Orbit Admin" };

const PAGE_SIZE = 24;

function ago(d: Date | null | undefined) {
 if (!d) return "—";
 const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
 if (s < 60) return `${s}s ago`;
 if (s < 3600) return `${Math.floor(s / 60)}m ago`;
 if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
 return `${Math.floor(s / 86400)}d ago`;
}

interface Props {
 searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function OrbitWorkspacesPage({ searchParams }: Props) {
 const sp   = await searchParams;
 const q    = (sp.q ?? "").trim();
 const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

 const searchFilter = q
  ? or(ilike(workspaces.name, `%${q}%`), ilike(workspaces.slug, `%${q}%`))
  : undefined;

 const [allWorkspaces, [totalCount], [filteredCount]] = await Promise.all([
  db.select({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug, icon: workspaces.icon, createdAt: workspaces.createdAt })
   .from(workspaces)
   .where(searchFilter)
   .orderBy(desc(workspaces.createdAt))
   .limit(PAGE_SIZE)
   .offset((page - 1) * PAGE_SIZE),
  db.select({ count: count() }).from(workspaces),
  searchFilter
   ? db.select({ count: count() }).from(workspaces).where(searchFilter)
   : db.select({ count: count() }).from(workspaces),
 ]);

 const memberCounts = allWorkspaces.length > 0
  ? await db
   .select({ workspaceId: workspaceMembers.workspaceId, cnt: count() })
   .from(workspaceMembers)
   .where(eq(workspaceMembers.status, "active"))
   .groupBy(workspaceMembers.workspaceId)
  : [];

 const countMap = new Map(memberCounts.map(r => [r.workspaceId, r.cnt]));

 return (
  <div>
   {/* Header */}
   <div className="mb-6">
    <div className="flex items-start justify-between gap-4">
     <div>
      <h1 className="text-xl font-bold tracking-tight text-foreground">Workspaces</h1>
      <p className="mt-1 text-sm text-muted-foreground">All workspaces on this instance — inspect members, force delete.</p>
     </div>
     <Suspense fallback={<div className="h-9 w-64 rounded-[var(--radius-md)] bg-muted animate-pulse" />}>
      <AdminSearchBox placeholder="Search by name or slug…" />
     </Suspense>
    </div>
    <div className="mt-3 flex items-center gap-2">
     <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <strong className="font-bold text-foreground">{totalCount!.count}</strong> total
     </span>
     {q && (
      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
       <strong className="font-bold text-foreground">{filteredCount!.count}</strong> matching "{q}"
      </span>
     )}
    </div>
   </div>

   {/* Grid */}
   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {allWorkspaces.map(ws => {
     const memberCount = countMap.get(ws.id) ?? 0;
     const letter = (ws.icon && ws.icon.length <= 2 ? ws.icon : ws.name?.slice(0, 1) ?? "W").toUpperCase();
     return (
      <Link key={ws.id} href={`/orbit-admin/orbit/workspaces/${ws.id}`}
       className="group flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-card p-5 transition">
       <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-primary text-sm font-bold text-white">
         {letter}
        </span>
        <div className="min-w-0 flex-1">
         <p className="truncate text-sm font-semibold text-foreground">{ws.name}</p>
         <p className="truncate text-xs text-muted-foreground">/{ws.slug}</p>
        </div>
       </div>
       <div className="flex items-center justify-between border-t border-border/40 pt-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
         <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3">
          <circle cx="4.5" cy="4" r="2"/><path d="M1 10c0-2 1.7-3.5 3.5-3.5S8 8 8 10"/>
          <path d="M8 2.5a2 2 0 010 4M10.5 8.5c1 .4 1.5 1.1 1.5 2"/>
         </svg>
         <span className="font-semibold">{memberCount}</span> member{memberCount !== 1 ? "s" : ""}
        </div>
        <span className="text-xs text-muted-foreground/60">{ago(ws.createdAt)}</span>
       </div>
      </Link>
     );
    })}
   </div>

   {allWorkspaces.length === 0 && (
    <div className="flex flex-col items-center justify-center py-24">
     <div className="mb-4 flex size-14 items-center justify-center rounded-[var(--radius-xl)] bg-muted/50">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-7">
       <path d="M3 7h14M3 13h14M7 2v16M13 2v16" strokeLinecap="round"/>
      </svg>
     </div>
     <p className="text-sm font-semibold text-muted-foreground">{q ? "No workspaces found" : "No workspaces yet"}</p>
     {q && <p className="mt-1 text-xs text-muted-foreground/60">Try a different name or slug.</p>}
    </div>
   )}

   <div className="mt-4">
    <PaginationControls
     page={page}
     pageSize={PAGE_SIZE}
     totalCount={filteredCount!.count}
     basePath="/orbit-admin/orbit/workspaces"
     query={q}
    />
   </div>
  </div>
 );
}
