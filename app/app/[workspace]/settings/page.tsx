import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { workspaceMembers, workspaces, workspaceStorageUsage } from "@/lib/db/schema";
import { getWorkspaceMember } from "@/lib/workspaces/auth";

const QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const gb = bytes / (1024 ** 3);
  if (gb >= 1) return `${gb.toFixed(2).replace(/\.?0+$/, "")} GB`;
  const mb = bytes / (1024 ** 2);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

type Props = { params: Promise<{ workspace: string }> };

export async function generateMetadata({ params }: Props) {
  const { workspace: slug } = await params;
  const [ws] = await db.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
  return { title: ws ? `Settings — ${ws.name}` : "Settings" };
}

export default async function WorkspaceSettingsPage({ params }: Props) {
  const { workspace: slug } = await params;
  const session = await requireSession();

  const [ws] = await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
  if (!ws) notFound();

  const member = await getWorkspaceMember(ws.id, session.user.id);
  if (!member) notFound();

  const isAdmin = member.role === "admin";

  // Storage usage — row may not exist yet (no uploads made)
  const [usage] = await db
    .select({ bytesUsed: workspaceStorageUsage.bytesUsed })
    .from(workspaceStorageUsage)
    .where(eq(workspaceStorageUsage.workspaceId, ws.id))
    .limit(1);

  const bytesUsed   = usage?.bytesUsed ?? 0;
  const pct         = Math.min((bytesUsed / QUOTA_BYTES) * 100, 100);
  const isNearLimit = pct >= 90;
  const isAtLimit   = pct >= 100;

  // Member count
  const memberCount = await db.$count(workspaceMembers, eq(workspaceMembers.workspaceId, ws.id));

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl px-8 py-12">

        {/* Header */}
        <div className="mb-10 flex items-center gap-4">
          {ws.icon ? (
            <span className="text-4xl leading-none">{ws.icon}</span>
          ) : (
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary">
              {ws.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{ws.name}</h1>
            <p className="text-sm text-muted-foreground">
              {memberCount} member{memberCount !== 1 ? "s" : ""} · {ws.slug}
            </p>
          </div>
        </div>

        {/* ── Storage ── */}
        <section className="mb-8 rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Storage</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Workspace file quota — covers page covers, media blocks, and file attachments.
              </p>
            </div>
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold",
                isAtLimit
                  ? "bg-red-100 text-red-700"
                  : isNearLimit
                    ? "bg-amber-100 text-amber-700"
                    : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {isAtLimit ? "Full" : isNearLimit ? "Almost full" : "OK"}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={[
                "h-full rounded-full transition-all duration-500",
                isAtLimit
                  ? "bg-red-500"
                  : isNearLimit
                    ? "bg-amber-400"
                    : "bg-primary",
              ].join(" ")}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Usage label */}
          <div className="mt-2.5 flex items-center justify-between text-sm">
            <span
              className={[
                "font-medium",
                isAtLimit
                  ? "text-red-600"
                  : isNearLimit
                    ? "text-amber-600"
                    : "text-foreground",
              ].join(" ")}
            >
              {formatBytes(bytesUsed)} used
            </span>
            <span className="text-muted-foreground">
              {formatBytes(QUOTA_BYTES)} total · {(100 - pct).toFixed(1)}% free
            </span>
          </div>

          {isAtLimit && (
            <p className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
              Storage limit reached — new uploads are blocked until files are removed.
            </p>
          )}
          {isNearLimit && !isAtLimit && (
            <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
              Approaching the 5 GB limit. Consider removing unused media to free space.
            </p>
          )}
        </section>

        {/* ── Workspace info (Admin only) ── */}
        {isAdmin ? (
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-1 text-base font-semibold text-foreground">Workspace</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              General workspace details. More settings coming soon.
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </label>
                <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
                  {ws.name}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  URL Slug
                </label>
                <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-mono text-foreground">
                  /app/{ws.slug}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-card p-6 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
              <svg className="size-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">Admin only</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Workspace settings can only be changed by an Admin.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
