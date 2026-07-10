import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { databaseProperties, databaseViews, pages, propertyValues, workspaceMembers } from "@/lib/db/schema";
import { createPageWithClosure } from "@/lib/pages/closure";
import { evaluateFormulaValue, runFormula, FormulaEvalError, type FormulaValue } from "@/lib/formula";

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

  // Rollup values are computed here, not stored — appended to `values` in the
  // same {id, entryId, propertyId, value} shape as a real row, so the client
  // builds its valueMap exactly the same way regardless of whether a value
  // came from the table or was just derived. Also folded into `valMap` itself
  // so anything below this point in the same request (filters, sorts) can
  // already see them once rollup filtering/sorting is added.
  const rollupValues = await computeRollupValues(properties, valMap, entryIds);
  for (const rv of rollupValues) {
    if (!valMap.has(rv.entryId)) valMap.set(rv.entryId, new Map());
    valMap.get(rv.entryId)!.set(rv.propertyId, rv.value);
  }

  // Formulas are computed after Rollups are merged into valMap, so a formula
  // can reference a rollup property (prop("Total") where Total is a Rollup) —
  // matches Notion, where Formula 2.0 can read a related database's rolled-up
  // value directly.
  const formulaValues = computeFormulaValues(properties, valMap, entryIds);
  for (const fv of formulaValues) {
    if (!valMap.has(fv.entryId)) valMap.set(fv.entryId, new Map());
    valMap.get(fv.entryId)!.set(fv.propertyId, fv.value);
  }

  const computedValues = [...rollupValues, ...formulaValues];
  const allValues = [...values, ...computedValues.map((cv) => ({ id: `computed:${cv.propertyId}:${cv.entryId}`, entryId: cv.entryId, propertyId: cv.propertyId, value: cv.value, createdAt: new Date(0), updatedAt: new Date(0) }))];

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

  return Response.json({ entries: filtered, propertyValues: allValues });
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

  const { entry, insertedValues } = await db.transaction(async (tx) => {
    const newEntry = await createPageWithClosure(tx, {
      workspaceId: dbPage.workspaceId,
      title:       body.title ?? "",
      kind:        "entry",
      databaseId,
      parentId:    databaseId,
      createdBy:   session.user.id,
    });

    // Write default property values — always runs (not just when the caller
    // passed defaultValues), so e.g. a Status property still defaults to
    // "Not started" for a bare "+ New" click, not only for the calendar's
    // date-cell creation flow (the only caller that used to pass anything).
    const props = await tx
      .select()
      .from(databaseProperties)
      .where(eq(databaseProperties.databaseId, databaseId));

    const valuesToInsert = [];
    for (const prop of props) {
      let rawDefault = body.defaultValues?.[prop.id] ?? prop.defaultValue;
      // Status-style (grouped) select/multi-select properties have no
      // dedicated "default option" setting anywhere in the UI — fall back
      // to the first option in the "To-do" group, matching a fresh task's
      // real starting state ("Not started"). Scoped to grouped properties
      // only — an ordinary Select/Multi-select (e.g. "Channel") shouldn't
      // get a value pre-picked just because it happens to be first in the
      // list; only a genuine Status field has a meaningful "not started yet".
      const config = prop.config as { options?: { id: string; group?: string }[]; groupedByStatus?: boolean } | null;
      if (rawDefault == null && config?.groupedByStatus && (prop.type === "select" || prop.type === "status" || prop.type === "multi_select")) {
        const options = config.options ?? [];
        const first = options.find((o) => o.group === "todo") ?? options[0];
        if (first) rawDefault = prop.type === "multi_select" ? { optionIds: [first.id] } : { optionId: first.id };
      }
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

    return { entry: newEntry, insertedValues: valuesToInsert };
  });

  // Includes every value actually written (explicit defaultValues, a
  // property's own configured default, AND the grouped-Status fallback) —
  // callers must use this instead of echoing back just what they themselves
  // passed, or a server-computed default (like Status → "Not started")
  // would be saved but invisible in the UI until the next full refetch.
  return Response.json({ ...entry, propertyValues: insertedValues }, { status: 201 });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// A property value counts as "has a value" the same way hasDisplayValue()
// does client-side (components/database/board-view.tsx and friends) — kept
// independent since this runs server-side against raw JSONB, not a typed
// DbProperty, but the definition of "empty" must agree with the client's or
// "count values" would disagree with what a user sees filled in.
function hasRollupValue(raw: unknown): boolean {
  if (raw == null) return false;
  if (typeof raw !== "object") return true;
  return Object.values(raw as Record<string, unknown>).some((x) => {
    if (x == null || x === "" || x === false) return false;
    if (Array.isArray(x)) return x.length > 0;
    return true;
  });
}

function extractNumeric(targetType: string, raw: unknown): number | null {
  if (targetType !== "number") return null;
  const n = (raw as { number?: number | null } | null)?.number;
  return typeof n === "number" ? n : null;
}

function extractDateMs(targetType: string, raw: unknown): number | null {
  if (targetType !== "date") return null;
  const d = (raw as { date?: string | null } | null)?.date;
  if (!d) return null;
  const ms = new Date(d).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function formatRollup(
  aggregation: string,
  relatedIds: string[],
  targetType: string,
  targetValues: Map<string, unknown>,
): string {
  if (aggregation === "count") return String(relatedIds.length);

  const rawValues = relatedIds.map((id) => targetValues.get(id) ?? null);
  if (aggregation === "count_values") return String(rawValues.filter(hasRollupValue).length);

  if (targetType === "number") {
    const nums = rawValues.map((v) => extractNumeric(targetType, v)).filter((n): n is number => n != null);
    if (!nums.length) return "";
    if (aggregation === "sum") return String(nums.reduce((a, b) => a + b, 0));
    if (aggregation === "average") return String(Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100);
    if (aggregation === "min") return String(Math.min(...nums));
    if (aggregation === "max") return String(Math.max(...nums));
    if (aggregation === "range") return String(Math.max(...nums) - Math.min(...nums));
  }

  if (targetType === "date") {
    const dates = rawValues.map((v) => extractDateMs(targetType, v)).filter((n): n is number => n != null);
    if (!dates.length) return "";
    if (aggregation === "earliest") return new Date(Math.min(...dates)).toLocaleDateString();
    if (aggregation === "latest") return new Date(Math.max(...dates)).toLocaleDateString();
  }

  return "";
}

// Computed on every read, not cached/stored — a related entry's value
// changing takes effect immediately on the next fetch, with no invalidation
// logic needed, at the cost of a couple extra queries per rollup property per
// request. Fine at this app's scale (small teams, not enterprise-size
// databases); revisit with a cache if that stops being true.
async function computeRollupValues(
  properties: (typeof databaseProperties.$inferSelect)[],
  valMap: Map<string, Map<string, unknown>>,
  entryIds: string[],
): Promise<{ propertyId: string; entryId: string; value: { display: string | null } }[]> {
  const rollupProps = properties.filter((p) => p.type === "rollup");
  if (!rollupProps.length) return [];

  // Batch-fetch every target property's row once (they live on OTHER
  // databases — the relation's related database — so they're not in
  // `properties`, which only covers this database).
  const targetPropertyIds = [...new Set(
    rollupProps.map((p) => (p.config as { targetPropertyId?: string } | null)?.targetPropertyId).filter((id): id is string => !!id)
  )];
  const targetProps = targetPropertyIds.length
    ? await db.select().from(databaseProperties).where(inArray(databaseProperties.id, targetPropertyIds))
    : [];
  const targetPropMap = new Map(targetProps.map((p) => [p.id, p]));

  const results: { propertyId: string; entryId: string; value: { display: string | null } }[] = [];

  for (const rollupProp of rollupProps) {
    const config = rollupProp.config as { relationPropertyId?: string; targetPropertyId?: string; aggregation?: string } | null;
    const relationPropertyId = config?.relationPropertyId;
    const targetPropertyId = config?.targetPropertyId;
    const aggregation = config?.aggregation ?? "count";
    const targetProp = targetPropertyId ? targetPropMap.get(targetPropertyId) : undefined;
    if (!relationPropertyId || !targetPropertyId || !targetProp) continue;

    // Every entry id this database's entries reference through the relation,
    // collected once so the target-value fetch below is a single query
    // regardless of how many entries this database has.
    const allRelatedIds = new Set<string>();
    for (const propVals of valMap.values()) {
      const relVal = propVals.get(relationPropertyId) as { entryIds?: string[] } | null;
      for (const relId of relVal?.entryIds ?? []) allRelatedIds.add(relId);
    }

    let targetValues = new Map<string, unknown>();
    if (allRelatedIds.size) {
      const rows = await db.select().from(propertyValues).where(and(
        inArray(propertyValues.entryId, [...allRelatedIds]),
        eq(propertyValues.propertyId, targetPropertyId),
      ));
      targetValues = new Map(rows.map((r) => [r.entryId, r.value]));
    }

    // Every entry, not just ones with a valMap entry — an entry with zero
    // saved property values (a brand-new row) still has a real rollup result
    // (e.g. "Count all" is 0, not absent).
    for (const entryId of entryIds) {
      const relVal = valMap.get(entryId)?.get(relationPropertyId) as { entryIds?: string[] } | null;
      const relatedIds = relVal?.entryIds ?? [];
      const display = formatRollup(aggregation, relatedIds, targetProp.type, targetValues);
      results.push({ propertyId: rollupProp.id, entryId, value: { display: display || null } });
    }
  }

  return results;
}

// Converts a property's raw JSONB value into the native type a formula
// expression operates on. select/status/multi_select resolve to their
// option NAME(s), not the stored id, matching what a formula author actually
// sees and types (`prop("Priority") == "High"`, not an opaque id).
function rawToFormulaValue(prop: typeof databaseProperties.$inferSelect, raw: unknown): FormulaValue {
  const v = raw as Record<string, unknown> | null;
  switch (prop.type) {
    case "text": case "url": case "email": case "phone":
      return (v?.[prop.type] as string | undefined) ?? null;
    case "number":
      return (v?.number as number | null | undefined) ?? null;
    case "checkbox":
      return !!(v?.checked as boolean | undefined);
    case "date": {
      const d = v?.date as string | undefined;
      return d ? new Date(d) : null;
    }
    case "select":
    case "status": {
      const optId = v?.optionId as string | undefined;
      if (!optId) return null;
      const options = (prop.config as { options?: { id: string; name: string }[] } | null)?.options ?? [];
      return options.find((o) => o.id === optId)?.name ?? null;
    }
    case "multi_select": {
      const ids = (v?.optionIds as string[] | undefined) ?? [];
      const options = (prop.config as { options?: { id: string; name: string }[] } | null)?.options ?? [];
      return ids.map((id) => options.find((o) => o.id === id)?.name).filter(Boolean).join(", ") || null;
    }
    case "person": {
      const members = (v?._members as { name?: string; email?: string }[] | undefined) ?? [];
      return members.map((m) => m.name || m.email).filter(Boolean).join(", ") || null;
    }
    case "relation": {
      const ids = (v?.entryIds as string[] | undefined) ?? [];
      return ids.length;
    }
    case "rollup":
      // Already computed and merged into valMap before formulas run.
      return (v?.display as string | null | undefined) ?? null;
    default:
      return null;
  }
}

// `visiting` guards against a formula referencing itself (directly or via a
// cycle through other formulas) — without it, two formulas that reference
// each other would recurse until the stack overflows instead of failing with
// a clear "Circular reference" error.
function makeResolveProp(
  entryId: string,
  properties: (typeof databaseProperties.$inferSelect)[],
  valMap: Map<string, Map<string, unknown>>,
  visiting: Set<string>,
): (name: string) => FormulaValue {
  return (name: string) => {
    const prop = properties.find((p) => p.name === name);
    if (!prop) throw new FormulaEvalError(`Unknown property "${name}"`);

    if (prop.type === "formula") {
      if (visiting.has(prop.id)) throw new FormulaEvalError(`Circular reference through "${name}"`);
      const expression = (prop.config as { expression?: string } | null)?.expression ?? "";
      visiting.add(prop.id);
      try {
        const { value, error } = evaluateFormulaValue(expression, { resolveProp: makeResolveProp(entryId, properties, valMap, visiting) });
        if (error) throw new FormulaEvalError(error);
        return value;
      } finally {
        visiting.delete(prop.id);
      }
    }

    const raw = valMap.get(entryId)?.get(prop.id) ?? null;
    return rawToFormulaValue(prop, raw);
  };
}

function computeFormulaValues(
  properties: (typeof databaseProperties.$inferSelect)[],
  valMap: Map<string, Map<string, unknown>>,
  entryIds: string[],
): { propertyId: string; entryId: string; value: { display: string | null } }[] {
  const formulaProps = properties.filter((p) => p.type === "formula");
  if (!formulaProps.length) return [];

  const results: { propertyId: string; entryId: string; value: { display: string | null } }[] = [];
  for (const fp of formulaProps) {
    const expression = (fp.config as { expression?: string } | null)?.expression ?? "";
    for (const entryId of entryIds) {
      const { display, error } = runFormula(expression, { resolveProp: makeResolveProp(entryId, properties, valMap, new Set([fp.id])) });
      results.push({ propertyId: fp.id, entryId, value: { display: error ? null : display } });
    }
  }
  return results;
}

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
    case "select":
    case "status": {
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
