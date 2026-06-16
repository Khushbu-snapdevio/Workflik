// ALL parent_id mutations must go through these functions — never update parent_id directly.
// Skipping this corrupts the entire page hierarchy and all permission checks that depend on it.

import { sql } from "drizzle-orm";
import type { db } from "@/lib/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function insertPageWithClosure(
  tx: Tx,
  pageId: string,
  parentId: string | null
): Promise<void> {
  // Self-referencing row (every node is its own ancestor at depth 0)
  await tx.execute(
    sql`INSERT INTO page_closure (ancestor_id, descendant_id, depth)
        VALUES (${pageId}::uuid, ${pageId}::uuid, 0)`
  );

  if (parentId) {
    // Inherit all ancestor rows from parent, incremented by 1
    await tx.execute(
      sql`INSERT INTO page_closure (ancestor_id, descendant_id, depth)
          SELECT ancestor_id, ${pageId}::uuid, depth + 1
          FROM page_closure
          WHERE descendant_id = ${parentId}::uuid`
    );
  }
}

export async function movePageWithClosure(
  tx: Tx,
  pageId: string,
  newParentId: string | null
): Promise<void> {
  // Remove all paths that enter the subtree from outside
  await tx.execute(
    sql`DELETE FROM page_closure
        WHERE descendant_id IN (
          SELECT descendant_id FROM page_closure WHERE ancestor_id = ${pageId}::uuid
        )
        AND ancestor_id NOT IN (
          SELECT descendant_id FROM page_closure WHERE ancestor_id = ${pageId}::uuid
        )`
  );

  if (newParentId) {
    // Reconnect: cross-join new parent's ancestors with the subtree
    await tx.execute(
      sql`INSERT INTO page_closure (ancestor_id, descendant_id, depth)
          SELECT supertree.ancestor_id,
                 subtree.descendant_id,
                 supertree.depth + subtree.depth + 1
          FROM page_closure AS supertree
          CROSS JOIN page_closure AS subtree
          WHERE supertree.descendant_id = ${newParentId}::uuid
            AND subtree.ancestor_id     = ${pageId}::uuid`
    );
  }
}

// No-op: ON DELETE CASCADE on page_closure FKs handles physical deletion automatically.
export async function deletePageClosure(
  _tx: Tx,
  _pageId: string
): Promise<void> {}
