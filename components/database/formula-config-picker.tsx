"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, AlertCircle } from "lucide-react";
import { tryParseFormula, evaluateFormulaValue, formatFormulaValue, type FormulaValue } from "@/lib/formula";
import { getClampedLeft, getClampedTop } from "@/lib/ui/clamp-to-viewport";
import type { DbProperty } from "@/components/database/types";

interface FormulaConfigPickerProps {
  rect: DOMRect;
  databaseId: string;
  properties: DbProperty[];
  onBack: () => void;
  onClose: () => void;
  onPick: (expression: string) => void;
}

// Mirrors app/api/databases/[id]/entries/route.ts's rawToFormulaValue — kept
// independent since this is a client-side live preview against one sample
// entry, not the real per-request computation; formula/rollup properties
// reuse the server's already-computed `.display` string rather than
// re-evaluating (avoids duplicating the circular-reference machinery here).
function rawToFormulaValue(prop: DbProperty, raw: unknown): FormulaValue {
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
      const options = (prop.config?.options ?? []) as { id: string; name: string }[];
      return options.find((o) => o.id === optId)?.name ?? null;
    }
    case "multi_select": {
      const ids = (v?.optionIds as string[] | undefined) ?? [];
      const options = (prop.config?.options ?? []) as { id: string; name: string }[];
      return ids.map((id) => options.find((o) => o.id === id)?.name).filter(Boolean).join(", ") || null;
    }
    case "person": {
      const members = (v?._members as { name?: string; email?: string }[] | undefined) ?? [];
      return members.map((m) => m.name || m.email).filter(Boolean).join(", ") || null;
    }
    case "relation":
      return ((v?.entryIds as string[] | undefined) ?? []).length;
    case "rollup": case "formula":
      return (v?.display as string | null | undefined) ?? null;
    default:
      return null;
  }
}

// Mirrors lib/databases/compute-values.ts's rawToCount — see rawToFormulaValue
// above for why this file keeps its own copy instead of importing the server
// version.
function rawToCount(prop: DbProperty, raw: unknown): number {
  const v = raw as Record<string, unknown> | null;
  switch (prop.type) {
    case "person":
      return ((v?._members as unknown[] | undefined) ?? []).length;
    case "multi_select":
      return ((v?.optionIds as unknown[] | undefined) ?? []).length;
    case "relation":
      return ((v?.entryIds as unknown[] | undefined) ?? []).length;
    default:
      throw new Error(`count() doesn't work on "${prop.name}" — only Person, Multi-select, and Relation properties have a count.`);
  }
}

export function FormulaConfigPicker({ rect, databaseId, properties, onBack, onClose, onPick }: FormulaConfigPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [expression, setExpression] = useState("");
  const [sampleEntry, setSampleEntry] = useState<{ id: string; values: Map<string, unknown> } | null>(null);

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  useEffect(() => {
    fetch(`/api/databases/${databaseId}/entries`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { entries: { id: string }[]; propertyValues: { entryId: string; propertyId: string; value: unknown }[] } | null) => {
        if (!data?.entries?.length) return;
        const first = data.entries[0];
        const values = new Map<string, unknown>();
        for (const v of data.propertyValues) if (v.entryId === first.id) values.set(v.propertyId, v.value);
        setSampleEntry({ id: first.id, values });
      })
      .catch(() => {});
  }, [databaseId]);

  const { ast, error: parseError } = useMemo(() => tryParseFormula(expression), [expression]);

  const preview = useMemo(() => {
    if (!expression.trim()) return { display: "", error: null as string | null };
    if (parseError) return { display: "", error: parseError };
    if (!ast) return { display: "", error: null };
    if (!sampleEntry) return { display: "", error: null };
    const { value, error } = evaluateFormulaValue(expression, {
      resolveProp: (name) => {
        const prop = properties.find((p) => p.name === name);
        if (!prop) throw new Error(`Unknown property "${name}"`);
        return rawToFormulaValue(prop, sampleEntry.values.get(prop.id) ?? null);
      },
      resolveCount: (name) => {
        const prop = properties.find((p) => p.name === name);
        if (!prop) throw new Error(`Unknown property "${name}"`);
        return rawToCount(prop, sampleEntry.values.get(prop.id) ?? null);
      },
    });
    if (error) return { display: "", error };
    return { display: formatFormulaValue(value), error: null };
  }, [expression, ast, parseError, sampleEntry, properties]);

  function insertPropRef(name: string) {
    const ta = textareaRef.current;
    const snippet = `prop("${name}")`;
    if (!ta) { setExpression((e) => e + snippet); return; }
    const start = ta.selectionStart ?? expression.length;
    const end = ta.selectionEnd ?? expression.length;
    const next = expression.slice(0, start) + snippet + expression.slice(end);
    setExpression(next);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + snippet.length, start + snippet.length); });
  }

  const width = 320;
  const height = 420;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      data-edit-property-exempt
      style={{ position: "fixed", top: getClampedTop(rect, height), left: getClampedLeft(rect, width, { align: "end" }), zIndex: 500, width }}
      className="flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-border bg-background"
    >
      <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-2">
        <button type="button" onClick={onBack} className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-muted-foreground hover:bg-accent">
          <ArrowLeft size={13} />
        </button>
        <p className="text-xs font-semibold text-foreground/80">Edit formula</p>
      </div>

      <div className="flex flex-col gap-2 p-2.5">
        <textarea
          ref={textareaRef}
          autoFocus
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder='e.g. if(prop("Status") == "Done", "✅", "")'
          rows={4}
          className="w-full resize-none rounded-[var(--radius-sm)] border border-border bg-muted/20 px-2.5 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground-subtle focus:border-primary/40 focus:outline-none"
        />

        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground-subtle">Insert property</p>
          <div className="flex flex-wrap gap-1">
            {properties.filter((p) => !p.isSystem).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => insertPropRef(p.name)}
                className="rounded-[var(--radius-xs)] border border-border bg-muted/30 px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[var(--radius-sm)] border border-border bg-muted/20 px-2.5 py-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground-subtle">Preview</p>
          {preview.error ? (
            <p className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              {preview.error}
            </p>
          ) : (
            <p className="truncate text-sm text-foreground">{preview.display || <span className="text-muted-foreground-subtle">—</span>}</p>
          )}
        </div>

        <button
          type="button"
          disabled={!expression.trim() || !!parseError}
          onClick={() => onPick(expression.trim())}
          className="flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check size={12} />
          Save formula
        </button>
      </div>
    </div>,
    document.body,
  );
}
