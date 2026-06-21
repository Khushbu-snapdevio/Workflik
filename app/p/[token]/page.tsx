import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { blocks, pages, publicLinks } from "@/lib/db/schema";
import type { DbBlock } from "@/components/editor/serializer";
import { PublicPageViewer } from "./public-viewer";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props) {
  const { token } = await params;
  const [link] = await db
    .select({ title: pages.title, icon: pages.icon })
    .from(publicLinks)
    .innerJoin(pages, eq(pages.id, publicLinks.pageId))
    .where(eq(publicLinks.token, token))
    .limit(1);
  return {
    title: link ? `${link.icon ? link.icon + " " : ""}${link.title || "Untitled"}` : "Page not found",
  };
}

export default async function PublicPage({ params }: Props) {
  const { token } = await params;

  // Validate the public link
  const [link] = await db
    .select({
      isActive:    publicLinks.isActive,
      accessLevel: publicLinks.accessLevel,
      pageId:      publicLinks.pageId,
    })
    .from(publicLinks)
    .where(eq(publicLinks.token, token))
    .limit(1);

  // Not found or disabled
  if (!link || !link.isActive) {
    return <NotPublicScreen />;
  }

  // Load page data
  const [page] = await db
    .select({
      id:           pages.id,
      title:        pages.title,
      icon:         pages.icon,
      coverUrl:     pages.coverUrl,
      coverPosition: pages.coverPosition,
      isDeleted:    pages.isDeleted,
    })
    .from(pages)
    .where(eq(pages.id, link.pageId))
    .limit(1);

  if (!page || page.isDeleted) {
    return <NotPublicScreen />;
  }

  // Load blocks ordered
  const pageBlocks = await db
    .select()
    .from(blocks)
    .where(eq(blocks.pageId, page.id))
    .orderBy(blocks.orderIndex);

  return (
    <div className="min-h-screen bg-page">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-border bg-card/95 px-6 backdrop-blur-sm">
        <a
          href="/"
          className="text-sm font-black tracking-tight text-foreground hover:opacity-70 transition-opacity"
        >
          WORKFLIK
        </a>
        <a
          href="/auth/login"
          className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-[var(--primary-hover)] transition-colors"
        >
          Sign in to Workflik
        </a>
      </header>

      {/* Cover image */}
      {page.coverUrl && (
        <div className="relative h-52 w-full overflow-hidden bg-muted sm:h-64">
          <img
            src={page.coverUrl}
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition: `center ${(page.coverPosition ?? 0.5) * 100}%` }}
          />
        </div>
      )}

      {/* Page content */}
      <main className="mx-auto max-w-3xl px-6 py-10 sm:px-10">
        {/* Title */}
        <div className="mb-8">
          {page.icon && (
            <div className={`mb-3 text-5xl ${page.coverUrl ? "-mt-12 relative z-10" : ""}`}>
              {page.icon}
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {page.title || "Untitled"}
          </h1>
        </div>

        {/* Editor content (read-only) */}
        <PublicPageViewer blocks={pageBlocks as unknown as DbBlock[]} />

        {/* Footer */}
        <div className="mt-16 border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground/60">
            Made with{" "}
            <a href="/" className="font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Workflik
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

function NotPublicScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-page px-4 text-center">
      <div className="mb-4 text-5xl">🔒</div>
      <h1 className="text-xl font-semibold text-foreground">This page is not publicly available</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for is either private or the public link has been disabled.
      </p>
      <a
        href="/auth/login"
        className="mt-6 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-hover)] transition-colors"
      >
        Sign in to Workflik
      </a>
    </div>
  );
}
