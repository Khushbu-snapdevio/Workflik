"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, ArrowSquareOut, SquaresFour, X, Trash } from "@phosphor-icons/react";
import { OPTION_COLORS, getOptionColor } from "@/components/database/property-registry";
import { CellDisplay } from "@/components/database/cells/cell-display";
import type { SharedViewProps, DbEntry, DbProperty, SelectOption } from "@/components/database/types";

// ── helpers ───────────────────────────────────────────────────────────────────

function hasDisplayValue(prop: DbProperty, raw: unknown): boolean {
  const v = raw as Record<string, unknown> | null;
  switch (prop.type) {
    case "text":         return !!(v as { text?: string } | null)?.text;
    case "number":       return (v as { number?: number | null } | null)?.number != null;
    case "select":       return !!(v as { optionId?: string } | null)?.optionId;
    case "multi_select": return ((v as { optionIds?: string[] } | null)?.optionIds ?? []).length > 0;
    case "date":         return !!(v as { date?: string } | null)?.date;
    case "checkbox":     return !!(v as { checked?: boolean } | null)?.checked;
    case "url":          return !!(v as { url?: string } | null)?.url;
    case "email":        return !!(v as { email?: string } | null)?.email;
    case "phone":        return !!(v as { phone?: string } | null)?.phone;
    case "person":       return ((v as { userIds?: string[] } | null)?.userIds ?? []).length > 0;
    case "relation":     return ((v as { entryIds?: string[] } | null)?.entryIds ?? []).length > 0;
    default:             return false;
  }
}

// Page icon — simple doc shape (no rx so it doesn't look like a checkbox)
function PageIcon() {
  return (
    <svg viewBox="0 0 12 14" width="10" height="12" fill="none" stroke="currentColor" strokeWidth={1.3} className="text-muted-foreground/25">
      <path d="M1.5 1.5h6l2.5 2.5V12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-10.5a.5.5 0 0 1 .5-.5z"/>
      <path d="M7.5 1.5V4H10"/>
      <line x1="3" y1="6.5" x2="9" y2="6.5"/>
      <line x1="3" y1="8.5" x2="7" y2="8.5"/>
    </svg>
  );
}

// ── BoardView ─────────────────────────────────────────────────────────────────

