import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { getLibraryPage } from "@/lib/pages/library";
import { DEFAULT_PAGE_SIZE } from "@/lib/ui/pagination";
import { getWorkspaceMember } from "@/lib/workspaces/auth";
import { ChevronRight, Home } from "lucide-react";
import { LibraryClient } from "./library-client";
import { NewPageButton } from "@/components/workspace/new-page-button";
import { PageSearchButton } from "@/components/pages/page-search-button";

type Props = {
  params:    Promise<{ workspace: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export const metadata = { title: "Library" };

export default async function LibraryPage({ params, searchParams }: Props) {
  const { workspace: slug } = await params;
  const { tab: initialTab } = await searchParams;
  const session = await requireSession();

  const [ws] = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!ws) notFound();

  const member = await getWorkspaceMember(ws.id, session.user.id);
  if (!member) notFound();

  // Only the first page of whichever tab was linked to (e.g. the sidebar's
  // "/library?tab=private" link — defaults to "All Pages") is fetched here;
  // every tab switch, search, page-size change, or page navigation after
  // this initial render goes through GET /api/workspaces/:id/pages/library
  // instead of re-fetching the whole workspace (see lib/pages/library.ts).
  const initial = await getLibraryPage(ws.id, session.user.id, { tab: initialTab, page: 1, pageSize: DEFAULT_PAGE_SIZE });

  return (
    <div className="flex h-full flex-col overflow-hidden bg-card">

      {/* ── Topbar — matches page editor breadcrumb style ── */}
      <div className="flex h-11 shrink-0 items-center justify-between bg-card px-3">
        <nav className="flex min-w-0 items-center gap-0.5 text-xs">
          <Link
            href={`/app/${slug}`}
            className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-foreground transition-colors hover:bg-accent"
          >
            <Home size={13} className="shrink-0 text-foreground" />
            <span className="font-medium">{ws.name}</span>
          </Link>
          <ChevronRight size={12} className="shrink-0 text-foreground/40" />
          <span className="px-2 py-1 font-semibold text-foreground/80">Library</span>
        </nav>

        <div className="ml-2 flex shrink-0 items-center gap-1">
          <PageSearchButton />
          <NewPageButton
            workspaceId={ws.id}
            workspaceSlug={slug}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
          >
            <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New page
          </NewPageButton>
        </div>
      </div>

      <LibraryClient initial={initial} workspaceSlug={slug} workspaceId={ws.id} />
    </div>
  );
}
