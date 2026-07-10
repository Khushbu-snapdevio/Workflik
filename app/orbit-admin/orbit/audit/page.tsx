import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { platformAuditLog, users } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { PaginationControls } from "@/components/orbit/pagination-controls";

export const metadata = { title: "Audit Trail – Orbit Admin" };

const PAGE_SIZE = 25;

interface Props {
 searchParams: Promise<{ page?: string }>;
}

const ACTION_META: Record<string, { label: string; pill: string }> = {
 "user.signup":                    { label: "User signed up",          pill: "bg-success/10 text-success border-success/20" },
 "user.banned":                    { label: "User banned",             pill: "bg-destructive/5 text-destructive border-destructive/20" },
 "user.unbanned":                  { label: "User unbanned",           pill: "bg-success/10 text-success border-success/20" },
 "workspace.created":              { label: "Workspace created",       pill: "bg-primary/10 text-primary border-primary/20" },
 "workspace.updated":              { label: "Workspace updated",       pill: "bg-warning/10 text-warning border-warning/20" },
 "workspace.deleted":              { label: "Workspace deleted",       pill: "bg-destructive/5 text-destructive border-destructive/20" },
 "workspace.force_deleted":        { label: "Workspace force-deleted", pill: "bg-destructive/5 text-destructive border-destructive/20" },
 "workspace.ownership_transferred":{ label: "Ownership transferred",   pill: "bg-primary/10 text-primary border-primary/20" },
 "member.invited":                 { label: "Member invited",          pill: "bg-primary/10 text-primary border-primary/20" },
 "member.joined":                  { label: "Member joined",           pill: "bg-success/10 text-success border-success/20" },
 "member.role_changed":            { label: "Role changed",            pill: "bg-warning/10 text-warning border-warning/20" },
 "member.removed":                 { label: "Member removed",          pill: "bg-destructive/5 text-destructive border-destructive/20" },
 "session.impersonated":           { label: "User impersonated",       pill: "bg-primary/10 text-primary border-primary/20" },
 "session.revoked_all":            { label: "Sessions revoked",        pill: "bg-primary/10 text-primary border-primary/20" },
 "template.created":               { label: "Template created",        pill: "bg-primary/10 text-primary border-primary/20" },
 "template.updated":               { label: "Template updated",        pill: "bg-warning/10 text-warning border-warning/20" },
 "template.deleted":               { label: "Template deleted",        pill: "bg-destructive/5 text-destructive border-destructive/20" },
 "template.published":             { label: "Template published",      pill: "bg-success/10 text-success border-success/20" },
 "template.unpublished":           { label: "Template unpublished",    pill: "bg-warning/10 text-warning border-warning/20" },
 "template.seeded":                { label: "Templates seeded",        pill: "bg-primary/10 text-primary border-primary/20" },
 "template.reseeded":              { label: "Templates re-seeded",     pill: "bg-warning/10 text-warning border-warning/20" },
 "template.icons_updated":         { label: "Template icons updated",  pill: "bg-primary/10 text-primary border-primary/20" },
 "email.retried":                  { label: "Email retried",           pill: "bg-primary/10 text-primary border-primary/20" },
 "user.auto_promoted_first_admin": { label: "Auto-promoted to admin",  pill: "bg-primary/10 text-primary border-primary/20" },
};

