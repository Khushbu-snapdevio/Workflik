import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { databaseProperties, databaseViews, pages, propertyValues, workspaceMembers } from "@/lib/db/schema";
import { createPageWithClosure } from "@/lib/pages/closure";

type SortRule   = { propertyId: string; direction: "asc" | "desc" };
type FilterRule = { propertyId: string; operator: string; value: unknown };

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: databaseId } = await params;
  const session = await requireSession();

  const [dbPage] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, databaseId), eq(pages.kind, "database")))
    .limit(1);
  if (!dbPage) return Response.json({ error: "not_found" }, { status: 404 });

  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, dbPage.workspaceId), eq(workspaceMembers.userId, session.user.id)))
    .limit(1);
  if (!member) return Response.json({ error: "forbidden" }, { status: 403 });

  const url      = new URL(req.url);
  const viewId   = url.searchParams.get("viewId");

  // Load active view config for filters + sorts
  let sorts:        SortRule[]   = [];
  let filters:      FilterRule[] = [];
  let filterLogic:  "and" | "or" = "and";
  if (viewId) {
    const [view] = await db.select().from(databaseViews).where(eq(databaseViews.id, viewId)).limit(1);
    if (view) {
      sorts        = (view.sorts   as SortRule[])   ?? [];
      filters      = (view.filters as FilterRule[]) ?? [];
      filterLogic  = (view.filterLogic as "and" | "or") ?? "and";
    }
  }

  // Load all entries (not deleted)
  const entries = await db
    .select()
    .from(pages)
    .where(and(eq(pages.databaseId, databaseId), eq(pages.kind, "entry"), eq(pages.isDeleted, false)))
    .orderBy(asc(pages.createdAt));

  if (!entries.length) return Response.json({ entries: [], propertyValues: [] });

  const entryIds = entries.map((e) => e.id);

  // Load all property values for these entries
  const values = await db
    .select()
    .from(propertyValues)
    .where(inArray(propertyValues.entryId, entryIds));

  // Apply AND filters in JS (SQL-level would require dynamic query building)
  const properties = await db
    .select()
    .from(databaseProperties)
    .where(eq(databaseProperties.databaseId, databaseId));

  const propMap = new Map(properties.map((p) => [p.id, p]));
  const valMap  = new Map<string, Map<string, unknown>>();
  for (const v of values) {
    if (!valMap.has(v.entryId)) valMap.set(v.entryId, new Map());
    valMap.get(v.entryId)!.set(v.propertyId, v.value);
  }

  let filtered = entries;
  if (filters.length > 0) {
    filtered = entries.filter((entry) => {
      const results = filters.map((rule) => {
        const prop = propMap.get(rule.propertyId);
        if (!prop) return true;
        const val = valMap.get(entry.id)?.get(rule.propertyId);
        return evaluateFilter(prop.type, val, rule.operator, rule.value);
      });
      return filterLogic === "or"
        ? results.some(Boolean)
        : results.every(Boolean);
    });
  }

  // Apply sorts — title sort uses pages.title; property sort uses property_values
  if (sorts.length) {
    filtered.sort((a, b) => {
      for (const rule of sorts) {
        if (rule.propertyId === "__title__") {
          const cmp = (a.title ?? "").localeCompare(b.title ?? "");
          if (cmp !== 0) return rule.direction === "asc" ? cmp : -cmp;
          continue;
        }
        const va = valMap.get(a.id)?.get(rule.propertyId);
        const vb = valMap.get(b.id)?.get(rule.propertyId);
        const cmp = compareValues(va, vb);
        if (cmp !== 0) return rule.direction === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  }

  return Response.json({ entries: filtered, propertyValues: values });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: databaseId } = await params;
  const session = await requireSession();

  const [dbPage] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, databaseId), eq(pages.kind, "database")))
    .limit(1);
  if (!dbPage) return Response.json({ error: "not_found" }, { status: 404 });

  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, dbPage.workspaceId), eq(workspaceMembers.userId, session.user.id)))
    .limit(1);
  if (!member || member.role === "viewer") return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json() as { title?: string; defaultValues?: Record<string, unknown> };

  const entry = await db.transaction(async (tx) => {
    const newEntry = await createPageWithClosure(tx, {
      workspaceId: dbPage.workspaceId,
      title:       body.title ?? "",
      kind:        "entry",
      databaseId,
      parentId:    databaseId,
      createdBy:   session.user.id,
    });

    // Write default property values if provided
    if (body.defaultValues) {
      const props = await tx
        .select()
        .from(databaseProperties)
        .where(eq(databaseProperties.databaseId, databaseId));

      const valuesToInsert = [];
      for (const prop of props) {
        const rawDefault = body.defaultValues[prop.id] ?? prop.defaultValue;
        if (rawDefault == null) continue;
        // Resolve @me for Person type
        let resolved = rawDefault;
        if (prop.type === "person" && resolved === "@me") {
          resolved = { userIds: [session.user.id] };
        }
        valuesToInsert.push({ entryId: newEntry.id, propertyId: prop.id, value: resolved });
      }
      if (valuesToInsert.length) {
        await tx.insert(propertyValues).values(valuesToInsert);
      }
    }

    return newEntry;
  });

  return Response.json(entry, { status: 201 });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function evaluateFilter(type: string, val: unknown, op: string, filterVal: unknown): boolean {
  if (op === "is_empty")     return val == null || (typeof val === "object" && !Object.keys(val as object).length);
  if (op === "is_not_empty") return val != null;

  const v = val as Record<string, unknown> | null;

  switch (type) {
    case "text":
    case "url":
    case "email":
    case "phone": {
      const text = (v as { text?: string; url?: string; email?: string; phone?: string } | null)?.[type] ?? "";
      const fv   = String(filterVal ?? "").toLowerCase();
      const tv   = text.toLowerCase();
      if (op === "contains")         return tv.includes(fv);
      if (op === "not_contains")     return !tv.includes(fv);
      if (op === "is")               return tv === fv;
      if (op === "is_not")           return tv !== fv;
      if (op === "starts_with")      return tv.startsWith(fv);
      if (op === "ends_with")        return tv.endsWith(fv);
      break;
    }
    case "number": {
      const n  = (v as { number?: number } | null)?.number ?? null;
      const fv = Number(filterVal);
      if (n == null) return false;
      if (op === "=")  return n === fv;
      if (op === "!=") return n !== fv;
      if (op === "<")  return n < fv;
      if (op === ">")  return n > fv;
      if (op === "<=") return n <= fv;
      if (op === ">=") return n >= fv;
      break;
    }
    case "select": {
      const id = (v as { optionId?: string } | null)?.optionId ?? null;
      if (op === "is")         return id === filterVal;
      if (op === "is_not")     return id !== filterVal;
      if (op === "is_any_of")  return Array.isArray(filterVal) && filterVal.includes(id);
      if (op === "is_none_of") return Array.isArray(filterVal) && !filterVal.includes(id);
      break;
    }
    case "checkbox": {
      const checked = (v as { checked?: boolean } | null)?.checked ?? false;
      if (op === "is_checked")     return checked === true;
      if (op === "is_not_checked") return checked !== true;
      break;
    }
    case "date": {
      const date = (v as { date?: string } | null)?.date ?? null;
      if (!date) return false;
      const d  = new Date(date).getTime();
      const fv = new Date(String(filterVal)).getTime();
      if (op === "is")        return d === fv;
      if (op === "is_before") return d < fv;
      if (op === "is_after")  return d > fv;
      break;
    }
  }
  return true;
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const sa = String(JSON.stringify(a)).toLowerCase();
  const sb = String(JSON.stringify(b)).toLowerCase();
  return sa.localeCompare(sb);
}
