import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { blocks, databaseProperties, databaseViews, pages, propertyValues, templates } from "@/lib/db/schema";
import { insertPageWithClosure } from "@/lib/pages/closure";
import { ApiError, apiError, getSession, requireWorkspaceMember } from "@/lib/workspaces/auth";

const useSchema = z.object({
  workspaceId: z.string().uuid(),
  parentId:    z.string().uuid().nullable().default(null),
});

type SnapshotBlock = {
  id: string;
  type: string;
  content: unknown;
  schema_version?: number;
  order_index: number;
  parent_block_id: string | null;
  children?: SnapshotBlock[];
};

type PropOption  = { name: string; color: string };
type SchemaProp  = { name: string; type: string; options?: PropOption[] };
type SchemaView  = { name: string; type: string; isDefault?: boolean; groupBy?: string };

type PageSnapshot = {
  title:       string;
  icon:        string | null;
  cover_url:   string | null;
  is_full_width: boolean;
  font_family: string;
  blocks:      SnapshotBlock[];
  subpages:    { title: string }[];
  database_schema: null | {
    properties:  SchemaProp[];
    views:       SchemaView[];
    sample_rows?: Record<string, string | number>[];
  };
};

// Property types supported by WorkFlik's database engine
const SUPPORTED_PROP_TYPES = new Set([
  "text", "number", "select", "multi_select", "date",
  "checkbox", "url", "email", "phone", "person",
]);