// Fallback for any action type not in ACTION_META — "user.auto_promoted_first_admin"
// → "Auto promoted first admin" — so unmapped actions still read as a label
// instead of a raw dotted/underscored string that can overflow its pill.
function humanizeAction(action: string): string {
 const tail = action.includes(".") ? action.slice(action.indexOf(".") + 1) : action;
 return tail.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function ago(d: Date | null | undefined) {
 if (!d) return "—";
 const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
 if (s < 60) return `${s}s ago`;
 if (s < 3600) return `${Math.floor(s / 60)}m ago`;
 if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
 return `${Math.floor(s / 86400)}d ago`;
}

export default async function OrbitAuditPage({ searchParams }: Props) {
 const sp   = await searchParams;
 const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

 const [events, [totalRow]] = await Promise.all([
  db
   .select({
    id:         platformAuditLog.id,
    action:     platformAuditLog.action,
    targetType: platformAuditLog.targetType,
    targetId:   platformAuditLog.targetId,
    metadata:   platformAuditLog.metadata,
    createdAt:  platformAuditLog.createdAt,
    actorName:  users.name,
    actorEmail: users.email,
    actorId:    users.id,
   })
   .from(platformAuditLog)
   .leftJoin(users, eq(platformAuditLog.actorId, users.id))
   .orderBy(desc(platformAuditLog.createdAt))
   .limit(PAGE_SIZE)
   .offset((page - 1) * PAGE_SIZE),
  db.select({ count: count() }).from(platformAuditLog),
 ]);

 const totalCount = totalRow?.count ?? 0;

 return (
  <div>
   {/* Header */}
   <div className="mb-6">
    <h1 className="text-xl font-bold tracking-tight text-foreground">Audit Trail</h1>
    <p className="mt-1 text-sm text-muted-foreground">Append-only log of all admin operator actions.</p>
    <div className="mt-3">
     <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <strong className="font-bold text-foreground">{totalCount}</strong> events total
     </span>
    </div>
   </div>

   {events.length === 0 ? (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-border bg-muted/20 py-24">
     <div className="mb-4 flex size-14 items-center justify-center rounded-[var(--radius-xl)] bg-muted/50">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-7 text-muted-foreground/50">
       <path d="M5 5h10M5 9h10M5 13h6" strokeLinecap="round"/>
      </svg>
     </div>
     <p className="text-sm font-semibold text-muted-foreground">No audit events yet</p>
     <p className="mt-1 text-xs text-muted-foreground/60">Admin actions will appear here automatically.</p>
    </div>
   ) : (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card">
     <div className="grid grid-cols-[auto_1fr_auto_auto] border-b border-border/60 bg-muted/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
      <span className="w-44">Action</span>
      <span className="pl-4">Details</span>
      <span className="pr-6">Actor</span>
      <span>When</span>
     </div>
     <div className="divide-y divide-border">
      {events.map(ev => {
       const meta = ACTION_META[ev.action];
       const md   = ev.metadata as Record<string, unknown> | null;
       return (
        <div key={ev.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 px-5 py-3.5 transition-colors hover:bg-accent">
         <span className="w-44 min-w-0 shrink-0">
          <span
           title={meta ? undefined : ev.action}
           className={`inline-flex max-w-full items-center truncate rounded-full border px-2 py-0.5 text-xs font-semibold ${meta?.pill ?? "bg-muted text-muted-foreground border-border"}`}
          >
           {meta?.label ?? humanizeAction(ev.action)}
          </span>
         </span>
         <div className="min-w-0 pl-4">
          <div className="flex items-center gap-2">
           <span className="text-xs font-semibold text-muted-foreground">{ev.targetType}</span>
           {ev.targetId && (
            <span className="font-mono text-xs text-muted-foreground/60">{ev.targetId.slice(0, 12)}…</span>
           )}
          </div>
          {md && Object.keys(md).length > 0 && (
           <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {Object.entries(md).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
           </p>
          )}
          {ev.targetId && ev.targetType === "user" && (
           <Link href={`/orbit-admin/orbit/users/${ev.targetId}`}
            className="mt-0.5 text-xs font-semibold text-primary hover:underline">
            View user →
           </Link>
          )}
          {ev.targetId && ev.targetType === "workspace" && (
           <Link href={`/orbit-admin/orbit/workspaces/${ev.targetId}`}
            className="mt-0.5 text-xs font-semibold text-muted-foreground transition hover:text-primary hover:underline">
            View workspace →
           </Link>
          )}
         </div>
         <div className="shrink-0 pr-6 text-right">
          {ev.actorEmail ? (
           <Link href={`/orbit-admin/orbit/users/${ev.actorId}`}
            className="text-xs font-semibold text-foreground/70 transition hover:text-primary hover:underline">
            {ev.actorName ?? ev.actorEmail}
           </Link>
          ) : (
           <span className="text-xs text-muted-foreground/60">Deleted user</span>
          )}
         </div>
         <div className="shrink-0 text-right">
          <p className="text-xs font-medium text-muted-foreground">{ago(ev.createdAt)}</p>
          <p className="text-xs text-muted-foreground/60">{formatDateTime(ev.createdAt)}</p>
         </div>
        </div>
       );
      })}
     </div>
    </div>
   )}

   <div className="mt-4">
    <PaginationControls
     page={page}
     pageSize={PAGE_SIZE}
     totalCount={totalCount}
     basePath="/orbit-admin/orbit/audit"
     query=""
    />
   </div>
  </div>
 );
}
