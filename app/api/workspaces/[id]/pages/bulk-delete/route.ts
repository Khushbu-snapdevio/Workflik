import { and, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { pageClosure } from "@/lib/db/schema";
import { deletePageCascade } from "@/lib/pages/delete-page";
import {
  ApiError,
  apiError,
  getSession,
  requireWorkspaceMember,
} from "@/lib/workspaces/auth";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({ ids: z.array(z.string()).min(1).max(2000) });

// POST /api/workspaces/:id/pages/bulk-delete
// Deletes many pages in one request instead of the client firing one DELETE
// per selected id. That matters beyond convenience: if both a parent and one
// of its descendants are selected, deleting the parent already cascades to
// the descendant (see deletePageCascade) — a separate concurrent DELETE for
// that same descendant would find it already soft-deleted and, per the
// single-page endpoint's own "already in trash" rule, hard-delete it instead
// of leaving it in Trash. Folding every selected id up to whichever selected
// ancestor is topmost (via page_closure, so it's correct for the whole
// workspace — not just whatever the client happened to have loaded) and
// deleting only those avoids ever sending that redundant, racing second
// request.
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id: workspaceId } = await params;
    const session = await getSession();
    await requireWorkspaceMember(workspaceId, session.user.id);

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const ids = [...new Set(parsed.data.ids)];

    // Every (ancestor, descendant) pair *within the selected set* — used to
    // find which selected ids have a selected ancestor (so aren't topmost)
    // and, for those, which topmost id they fold under.
    const pairs =
      ids.length > 1
        ? await db
            .select({
              ancestorId: pageClosure.ancestorId,
              descendantId: pageClosure.descendantId,
            })
            .from(pageClosure)
            .where(
              and(
                inArray(pageClosure.ancestorId, ids),
                inArray(pageClosure.descendantId, ids),
                sql`${pageClosure.depth} > 0`
              )
            )
        : [];

    const hasSelectedAncestor = new Set(pairs.map((p) => p.descendantId));
    const topmostIds = ids.filter((id) => !hasSelectedAncestor.has(id));
    const topmostSet = new Set(topmostIds);

    const ancestorsByDescendant = new Map<string, string[]>();
    for (const p of pairs) {
      if (!ancestorsByDescendant.has(p.descendantId)) {
        ancestorsByDescendant.set(p.descendantId, []);
      }
      ancestorsByDescendant.get(p.descendantId)!.push(p.ancestorId);
    }
    // Every id has at most one selected ancestor that's itself topmost — the
    // tree can't have two topmost (no-selected-ancestor) ids where one is an
    // ancestor of the other, since that would make the "descendant" one not
    // topmost by definition.
    function effectiveTopIdOf(id: string): string {
      if (topmostSet.has(id)) {
        return id;
      }
      const ancestors = ancestorsByDescendant.get(id) ?? [];
      return ancestors.find((a) => topmostSet.has(a)) ?? id;
    }

    const outcomeByTopId = new Map<
      string,
      { ok: true } | { ok: false; error: string }
    >();
    for (const topId of topmostIds) {
      try {
        await deletePageCascade(topId, session.user.id);
        outcomeByTopId.set(topId, { ok: true });
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Failed to delete page";
        outcomeByTopId.set(topId, { ok: false, error: message });
      }
    }

    const results = ids.map((id) => {
      const topId = effectiveTopIdOf(id);
      const outcome = outcomeByTopId.get(topId) ?? {
        ok: false as const,
        error: "Page not found",
      };
      return { id, ...outcome };
    });

    return Response.json({ results });
  } catch (err) {
    if (err instanceof ApiError) {
      return apiError(err.status, err.message);
    }
    console.error("[bulk-delete]", err);
    return apiError(500, "Internal server error");
  }
}
