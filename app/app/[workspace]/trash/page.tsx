import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { pages, users, workspaces } from "@/lib/db/schema";
import { getWorkspaceMember } from "@/lib/workspaces/auth";
import { TrashClient } from "./trash-client";

type Props = { params: Promise<{ workspace: string }> };

export const metadata = { title: "Trash" };

export default async function TrashPage({ params }: Props) {
  const { workspace: slug } = await params;
  const session = await requireSession();

  const [ws] = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!ws) notFound();

  const member = await getWorkspaceMember(ws.id, session.user.id);
  if (!member) notFound();

  const trashedPages = await db
    .select({
      id:        pages.id,
      shortId:   pages.shortId,
      title:     pages.title,
      icon:      pages.icon,
      kind:      pages.kind,
      deletedAt: pages.deletedAt,
      deletedBy: pages.deletedBy,
    })
    .from(pages)
    .where(and(eq(pages.workspaceId, ws.id), eq(pages.isDeleted, true)))
    .orderBy(desc(pages.deletedAt));

  // Fetch names for who deleted each page
  const deleterIds = [...new Set(trashedPages.map((p) => p.deletedBy).filter(Boolean) as string[])];
  const userRows = deleterIds.length > 0
    ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users)
    : [];
  const usersMap = Object.fromEntries(userRows.map((u) => [u.id, u.name ?? u.email]));

  const enriched = trashedPages.map((p) => ({
    ...p,
    deletedAt:   p.deletedAt?.toISOString() ?? null,
    deletedByName: p.deletedBy ? (usersMap[p.deletedBy] ?? "Unknown") : "Unknown",
  }));

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur-sm">
        <nav className="flex items-center gap-0.5 text-xs">
          <Link
            href={`/app/${slug}`}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span className="font-medium">{ws.name}</span>
          </Link>
          <svg className="size-3 shrink-0 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span className="px-2 py-1.5 font-medium text-foreground/80">Trash</span>
        </nav>
      </div>

      <TrashClient pages={enriched} workspaceSlug={slug} />
    </div>
  );
}