// POST /api/templates/:id/use — create a new page (or database) from a template
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    const body    = await req.json();
    const parsed  = useSchema.safeParse(body);
    if (!parsed.success) return apiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    const { workspaceId, parentId } = parsed.data;

    await requireWorkspaceMember(workspaceId, session.user.id, "editor");

    const [tpl] = await db
      .select()
      .from(templates)
      .where(and(eq(templates.id, id), eq(templates.status, "published")))
      .limit(1);

    if (!tpl) return apiError(404, "Template not found");
    if (!tpl.isBuiltIn && tpl.workspaceId !== workspaceId) return apiError(403, "Forbidden");

    const snapshot = tpl.pageSnapshot as PageSnapshot;

    const [{ maxOrder }] = await db
      .select({ maxOrder: max(pages.orderIndex) })
      .from(pages)
      .where(
        and(
          eq(pages.workspaceId, workspaceId),
          eq(pages.isDeleted, false),
          parentId ? eq(pages.parentId, parentId) : isNull(pages.parentId)
        )
      );
    const orderIndex = (maxOrder ?? -1) + 1;

    const newPage = await db.transaction(async (tx) => {
      const shortId = createId().slice(0, 10);

      // ── DATABASE TEMPLATE ──────────────────────────────────────────────────
      if (snapshot.database_schema) {
        const schema = snapshot.database_schema;

        // 1. Create the database page
        const [dbPage] = await tx
          .insert(pages)
          .values({
            shortId,
            workspaceId,
            parentId,
            kind:         "database",
            title:        snapshot.title || tpl.name,
            icon:         snapshot.icon ?? null,
            coverUrl:     snapshot.cover_url ?? null,
            isFullWidth:  snapshot.is_full_width ?? false,
            orderIndex,
            createdBy:    session.user.id,
            lastEditedBy: session.user.id,
          })
          .returning();

        await insertPageWithClosure(tx, dbPage.id, parentId);

        // 2. Prepare properties — skip "title" (stored on page) and unsupported types
        let titlePropName: string | undefined;
        const preparedProps: {
          name:      string;
          type:      string;
          config:    Record<string, unknown>;
          orderIdx:  number;
          optionMap: Map<string, string>; // option name → UUID
        }[] = [];

        for (const p of schema.properties) {
          if (p.type === "title") { titlePropName = p.name; continue; }
          if (!SUPPORTED_PROP_TYPES.has(p.type)) continue;

          const optionMap = new Map<string, string>();
          let config: Record<string, unknown> = {};

          if (p.type === "select" || p.type === "multi_select") {
            const options = (p.options ?? []).map((opt) => {
              const oid = crypto.randomUUID();
              optionMap.set(opt.name, oid);
              return { id: oid, name: opt.name, color: opt.color ?? "gray" };
            });
            config = { options };
          }

          preparedProps.push({
            name:     p.name,
            type:     p.type,
            config,
            orderIdx: preparedProps.length,
            optionMap,
          });
        }

        // 3. Insert properties → build name → { id, type, optionMap } lookup
        const propLookup = new Map<string, { id: string; type: string; optionMap: Map<string, string> }>();
        for (const prep of preparedProps) {
          const [prop] = await tx.insert(databaseProperties).values({
            databaseId: dbPage.id,
            name:       prep.name,
            type:       prep.type as "text",
            config:     prep.config,
            orderIndex: prep.orderIdx,
          }).returning();
          propLookup.set(prep.name, { id: prop.id, type: prep.type, optionMap: prep.optionMap });
        }

        // 4. Create views
        let defaultViewId: string | null = null;

        for (let vi = 0; vi < schema.views.length; vi++) {
          const v     = schema.views[vi];
          const vtype = (["table", "board", "calendar", "gallery"].includes(v.type)
            ? v.type : "table") as "table" | "board" | "calendar" | "gallery";

          let groupByPropertyId:  string | null = null;
          let calendarPropertyId: string | null = null;

          if (vtype === "board" && v.groupBy) {
            groupByPropertyId = propLookup.get(v.groupBy)?.id ?? null;
          }
          if (vtype === "calendar") {
            const dateProp = schema.properties.find((p) => p.type === "date");
            if (dateProp) calendarPropertyId = propLookup.get(dateProp.name)?.id ?? null;
          }

          const [view] = await tx.insert(databaseViews).values({
            databaseId:         dbPage.id,
            name:               v.name,
            type:               vtype,
            orderIndex:         vi,
            groupByPropertyId,
            calendarPropertyId,
          }).returning();

          if (v.isDefault || vi === 0) defaultViewId = defaultViewId ?? view.id;
        }

        if (defaultViewId) {
          await tx.update(pages).set({ defaultViewId }).where(eq(pages.id, dbPage.id));
        }

        // 5. Create sample entries
        const titleKey   = titlePropName ?? schema.properties[0]?.name ?? "";
        const sampleRows = schema.sample_rows ?? [];

        for (let ri = 0; ri < sampleRows.length; ri++) {
          const row        = sampleRows[ri];
          const entryTitle = String(row[titleKey] ?? `Entry ${ri + 1}`);

          const [entry] = await tx
            .insert(pages)
            .values({
              shortId:      createId().slice(0, 10),
              workspaceId,
              parentId:     dbPage.id,
              databaseId:   dbPage.id,
              kind:         "entry",
              title:        entryTitle,
              orderIndex:   ri,
              createdBy:    session.user.id,
              lastEditedBy: session.user.id,
            })
            .returning();

          await insertPageWithClosure(tx, entry.id, dbPage.id);

          const valuesToInsert: { entryId: string; propertyId: string; value: unknown }[] = [];

          for (const [propName, { id: propId, type: propType, optionMap }] of propLookup) {
            const rawVal = row[propName];
            if (rawVal === undefined || rawVal === null || rawVal === "") continue;

            let value: unknown = null;

            switch (propType) {
              case "select": {
                const optId = optionMap.get(String(rawVal));
                if (optId) value = { optionId: optId };
                break;
              }
              case "multi_select": {
                const names  = String(rawVal).split(",").map((s) => s.trim()).filter(Boolean);
                const optIds = names.map((n) => optionMap.get(n)).filter(Boolean) as string[];
                if (optIds.length) value = { optionIds: optIds };
                break;
              }
              case "text":     value = { text:    String(rawVal) };                  break;
              case "number":   value = { number:  Number(rawVal) };                  break;
              case "date":     value = { date:    String(rawVal) };                  break;
              case "checkbox": value = { checked: rawVal === 1 || rawVal === "true" }; break;
              case "email":    value = { email:   String(rawVal) };                  break;
              case "url":      value = { url:     String(rawVal) };                  break;
              case "phone":    value = { phone:   String(rawVal) };                  break;
              // "person" skipped — no real user IDs in template data
            }

            if (value !== null) valuesToInsert.push({ entryId: entry.id, propertyId: propId, value });
          }

          if (valuesToInsert.length > 0) {
            await tx.insert(propertyValues).values(valuesToInsert);
          }
        }

        return dbPage;
      }

      // ── REGULAR PAGE TEMPLATE ──────────────────────────────────────────────
      const [page] = await tx
        .insert(pages)
        .values({
          shortId,
          workspaceId,
          parentId,
          kind:         "page",
          title:        snapshot.title || tpl.name,
          icon:         snapshot.icon ?? null,
          coverUrl:     snapshot.cover_url ?? null,
          isFullWidth:  snapshot.is_full_width ?? false,
          orderIndex,
          createdBy:    session.user.id,
          lastEditedBy: session.user.id,
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
            createdBy:     session.user.id,
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
          createdBy:     session.user.id,
        });
      }

      if (snapshot.subpages?.length) {
        for (let i = 0; i < snapshot.subpages.length; i++) {
          const sub    = snapshot.subpages[i];
          const [subPage] = await tx
            .insert(pages)
            .values({
              shortId:      createId().slice(0, 10),
              workspaceId,
              parentId:     page.id,
              kind:         "page",
              title:        sub.title || "Untitled",
              orderIndex:   i,
              createdBy:    session.user.id,
              lastEditedBy: session.user.id,
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
            createdBy:     session.user.id,
          });
        }
      }

      return page;
    });

    return Response.json({ shortId: newPage.shortId, id: newPage.id, kind: newPage.kind }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) return apiError(err.status, err.message);
    return apiError(500, "Internal server error");
  }
}
