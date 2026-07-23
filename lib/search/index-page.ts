import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { searchIndex } from "@/lib/db/schema";

// Upserts a page/entry record into search_index.
// Accepts the main db instance or a transaction (both expose .insert/.delete).
export async function upsertPageSearchIndex(
  dbOrTx: Pick<typeof db, "insert" | "delete">,
  page: {
    id:          string;
    workspaceId: string;
    title:       string | null;
    kind:        string;
  }
) {
  const title = page.title ?? "Untitled";
  // A database row (kind "entry") is searched/filtered as an "entry"; everything
  // else (kind "page" or "database") as a "page". Previously this was hardcoded
  // to "page", so the search "Entries" type filter never matched anything and
  // "Pages" returned entries too — the type filter was effectively a no-op.
  const sourceType = page.kind === "entry" ? "entry" : "page";

  // Delete any existing index row for this page first (keyed on sourceId alone)
  // rather than upserting on (sourceType, sourceId): if a page's kind ever
  // changes, an upsert would leave the old differently-typed row behind and the
  // page would show under two type filters. sourceId is unique per page, so one
  // row per page is always correct.
  await dbOrTx.delete(searchIndex).where(eq(searchIndex.sourceId, page.id));
  await dbOrTx
    .insert(searchIndex)
    .values({
      workspaceId:  page.workspaceId,
      sourceType,
      sourceId:     page.id,
      pageId:       page.id,
      title,
      searchVector: sql`to_tsvector('english', ${title})`,
    });
}