export function BoardView({
  workspaceSlug, entries, properties, valueMap, activeView, isEditor,
  onUpdateValue, onCreateEntry, onUpdateProperty, onDeleteEntry, onOpenEntry,
}: SharedViewProps) {
  const [draggingId, setDraggingId]     = useState<string | null>(null);
  const [collapsed, setCollapsed]       = useState<Set<string>>(new Set());
  const [addingOption, setAddingOption] = useState(false);
  const [newOptName, setNewOptName]     = useState("");
  const [newOptColor, setNewOptColor]   = useState("blue");
  const addOptRef                       = useRef<HTMLDivElement>(null);
  const addOptInputRef                  = useRef<HTMLInputElement>(null);

  const groupPropId = activeView?.groupByPropertyId;
  const groupProp   = properties.find((p) => p.id === groupPropId && p.type === "select");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    function h(e: MouseEvent) {
      if (addOptRef.current && !addOptRef.current.contains(e.target as Node)) {
        setAddingOption(false);
        setNewOptName("");
      }
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!groupProp) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/40">
          <SquaresFour size={28} className="text-muted-foreground/40" weight="duotone" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-foreground">No group-by property</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Open the <strong>Group</strong> dropdown in the toolbar and pick a Select property to organise cards into columns.
          </p>
        </div>
      </div>
    );
  }

  const options: SelectOption[] = (groupProp.config?.options ?? []) as SelectOption[];

  const columns: { id: string | null; label: string; color: string; entries: DbEntry[] }[] = [
    { id: null, label: "No " + groupProp.name, color: "gray", entries: [] },
    ...options.map((o) => ({ id: o.id, label: o.name, color: o.color, entries: [] as DbEntry[] })),
  ];

  for (const entry of entries) {
    const val  = valueMap.get(entry.id)?.get(groupPropId!) as { optionId?: string } | null;
    const col  = columns.find((c) => c.id === (val?.optionId ?? null)) ?? columns[0];
    col.entries.push(entry);
  }

  const configuredCardPropIds = (activeView?.cardDisplayProps as string[] | undefined) ?? [];
  const cardProps = configuredCardPropIds.length > 0
    ? configuredCardPropIds.map((id) => properties.find((p) => p.id === id)).filter(Boolean) as typeof properties
    : properties.filter((p) => !p.isSystem && p.id !== groupPropId).slice(0, 4);
  const draggingEntry = draggingId ? entries.find((e) => e.id === draggingId) : null;

  function onDragStart({ active }: DragStartEvent) { setDraggingId(String(active.id)); }
  function onDragEnd({ active, over }: DragEndEvent) {
    setDraggingId(null);
    if (!over || active.id === over.id) return;
    const targetCol = columns.find((c) => (c.id ?? "no-group") === String(over.id))
      ?? columns.find((c) => c.entries.some((e) => e.id === String(over.id)));
    if (!targetCol) return;
    onUpdateValue(String(active.id), groupPropId!, targetCol.id === null ? { optionId: null } : { optionId: targetCol.id });
  }

  function handleAddOption() {
    const name = newOptName.trim();
    if (!name) return;
    const newOpt: SelectOption = { id: crypto.randomUUID(), name, color: newOptColor };
    const updated = [...options, newOpt];
    onUpdateProperty(groupProp!.id, { config: { ...groupProp!.config, options: updated } });
    setNewOptName("");
    setNewOptColor(OPTION_COLORS[(updated.length) % OPTION_COLORS.length].id);
    setTimeout(() => addOptInputRef.current?.focus(), 0);
  }

  const previewColor = getOptionColor(newOptColor);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex h-full gap-3 overflow-x-auto px-6 py-4">

        {/* ── Columns ── */}
        {columns.map((col) => {
          const color     = getOptionColor(col.color);
          const colKey    = col.id ?? "no-group";
          const isCollapsed = collapsed.has(colKey);

          function toggleCollapse() {
            setCollapsed((prev) => {
              const next = new Set(prev);
              if (next.has(colKey)) next.delete(colKey); else next.add(colKey);
              return next;
            });
          }

          return (
            <SortableContext
              key={colKey}
              id={colKey}
              items={col.entries.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <div
                className={`flex shrink-0 flex-col rounded-2xl border border-border/60 bg-muted/20 transition-all duration-200 ${isCollapsed ? "w-12" : "w-[272px]"}`}
                data-col-id={colKey}
              >
                {/* Column header */}
                {isCollapsed ? (
                  /* Collapsed: vertical pill showing label + count */
                  <button
                    onClick={toggleCollapse}
                    title={`Expand ${col.label}`}
                    className="flex h-full flex-col items-center gap-2 py-3"
                  >
                    {col.id ? (
                      <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${color.bg} ${color.text}`}>
                        {col.entries.length}
                      </span>
                    ) : (
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground/60">
                        {col.entries.length}
                      </span>
                    )}
                    <span
                      className="text-[11px] font-semibold text-muted-foreground/60"
                      style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}
                    >
                      {col.label}
                    </span>
                  </button>
                ) : (
                  <>
                    <div className="flex items-center gap-2 px-3 pb-2 pt-3">
                      {col.id ? (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${color.bg} ${color.text}`}>
                          <span className={`size-1.5 rounded-full ${color.dot}`} />
                          {col.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground/70">
                          <span className="size-1.5 rounded-full bg-muted-foreground/30" />
                          {col.label}
                        </span>
                      )}
                      <span className="flex size-5 items-center justify-center rounded-full bg-background text-[10px] font-semibold text-muted-foreground/50 shadow-sm">
                        {col.entries.length}
                      </span>
                      <button
                        onClick={toggleCollapse}
                        title="Collapse column"
                        className="ml-auto flex size-6 items-center justify-center rounded-lg text-muted-foreground/30 transition-colors hover:bg-accent hover:text-muted-foreground"
                      >
                        <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
                          <path d="M2 2h3M2 6h3M2 10h3M8 3l2 3-2 3"/>
                        </svg>
                      </button>
                    </div>

                    {/* Cards */}
                    <div className="flex flex-col gap-2 px-2 pb-1">
                      {col.entries.map((entry) => (
                        <SortableCard
                          key={entry.id}
                          entry={entry}
                          cardProps={cardProps}
                          valueMap={valueMap}
                          workspaceSlug={workspaceSlug}
                          isDragging={draggingId === entry.id}
                          isEditor={isEditor}
                          onDeleteEntry={onDeleteEntry}
                          onOpenEntry={onOpenEntry}
                          entryOpenMode={activeView?.entryOpenMode ?? "side_panel"}
                        />
                      ))}

                      {col.entries.length === 0 && (
                        <div className="flex h-14 items-center justify-center rounded-xl border-2 border-dashed border-border/30">
                          <span className="text-[11px] text-muted-foreground/30">Drop cards here</span>
                        </div>
                      )}
                    </div>

                    {/* Add entry button */}
                    {isEditor && (
                      <button
                        onClick={() => {
                          const dv = col.id ? { [groupPropId!]: { optionId: col.id } } : {};
                          onCreateEntry(dv);
                        }}
                        className="group mx-2 mb-2 mt-1 flex h-8 items-center gap-1.5 rounded-xl px-2 text-[12px] text-muted-foreground/40 transition-colors hover:bg-accent hover:text-muted-foreground"
                      >
                        <Plus size={13} className="transition-transform group-hover:scale-110" />
                        Add entry
                      </button>
                    )}
                  </>
                )}
              </div>
            </SortableContext>
          );
        })}

        {/* ── Add option column ── */}
        {isEditor && (
          <div ref={addOptRef} className="w-[272px] shrink-0">
            {!addingOption ? (
              <button
                onClick={() => {
                  setAddingOption(true);
                  setTimeout(() => addOptInputRef.current?.focus(), 50);
                }}
                className="flex h-10 w-full items-center gap-2 rounded-2xl border-2 border-dashed border-border/40 px-3 text-[12px] text-muted-foreground/40 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              >
                <Plus size={13} />
                Add option to &ldquo;{groupProp.name}&rdquo;
              </button>
            ) : (
              <div className="rounded-2xl border border-border bg-background p-3.5 shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                    New option
                  </p>
                  <button
                    onClick={() => { setAddingOption(false); setNewOptName(""); }}
                    className="flex size-5 items-center justify-center rounded text-muted-foreground/40 hover:bg-accent hover:text-muted-foreground"
                  >
                    <X size={11} />
                  </button>
                </div>

                <input
                  ref={addOptInputRef}
                  value={newOptName}
                  onChange={(e) => setNewOptName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddOption();
                    if (e.key === "Escape") { setAddingOption(false); setNewOptName(""); }
                  }}
                  placeholder="Option name…"
                  className="w-full rounded-lg border border-border bg-muted/30 px-2.5 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />

                <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                  Colour
                </p>
                <div className="flex flex-wrap gap-2">
                  {OPTION_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setNewOptColor(c.id)}
                      title={c.id}
                      className={[
                        `size-5 rounded-full transition-all ${c.dot}`,
                        newOptColor === c.id
                          ? "scale-125 ring-2 ring-offset-1 ring-primary/60"
                          : "opacity-50 hover:opacity-90 hover:scale-110",
                      ].join(" ")}
                    />
                  ))}
                </div>

                <div className="mt-3 flex min-h-[26px] items-center">
                  {newOptName.trim() ? (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${previewColor.bg} ${previewColor.text}`}>
                      <span className={`size-1.5 rounded-full ${previewColor.dot}`} />
                      {newOptName.trim()}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/30">Preview will appear here</span>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleAddOption}
                    disabled={!newOptName.trim()}
                    className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Add option
                  </button>
                  <button
                    onClick={() => { setAddingOption(false); setNewOptName(""); }}
                    className="rounded-lg border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-accent"
                  >
                    Cancel
                  </button>
                </div>

                {options.length > 0 && (
                  <div className="mt-3 border-t border-border/50 pt-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                      Existing options
                    </p>
                    <div className="flex flex-col gap-1">
                      {options.map((opt) => {
                        const c = getOptionColor(opt.color);
                        return (
                          <span
                            key={opt.id}
                            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${c.bg} ${c.text}`}
                          >
                            <span className={`size-1.5 rounded-full ${c.dot}`} />
                            {opt.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <DragOverlay>
        {draggingEntry && (
          <CardShell
            entry={draggingEntry}
            cardProps={cardProps}
            valueMap={valueMap}
            workspaceSlug={workspaceSlug}
            dragging
            isEditor={false}
            onDeleteEntry={onDeleteEntry}
            entryOpenMode={activeView?.entryOpenMode ?? "side_panel"}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
  entry: DbEntry;
  cardProps: SharedViewProps["properties"];
  valueMap: Map<string, Map<string, unknown>>;
  workspaceSlug: string;
  isEditor: boolean;
  onDeleteEntry: SharedViewProps["onDeleteEntry"];
  onOpenEntry?: SharedViewProps["onOpenEntry"];
  entryOpenMode?: "side_panel" | "full_page";
  isDragging?: boolean;
  dragging?: boolean;
}

function SortableCard(props: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.entry.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} data-no-dnd={props.entryOpenMode === "side_panel" ? "true" : undefined}>
      <CardShell {...props} />
    </div>
  );
}

function CardShell({ entry, cardProps, valueMap, workspaceSlug, dragging, isEditor, onDeleteEntry, onOpenEntry, entryOpenMode }: CardProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const filledProps = cardProps.filter((prop) =>
    hasDisplayValue(prop, valueMap.get(entry.id)?.get(prop.id) ?? null)
  );

  return (
    <div className={[
      "group/card rounded-xl border bg-background transition-all",
      confirming
        ? "border-red-200 dark:border-red-900/60"
        : dragging
          ? "border-primary/40 shadow-xl ring-2 ring-primary/20"
          : "border-border shadow-sm hover:shadow-md",
    ].join(" ")}>

      {/* ── Delete confirm state — replaces card body ── */}
      {confirming ? (
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/40">
            <Trash size={13} className="text-red-600 dark:text-red-400" />
          </div>
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground/70">
            {entry.title || "Untitled"}
          </span>
          <div className="flex shrink-0 gap-1.5">
            <button
              disabled={deleting}
              onClick={async (e) => {
                e.stopPropagation();
                setDeleting(true);
                await onDeleteEntry(entry.id);
                setDeleting(false);
                setConfirming(false);
              }}
              className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "…" : "Delete"}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
              className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {entry.coverUrl && (
            <div
              className="h-20 w-full rounded-t-xl bg-cover bg-center"
              style={{ backgroundImage: `url(${entry.coverUrl})` }}
            />
          )}

          <div className="p-3">
            {/* Title row */}
            <div className="flex items-start gap-2">
              {entry.icon ? (
                <span className="mt-0.5 shrink-0 text-[15px] leading-none">{entry.icon}</span>
              ) : (
                <span className="mt-0.5 shrink-0">
                  <PageIcon />
                </span>
              )}
              <button
                onClick={() => entryOpenMode === "side_panel" && onOpenEntry ? onOpenEntry(entry) : undefined}
                className={`min-w-0 flex-1 text-left text-[13px] font-semibold leading-snug text-foreground ${
                  entryOpenMode === "side_panel" && onOpenEntry ? "cursor-pointer hover:text-primary" : "cursor-default"
                }`}
              >
                {entry.title || <span className="font-normal text-muted-foreground/35">Untitled</span>}
              </button>

              {/* Action buttons — visible on hover */}
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/card:opacity-100">
                <Link
                  href={`/app/${workspaceSlug}/${entry.shortId}`}
                  onClick={(e) => e.stopPropagation()}
                  title="Open full page"
                  className="flex size-6 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-accent hover:text-muted-foreground"
                >
                  <ArrowSquareOut size={12} />
                </Link>
                {isEditor && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
                    title="Delete entry"
                    className="flex size-6 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                  >
                    <Trash size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Non-empty properties */}
            {filledProps.length > 0 && (
              <div className="mt-2.5 flex flex-col gap-1.5 border-t border-border/50 pt-2">
                {filledProps.map((prop) => {
                  const raw = valueMap.get(entry.id)?.get(prop.id) ?? null;
                  return (
                    <div key={prop.id} className="flex items-center gap-2">
                      <span className="w-[68px] shrink-0 truncate text-[10px] font-medium text-muted-foreground/50">
                        {prop.name}
                      </span>
                      <div className="min-w-0 flex-1">
                        <CellDisplay property={prop} value={raw} compact />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
