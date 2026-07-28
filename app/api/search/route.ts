import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pageClosure, pages, searchIndex, searchQueryLog, templateCategories, templates, workspaceMembers } from "@/lib/db/schema";
import { ApiError, apiError, getSession } from "@/lib/workspaces/auth";

export const runtime = "nodejs";

// GET /api/search?q=&workspaceId=&type=&date=&titleOnly=
export async function GET(req: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);

    const q           = (searchParams.get("q") ?? "").trim();
    const workspaceId = searchParams.get("workspaceId") ?? "";
    const type        = searchParams.get("type") ?? "all";          // all | page | entry | comment | template
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

    // Date filter — by the page's real last-edited time (pages.updatedAt), not
    // the index row's updatedAt. The index time is bumped to "now" for every
    // row on a reindex, which made the date filter useless (everything looked
    // recent) and never matched the "last edited" shown elsewhere.
    const dateFilter = (() => {
      if (date === "24h") return sql`${pages.updatedAt} >= NOW() - INTERVAL '24 hours'`;
      if (date === "7d")  return sql`${pages.updatedAt} >= NOW() - INTERVAL '7 days'`;
      if (date === "30d") return sql`${pages.updatedAt} >= NOW() - INTERVAL '30 days'`;
      return null;
    })();

    // Type filter
    const typeFilter = (() => {
      if (type === "page")    return eq(searchIndex.sourceType, "page");
      if (type === "entry")   return eq(searchIndex.sourceType, "entry");
      if (type === "comment") return eq(searchIndex.sourceType, "comment");
      return null;
    })();
    // Templates live in their own table, not search_index — "template" is
    // handled as an entirely separate query below, so the page/entry/comment
    // query must return nothing when it's the only type selected.
    const isTemplateOnly = type === "template";
    const includeTemplates = type === "all" || isTemplateOnly;

    // Build conditions
    const conditions = [
      eq(searchIndex.workspaceId, workspaceId),
      eq(pages.isDeleted, false),
      // Exclude other users' private pages
      or(eq(pages.isPrivate, false), eq(pages.createdBy, session.user.id)),
      // Exclude other users' unpromoted drafts
      or(eq(pages.isDraft, false), eq(pages.createdBy, session.user.id)),
    ];
    if (typeFilter)  conditions.push(typeFilter);
    if (dateFilter)  conditions.push(dateFilter);

    // Browse mode: an empty query is allowed when a type/date filter is active,
    // so selecting e.g. "Entries" lists matching items (newest first) instead of
    // the client falling back to the unfiltered recently-visited list. With no
    // query AND no filter there's nothing to browse — return empty and let the
    // client show recently-visited.
    if (!q && !typeFilter && !isTemplateOnly && !dateFilter) {
      return Response.json({ results: [], total: 0 });
    }

    // Build tsquery — split words, join with & prefix matching (only when the
    // user actually typed something).
    const words = q ? q.split(/\s+/).filter(Boolean) : [];
    const tsQuery = words.map((w) => `${w.replace(/[^a-zA-Z0-9]/g, "")}:*`).join(" & ");
    // A non-empty query that reduces to an empty tsquery (all punctuation) matches nothing.
    if (q && !tsQuery) return Response.json({ results: [], total: 0 });

    if (tsQuery) {
      const vectorCondition = titleOnly
        ? sql`to_tsvector('english', coalesce(${searchIndex.title}, '')) @@ to_tsquery('english', ${tsQuery})`
        : sql`${searchIndex.searchVector} @@ to_tsquery('english', ${tsQuery})`;
      conditions.push(vectorCondition);
    }

    // Rank by text relevance when searching; browse mode has no query, so rank
    // is constant and results order purely by recency.
    const rankExpr = tsQuery
      ? sql<number>`ts_rank(${searchIndex.searchVector}, to_tsquery('english', ${tsQuery}))`
      : sql<number>`0`;
    const orderByCols = tsQuery
      ? [desc(rankExpr), desc(pages.updatedAt)]
      : [desc(pages.updatedAt)];

    // "template" is an exclusive filter handled entirely by the templates
    // query below — search_index has no rows for templates, so skip this
    // query rather than run it just to join zero rows.
    const rows = isTemplateOnly ? [] : await db
      .select({
        id:         searchIndex.id,
        sourceType: searchIndex.sourceType,
        sourceId:   searchIndex.sourceId,
        title:      searchIndex.title,
        pageId:     searchIndex.pageId,
        updatedAt:  pages.updatedAt,
        shortId:    pages.shortId,
        icon:       pages.icon,
        kind:       pages.kind,
        rank:       rankExpr,
      })
      .from(searchIndex)
      .innerJoin(pages, eq(pages.id, searchIndex.pageId))
      .where(and(...conditions))
      .orderBy(...orderByCols)
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

    type ResultRow = {
      id: string;
      sourceType: "page" | "entry" | "comment" | "template";
      sourceId: string;
      title: string;
      pageId: string;
      shortId: string;
      icon: string | null;
      kind: string;
      breadcrumb: string;
      updatedAt: Date;
      rank: number;
    };

    const pageResults: ResultRow[] = rows.map((r) => ({
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

    // Templates aren't page-shaped (no owner/ancestor/isDeleted concept) and
    // live outside search_index entirely, so they get their own lightweight
    // ILIKE query here instead of being folded into the tsvector pipeline
    // above, then merged into the same ranked result list.
    let templateResults: ResultRow[] = [];
    if (includeTemplates) {
      const templateDateFilter = (() => {
        if (date === "24h") return sql`${templates.updatedAt} >= NOW() - INTERVAL '24 hours'`;
        if (date === "7d")  return sql`${templates.updatedAt} >= NOW() - INTERVAL '7 days'`;
        if (date === "30d") return sql`${templates.updatedAt} >= NOW() - INTERVAL '30 days'`;
        return null;
      })();

      const templateConditions = [
        eq(templates.status, "published"),
        // Built-in templates (workspaceId null) plus this workspace's own.
        or(eq(templates.workspaceId, workspaceId), isNull(templates.workspaceId)),
      ];
      if (templateDateFilter) templateConditions.push(templateDateFilter);
      if (q) {
        const nameMatch = ilike(templates.name, `%${q}%`);
        templateConditions.push(
          titleOnly ? nameMatch : or(nameMatch, ilike(templates.description, `%${q}%`)),
        );
      }

      const templateRows = await db
        .select({
          id:            templates.id,
          name:          templates.name,
          pageSnapshot:  templates.pageSnapshot,
          updatedAt:     templates.updatedAt,
          categoryLabel: templateCategories.label,
        })
        .from(templates)
        .leftJoin(templateCategories, eq(templateCategories.id, templates.categoryId))
        .where(and(...templateConditions))
        .orderBy(desc(templates.updatedAt))
        .limit(20);

      const needle = q.toLowerCase();
      templateResults = templateRows.map((t) => {
        const name = t.name.toLowerCase();
        const rank = !q ? 0
          : name === needle        ? 1
          : name.startsWith(needle) ? 0.8
          : name.includes(needle)  ? 0.5
          : 0.2; // matched only via description
        const snapshot = t.pageSnapshot as { icon?: string | null } | null;
        return {
          id:         t.id,
          sourceType: "template" as const,
          sourceId:   t.id,
          title:      t.name || "Untitled",
          pageId:     "",
          shortId:    "",
          icon:       snapshot?.icon ?? null,
          kind:       "template",
          breadcrumb: t.categoryLabel ?? "",
          updatedAt:  t.updatedAt,
          rank,
        };
      });
    }

    const results = [...pageResults, ...templateResults]
      .sort((a, b) => (b.rank - a.rank) || (new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()))
      .slice(0, 50);

    // Fire-and-forget — powers the Orbit Analytics "search usage & no-result
    // rate" metrics. Never awaited/blocking: a logging failure must never
    // affect the actual search response. Only real typed queries are logged;
    // filter-only browse (empty q) isn't a "search" for analytics purposes.
    if (q) {
      db.insert(searchQueryLog)
        .values({ workspaceId, userId: session.user.id, query: q, resultCount: results.length })
        .catch(() => {});
    }

    return Response.json({ results, total: results.length });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    console.error("[search]", err);
    return apiError(500, "Internal server error");
  }
}
