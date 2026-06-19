import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages, pageClosure, searchIndex, workspaceMembers } from "@/lib/db/schema";
import { ApiError, apiError, getSession } from "@/lib/workspaces/auth";

export const runtime = "nodejs";

// GET /api/search?q=&workspaceId=&type=&date=&titleOnly=
export async function GET(req: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);

    const q           = (searchParams.get("q") ?? "").trim();
    const workspaceId = searchParams.get("workspaceId") ?? "";
    const type        = searchParams.get("type") ?? "all";          // all | page | entry | comment
    const date        = searchParams.get("date") ?? "any";          // any | 24h | 7d | 30d
    const titleOnly   = searchParams.get("titleOnly") === "true";

    if (!workspaceId) return apiError(400, "workspaceId is required");

    // Verify membership
    const [member] = await db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, session.user.id),
          eq(workspaceMembers.status, "active"),
        ),
      )
      .limit(1);
    if (!member) return apiError(403, "Not a member of this workspace");

    // Date filter
    const dateFilter = (() => {
      if (date === "24h") return sql`${searchIndex.updatedAt} >= NOW() - INTERVAL '24 hours'`;
      if (date === "7d")  return sql`${searchIndex.updatedAt} >= NOW() - INTERVAL '7 days'`;
      if (date === "30d") return sql`${searchIndex.updatedAt} >= NOW() - INTERVAL '30 days'`;
      return null;
    })();

    // Type filter
    const typeFilter = (() => {
      if (type === "page")    return eq(searchIndex.sourceType, "page");
      if (type === "entry")   return eq(searchIndex.sourceType, "entry");
      if (type === "comment") return eq(searchIndex.sourceType, "comment");
      return null;
    })();

    // Build conditions
    const conditions = [
      eq(searchIndex.workspaceId, workspaceId),
      // Exclude deleted pages
      eq(pages.isDeleted, false),
    ];
    if (typeFilter)  conditions.push(typeFilter);
    if (dateFilter)  conditions.push(dateFilter);

    if (!q) {
      // Empty query — return nothing (recently visited handled separately)
      return Response.json({ results: [], total: 0 });
    }

    // Build tsquery — split words, join with & prefix matching
    const words = q.split(/\s+/).filter(Boolean);
    const tsQuery = words.map((w) => `${w.replace(/[^a-zA-Z0-9]/g, "")}:*`).join(" & ");
    if (!tsQuery) return Response.json({ results: [], total: 0 });

    const vectorCondition = titleOnly
      ? sql`to_tsvector('english', coalesce(${searchIndex.title}, '')) @@ to_tsquery('english', ${tsQuery})`
      : sql`${searchIndex.searchVector} @@ to_tsquery('english', ${tsQuery})`;

    conditions.push(vectorCondition);

    const rows = await db
      .select({
        id:         searchIndex.id,
        sourceType: searchIndex.sourceType,
        sourceId:   searchIndex.sourceId,
        title:      searchIndex.title,
        pageId:     searchIndex.pageId,
        updatedAt:  searchIndex.updatedAt,
        shortId:    pages.shortId,
        icon:       pages.icon,
        kind:       pages.kind,
        rank: sql<number>`ts_rank(${searchIndex.searchVector}, to_tsquery('english', ${tsQuery}))`,
      })
      .from(searchIndex)
      .innerJoin(pages, eq(pages.id, searchIndex.pageId))
      .where(and(...conditions))
      .orderBy(
        desc(sql`ts_rank(${searchIndex.searchVector}, to_tsquery('english', ${tsQuery}))`),
        desc(searchIndex.updatedAt),
      )
      .limit(50);

    // For each result, build a breadcrumb path
    const pageIds = [...new Set(rows.map((r) => r.pageId))];
    const breadcrumbMap = new Map<string, string>();

    if (pageIds.length > 0) {
      // Get ancestors for each page (depth desc = root first)
      const ancestors = await db
        .select({
          descendantId: pageClosure.descendantId,
          title:        pages.title,
          depth:        pageClosure.depth,
        })
        .from(pageClosure)
        .innerJoin(pages, eq(pages.id, pageClosure.ancestorId))
        .where(
          and(
            sql`${pageClosure.descendantId} = ANY(ARRAY[${sql.join(pageIds.map((id) => sql`${id}::uuid`), sql`, `)}])`,
            sql`${pageClosure.depth} > 0`,
            eq(pages.isDeleted, false),
          ),
        )
        .orderBy(desc(pageClosure.depth));

      // Group ancestors by descendant
      const ancestorsByPage = new Map<string, { title: string; depth: number }[]>();
      for (const row of ancestors) {
        if (!ancestorsByPage.has(row.descendantId)) ancestorsByPage.set(row.descendantId, []);
        ancestorsByPage.get(row.descendantId)!.push({ title: row.title, depth: row.depth });
      }

      for (const pageId of pageIds) {
        const ancs = (ancestorsByPage.get(pageId) ?? []).sort((a, b) => b.depth - a.depth);
        breadcrumbMap.set(pageId, ancs.map((a) => a.title || "Untitled").join(" / "));
      }
    }

    const results = rows.map((r) => ({
      id:         r.id,
      sourceType: r.sourceType,
      sourceId:   r.sourceId,
      title:      r.title ?? "Untitled",
      pageId:     r.pageId,
      shortId:    r.shortId,
      icon:       r.icon,
      kind:       r.kind,
      breadcrumb: breadcrumbMap.get(r.pageId) ?? "",
      updatedAt:  r.updatedAt,
      rank:       r.rank,
    }));

    return Response.json({ results, total: results.length });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    console.error("[search]", err);
    return apiError(500, "Internal server error");
  }
}
