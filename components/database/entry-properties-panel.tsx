"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PROPERTY_REGISTRY } from "@/components/database/property-registry";
import { CellDisplay } from "@/components/database/cells/cell-display";
import { CellEditorPopover } from "@/components/database/cells/cell-editor";
import type { DbProperty, DbPropertyValue } from "@/components/database/types";

interface EntryPropertiesPanelProps {
  entryId:     string;
  databaseId:  string;
  workspaceId: string;
  isEditor:    boolean;
}

const INLINE_TYPES = new Set(["text", "number", "url", "email", "phone"]);
const POPOVER_TYPES = new Set(["select", "multi_select", "date", "person", "relation"]);

export function EntryPropertiesPanel({ entryId, databaseId, workspaceId, isEditor }: EntryPropertiesPanelProps) {
  const [properties, setProperties] = useState<DbProperty[]>([]);
  const [values, setValues]         = useState<Map<string, unknown>>(new Map());
  const [loading, setLoading]       = useState(true);

  // Inline editing (text/number/url/email/phone)
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editText, setEditText]     = useState("");
  const inputRef                    = useRef<HTMLInputElement>(null);

  // Popover editing (select/multi_select/date/person/relation)
  const [popover, setPopover]       = useState<{ propId: string; rect: DOMRect } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [propsRes, valsRes] = await Promise.all([
        fetch(`/api/databases/${databaseId}/properties`),
        fetch(`/api/entries/${entryId}/property-values`),
      ]);
      if (cancelled || !propsRes.ok || !valsRes.ok) { setLoading(false); return; }
      const props = await propsRes.json() as DbProperty[];
      const vals  = await valsRes.json() as DbPropertyValue[];
      const map   = new Map<string, unknown>();
      for (const v of vals) map.set(v.propertyId, v.value);
      setProperties(props);
      setValues(map);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [databaseId, entryId]);

  const saveValue = useCallback(async (propId: string, value: unknown) => {
    setValues((prev) => new Map(prev).set(propId, value));
    await fetch(`/api/entries/${entryId}/property-values/${propId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ value }),
    });
  }, [entryId]);

  const commitInline = useCallback((prop: DbProperty) => {
    const text = editText.trim();
    let value: unknown;
    if (prop.type === "number") {
      const n = parseFloat(text);
      value = { number: text === "" ? null : (isNaN(n) ? null : n) };
    } else if (prop.type === "url")   value = { url:   text };
    else if (prop.type === "email")   value = { email: text };
    else if (prop.type === "phone")   value = { phone: text };
    else                              value = { text };
    saveValue(prop.id, value);
    setEditingId(null);
  }, [editText, saveValue]);

  const visibleProps = properties.filter((p) => !p.isSystem && !p.isBackRelation);
  if (loading || !visibleProps.length) return null;

  const popoverProp = popover ? properties.find((p) => p.id === popover.propId) ?? null : null;

  return (
    <>
      <div className="mb-5 mt-3 space-y-0.5">
        {visibleProps.map((prop) => {
          const reg = PROPERTY_REGISTRY[prop.type as keyof typeof PROPERTY_REGISTRY];
          const val = values.get(prop.id) ?? null;
          const isEditing = editingId === prop.id;

          return (
            <div
              key={prop.id}
              className="group/row flex min-h-[32px] items-start gap-2 rounded-[var(--radius-sm)] px-1 py-0.5 hover:bg-muted/50"
            >
              {/* Label column */}
              <div className="flex w-[180px] shrink-0 items-center gap-2 pt-1">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border/60 bg-background text-xs font-semibold text-muted-foreground">
                  {reg?.icon ?? "·"}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {prop.name}
                </span>
              </div>

              {/* Value column */}
              <div className="min-w-0 flex-1 pt-0.5">

                {/* Checkbox — always visible toggle */}
                {prop.type === "checkbox" && (
                  <button
                    type="button"
                    disabled={!isEditor}
                    onClick={() => {
                      const checked = !((val as { checked?: boolean } | null)?.checked ?? false);
                      saveValue(prop.id, { checked });
                    }}
                    className="flex items-center"
                  >
                    {(val as { checked?: boolean } | null)?.checked ? (
                      <svg className="size-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                        <rect x="2" y="2" width="16" height="16" rx="4" />
                        <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    ) : (
                      <svg className="size-4 text-muted-foreground/30" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <rect x="2.5" y="2.5" width="15" height="15" rx="3.5" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Inline text input types */}
                {INLINE_TYPES.has(prop.type) && (
                  isEditing ? (
                    <input
                      ref={inputRef}
                      type={prop.type === "number" ? "text" : prop.type === "email" ? "email" : "text"}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => commitInline(prop)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); inputRef.current?.blur(); }
                        if (e.key === "Escape") { setEditingId(null); }
                      }}
                      className="w-full rounded border-none bg-transparent text-sm text-foreground outline-none ring-0 focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      disabled={!isEditor}
                      onClick={() => {
                        const cur = (() => {
                          if (!val) return "";
                          const v = val as Record<string, unknown>;
                          return String(v[prop.type] ?? v.text ?? "");
                        })();
                        setEditText(cur);
                        setEditingId(prop.id);
                      }}
                      className="flex min-h-[22px] w-full items-center text-left disabled:cursor-default"
                    >
                      {val && <CellDisplay property={prop} value={val} />}
                      {!val && (
                        <span className="text-sm text-muted-foreground/40 opacity-0 transition-opacity group-hover/row:opacity-100">
                          Empty
                        </span>
                      )}
                    </button>
                  )
                )}

                {/* Popover types: select / multi_select / date / person / relation */}
                {POPOVER_TYPES.has(prop.type) && (
                  <button
                    type="button"
                    disabled={!isEditor}
                    onClick={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setPopover({ propId: prop.id, rect });
                    }}
                    className="flex min-h-[22px] w-full items-center gap-1 text-left disabled:cursor-default"
                  >
                    {val && <CellDisplay property={prop} value={val} />}
                    {!val && (
                      <span className="text-sm text-muted-foreground/40 opacity-0 transition-opacity group-hover/row:opacity-100">
                        Empty
                      </span>
                    )}
                  </button>
                )}

              </div>
            </div>
          );
        })}
      </div>

      {/* Popover editor */}
      {popover && popoverProp && (
        <CellEditorPopover
          property={popoverProp}
          value={values.get(popover.propId) ?? null}
          cellRect={popover.rect}
          workspaceId={workspaceId}
          onSave={(v) => { saveValue(popover.propId, v); setPopover(null); }}
          onClose={() => setPopover(null)}
        />
      )}
    </>
  );
}
