import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { searchIndex } from "@/lib/db/schema";

// Upserts a page record into search_index.
// Accepts the main db instance or a transaction (both expose .insert).
export async function upsertPageSearchIndex(
  dbOrTx: Pick<typeof db, "insert">,
  page: {
    id:          string;
    workspaceId: string;
    title:       string | null;
    kind:        string;
  }
) {
  const title = page.title ?? "Untitled";

  await dbOrTx
    .insert(searchIndex)
    .values({
      workspaceId:  page.workspaceId,
      sourceType:   "page",
      sourceId:     page.id,
      pageId:       page.id,
      title,
      searchVector: sql`to_tsvector('english', ${title})`,
    })
    .onConflictDoUpdate({
      target: [searchIndex.sourceType, searchIndex.sourceId],
      set: {
        title,
        searchVector: sql`to_tsvector('english', ${title})`,
        updatedAt:    new Date(),
      },
    });
}
