import { createId } from "@paralleldrive/cuid2";
import { blocks, pages } from "@/lib/db/schema";
import { insertPageWithClosure } from "@/lib/pages/closure";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTx = any;

export type SnapshotBlock = {
  id: string;
  type: string;
  content: unknown;
  schema_version?: number;
  order_index: number;
  parent_block_id: string | null;
  children?: SnapshotBlock[];
};

export type PageSnapshot = {
  title: string;
  icon: string | null;
  cover_url: string | null;
  is_full_width: boolean;
  font_family: string;
  blocks: SnapshotBlock[];
  subpages: { title: string }[];
};

// Forks a (non-database) template snapshot into real page + block rows —
// shared by the template gallery's "Use template" action and onboarding, so
// a template picked at signup gets the exact same pre-built content as one
// picked from the gallery later.
export async function createPageFromSnapshot(
  tx: AnyTx,
  params: {
    snapshot: PageSnapshot;
    fallbackTitle: string;
    workspaceId: string;
    parentId: string | null;
    orderIndex: number;
    userId: string;
  }
): Promise<typeof pages.$inferSelect> {
  const { snapshot, fallbackTitle, workspaceId, parentId, orderIndex, userId } = params;

  const [page] = await tx
    .insert(pages)
    .values({
      shortId:      createId().slice(0, 10),
      workspaceId,
      parentId,
      kind:         "page",
      title:        snapshot.title || fallbackTitle,
      icon:         snapshot.icon ?? null,
      coverUrl:     snapshot.cover_url ?? null,
      isFullWidth:  snapshot.is_full_width ?? false,
      orderIndex,
      createdBy:    userId,
      lastEditedBy: userId,
    })
    .returning();

  await insertPageWithClosure(tx, page.id, parentId);

  async function insertBlocks(snapshotBlocks: SnapshotBlock[], parentBlockId: string | null) {
    for (const sb of snapshotBlocks) {
      const newBlockId = crypto.randomUUID();
      await tx.insert(blocks).values({
        id:            newBlockId,
        pageId:        page.id,
        parentBlockId,
        type:          sb.type as "paragraph",
        content:       sb.content ?? {},
        schemaVersion: sb.schema_version ?? 1,
        orderIndex:    sb.order_index,
        createdBy:     userId,
      });
      if (sb.children?.length) await insertBlocks(sb.children, newBlockId);
    }
  }

  if (snapshot.blocks?.length) {
    await insertBlocks(snapshot.blocks, null);
  } else {
    await tx.insert(blocks).values({
      pageId:        page.id,
      parentBlockId: null,
      type:          "paragraph",
      content:       { text: [] },
      schemaVersion: 1,
      orderIndex:    0,
      createdBy:     userId,
    });
  }

  if (snapshot.subpages?.length) {
    for (let i = 0; i < snapshot.subpages.length; i++) {
      const sub = snapshot.subpages[i];
      const [subPage] = await tx
        .insert(pages)
        .values({
          shortId:      createId().slice(0, 10),
          workspaceId,
          parentId:     page.id,
          kind:         "page",
          title:        sub.title || "Untitled",
          orderIndex:   i,
          createdBy:    userId,
          lastEditedBy: userId,
        })
        .returning();
      await insertPageWithClosure(tx, subPage.id, page.id);
      await tx.insert(blocks).values({
        pageId:        subPage.id,
        parentBlockId: null,
        type:          "paragraph",
        content:       { text: [] },
        schemaVersion: 1,
        orderIndex:    0,
        createdBy:     userId,
      });
    }
  }

  return page;
}

// Notion's "Start blank" still lands the user on one empty page, not zero
// pages — mirror that instead of leaving a brand-new workspace with nothing
// to open.
export async function createBlankPage(
  tx: AnyTx,
  params: { workspaceId: string; parentId: string | null; orderIndex: number; userId: string }
): Promise<typeof pages.$inferSelect> {
  const { workspaceId, parentId, orderIndex, userId } = params;

  const [page] = await tx
    .insert(pages)
    .values({
      shortId:      createId().slice(0, 10),
      workspaceId,
      parentId,
      kind:         "page",
      title:        "Untitled",
      orderIndex,
      createdBy:    userId,
      lastEditedBy: userId,
    })
    .returning();

  await insertPageWithClosure(tx, page.id, parentId);

  await tx.insert(blocks).values({
    pageId:        page.id,
    parentBlockId: null,
    type:          "paragraph",
    content:       { text: [] },
    schemaVersion: 1,
    orderIndex:    0,
    createdBy:     userId,
  });

  return page;
}
