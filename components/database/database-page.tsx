"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/pages/page-header";
import { DatabaseToolbar } from "@/components/database/toolbar";
import { FilterBar } from "@/components/database/filter-bar";
import { SortBar } from "@/components/database/sort-bar";
import { TableView } from "@/components/database/table-view";
import { BoardView } from "@/components/database/board-view";
import { CalendarView } from "@/components/database/calendar-view";
import { GalleryView } from "@/components/database/gallery-view";
import type {
  DbView, DbProperty, DbEntry, DbPropertyValue,
  FilterRule, SortRule, SharedViewProps, DbPropertyConfig,
} from "@/components/database/types";

interface DatabasePageProps {
  databaseId:    string;
  workspaceId:   string;
  workspaceSlug: string;
  isEditor:      boolean;
  initialTitle:  string | null;
  initialIcon:   string | null;
  isLocked:      boolean;
  isDeleted:     boolean;
  pageShortId:   string;
  inline?:       boolean;
}

export function DatabasePage({
  databaseId, workspaceId, workspaceSlug, isEditor,
  initialTitle, initialIcon, isLocked, isDeleted, pageShortId, inline = false,
}: DatabasePageProps) {
  const router = useRouter();
  const [views, setViews]               = useState<DbView[]>([]);
  const [properties, setProperties]     = useState<DbProperty[]>([]);
  const [entries, setEntries]           = useState<DbEntry[]>([]);
  const [rawValues, setRawValues]       = useState<DbPropertyValue[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [showSortBar, setShowSortBar]     = useState(false);

  // Search + selection
  const [searchQuery, setSearchQuery]     = useState("");
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const searchInputRef                    = useRef<HTMLInputElement>(null);

  // ── Derived state ─────────────────────────────────────────────────────────

  const valueMap = useMemo(() => {
    const m = new Map<string, Map<string, unknown>>();
    for (const v of rawValues) {
      if (!m.has(v.entryId)) m.set(v.entryId, new Map());
      m.get(v.entryId)!.set(v.propertyId, v.value);
    }
    return m;
  }, [rawValues]);

  const activeView = useMemo(
    () => views.find((v) => v.id === activeViewId) ?? views[0] ?? null,
    [views, activeViewId]
  );

  const displayedEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter((e) => (e.title ?? "").toLowerCase().includes(q));
  }, [entries, searchQuery]);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const loadDatabase = useCallback(async () => {
    const res = await fetch(`/api/databases/${databaseId}`);
    if (!res.ok) return;
    const data = await res.json() as { views: DbView[]; properties: DbProperty[] };
    setViews(data.views);
    setProperties(data.properties);
    return data;
  }, [databaseId]);

  const loadEntries = useCallback(async (viewId: string | null) => {
    const qs  = viewId ? `?viewId=${viewId}` : "";
    const res = await fetch(`/api/databases/${databaseId}/entries${qs}`);
    if (!res.ok) return;
    const data = await res.json() as { entries: DbEntry[]; propertyValues: DbPropertyValue[] };
    setEntries(data.entries);
    setRawValues(data.propertyValues);
  }, [databaseId]);

  useEffect(() => {
    setLoading(true);
    loadDatabase()
      .then((data) => {
        if (data?.views.length) {
          const firstId = data.views[0].id;
          setActiveViewId(firstId);
          return loadEntries(firstId);
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseId]);

  useEffect(() => {
    if (activeViewId) loadEntries(activeViewId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeViewId]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const editing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable;

      // Cmd/Ctrl+K → focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      // N → new entry (when not typing)
      if (e.key === "n" && !editing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        createEntry();
        return;
      }
      // Escape → clear selection
      if (e.key === "Escape" && selectedIds.size > 0) {
        setSelectedIds(new Set());
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  // Lock parent <main> scroll when calendar view is active.
  useEffect(() => {
    const mainEl = document.querySelector<HTMLElement>("main");
    if (!mainEl) return;
    if (activeView?.type === "calendar") {
      mainEl.style.setProperty("overflow", "hidden", "important");
      return () => { mainEl.style.removeProperty("overflow"); };
    } else {
      mainEl.style.removeProperty("overflow");
    }
  }, [activeView?.type]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const updateValue = useCallback(async (entryId: string, propId: string, value: unknown) => {
    setRawValues((prev) => {
      const hit = prev.findIndex((v) => v.entryId === entryId && v.propertyId === propId);
      if (hit >= 0) return prev.map((v, i) => i === hit ? { ...v, value } : v);
      return [...prev, { id: crypto.randomUUID(), entryId, propertyId: propId, value, createdAt: "", updatedAt: "" }];
    });
    await fetch(`/api/entries/${entryId}/property-values/${propId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
  }, []);

  const updateTitle = useCallback(async (entryId: string, title: string) => {
    setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, title } : e));
    await fetch(`/api/pages/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  }, []);

  const updateEntryIcon = useCallback(async (entryId: string, icon: string) => {
    setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, icon } : e));
    await fetch(`/api/pages/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ icon }),
    });
  }, []);

  const createEntry = useCallback(async (defaultValues?: Record<string, unknown>) => {
    const res = await fetch(`/api/databases/${databaseId}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", defaultValues }),
    });
    if (!res.ok) return;
    const { propertyValues: insertedValues, ...entry } = await res.json() as DbEntry & { propertyValues: { entryId: string; propertyId: string; value: unknown }[] };
    setEntries((prev) => [...prev, entry]);

    // Mirrors EVERY value the server actually wrote — not just what this
    // caller happened to pass in — so a server-computed default (e.g. a
    // grouped Status property falling back to "Not started") shows up
    // immediately instead of only appearing after the next full refetch.
    if (insertedValues.length > 0) {
      setRawValues((prev) => [
        ...prev,
        ...insertedValues.map((v) => ({
          id: crypto.randomUUID(),
          entryId: v.entryId,
          propertyId: v.propertyId,
          value: v.value,
          createdAt: "",
          updatedAt: "",
        } as DbPropertyValue)),
      ]);
    }

    return entry;
  }, [databaseId]);

  const deleteEntry = useCallback(async (entryId: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    setRawValues((prev) => prev.filter((v) => v.entryId !== entryId));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(entryId); return next; });
    await fetch(`/api/pages/${entryId}`, { method: "DELETE" });
  }, []);

  const duplicateEntry = useCallback(async (entryId: string) => {
    const res = await fetch(`/api/pages/${entryId}/duplicate`, { method: "POST" });
    if (!res.ok) return;
    const dup = await res.json() as DbEntry;
    setEntries((prev) => [...prev, dup]);
    const dupValues = rawValues
      .filter((v) => v.entryId === entryId)
      .map((v) => ({ ...v, id: crypto.randomUUID(), entryId: dup.id }));
    if (dupValues.length) setRawValues((prev) => [...prev, ...dupValues]);
  }, [rawValues]);

  const bulkDelete = useCallback(async () => {
    const ids = [...selectedIds];
    setEntries((prev) => prev.filter((e) => !selectedIds.has(e.id)));
    setRawValues((prev) => prev.filter((v) => !selectedIds.has(v.entryId)));
    setSelectedIds(new Set());
    await Promise.all(ids.map((id) => fetch(`/api/pages/${id}`, { method: "DELETE" })));
  }, [selectedIds]);

  const addProperty = useCallback(async (name: string, type: string, config?: DbPropertyConfig) => {
    const res = await fetch(`/api/databases/${databaseId}/properties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, config }),
    });
    if (!res.ok) return;
    const prop = await res.json() as DbProperty;
    setProperties((prev) => [...prev, prop]);
    return prop;
  }, [databaseId]);

  const updateProperty = useCallback(async (propId: string, patch: Record<string, unknown>) => {
    setProperties((prev) => prev.map((p) => p.id === propId ? { ...p, ...patch } as DbProperty : p));
    await fetch(`/api/databases/${databaseId}/properties/${propId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }, [databaseId]);

  const deleteProperty = useCallback(async (propId: string) => {
    const res = await fetch(`/api/databases/${databaseId}/properties/${propId}`, { method: "DELETE" });
    if (!res.ok) return;
    setProperties((prev) => prev.filter((p) => p.id !== propId));
    setRawValues((prev) => prev.filter((v) => v.propertyId !== propId));
  }, [databaseId]);

  const addView = useCallback(async (name: string, type: string) => {
    const res = await fetch(`/api/databases/${databaseId}/views`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });
    if (!res.ok) return;
    const view = await res.json() as DbView;
    setViews((prev) => [...prev, view]);
    setActiveViewId(view.id);
  }, [databaseId]);

  const updateView = useCallback(async (viewId: string, patch: Record<string, unknown>) => {
    setViews((prev) => prev.map((v) => v.id === viewId ? { ...v, ...patch } as DbView : v));
    await fetch(`/api/databases/${databaseId}/views/${viewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }, [databaseId]);

  const duplicateView = useCallback(async (viewId: string) => {
    const src = views.find((v) => v.id === viewId);
    if (!src) return;
    const res = await fetch(`/api/databases/${databaseId}/views`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:               `${src.name} (copy)`,
        type:               src.type,
        filters:            src.filters,
        sorts:              src.sorts,
        filterLogic:        src.filterLogic,
        groupByPropertyId:  src.groupByPropertyId,
        calendarPropertyId: src.calendarPropertyId,
        cardDisplayProps:   src.cardDisplayProps,
        galleryCardSize:    src.galleryCardSize,
        entryOpenMode:      src.entryOpenMode,
      }),
    });
    if (!res.ok) return;
    const copy = await res.json() as DbView;
    setViews((prev) => [...prev, copy]);
    setActiveViewId(copy.id);
  }, [databaseId, views]);

  const deleteView = useCallback(async (viewId: string) => {
    if (views.length <= 1) return;
    const res = await fetch(`/api/databases/${databaseId}/views/${viewId}`, { method: "DELETE" });
    if (!res.ok) return;
    const remaining = views.filter((v) => v.id !== viewId);
    setViews(remaining);
    if (activeViewId === viewId) setActiveViewId(remaining[0]?.id ?? null);
  }, [databaseId, views, activeViewId]);

  const selectEntry = useCallback((entryId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(entryId);
      else next.delete(entryId);
      return next;
    });
  }, []);

  // ── Shared view props ─────────────────────────────────────────────────────

  const openEntry = useCallback((entry: DbEntry) => {
    router.push(`/app/${workspaceSlug}/${entry.shortId}`);
  }, [router, workspaceSlug]);

  const sharedViewProps: SharedViewProps = {
    databaseId,
    workspaceId,
    workspaceSlug,
    entries: displayedEntries,
    properties,
    valueMap,
    activeView,
    isEditor,
    selectedEntryIds: selectedIds,
    onUpdateValue:    updateValue,
    onUpdateTitle:    updateTitle,
    onCreateEntry:    createEntry,
    onAddProperty:    addProperty,
    onUpdateProperty: updateProperty,
    onDeleteProperty: deleteProperty,
    onUpdateView:     (patch) => activeView ? updateView(activeView.id, patch) : Promise.resolve(),
    onDeleteEntry:    deleteEntry,
    onDuplicateEntry: duplicateEntry,
    onSelectEntry:    selectEntry,
    onOpenEntry:      openEntry,
    onUpdateEntryIcon: updateEntryIcon,
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col">
        <div className="shrink-0">
          <div className="px-4 pt-6 pb-4 sm:px-8 sm:pt-8 lg:px-16 lg:pt-10 lg:pb-6">
            <div className="mb-3 h-10 w-64 animate-pulse rounded-[var(--radius-md)] bg-muted/50" />
            <div className="h-4 w-40 animate-pulse rounded-[var(--radius-sm)] bg-muted/30" />
          </div>
        </div>
        <div className="h-11 shrink-0 animate-pulse border-y border-border bg-muted/10" />
        <div className="flex-1">
          <div className="px-4 pt-3 sm:px-8 lg:px-16 lg:pt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="mb-0.5 h-11 animate-pulse rounded-[var(--radius-sm)] bg-muted/20"
                style={{ animationDelay: `${i * 50}ms`, opacity: 1 - i * 0.1 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col overflow-hidden bg-background isolate">

      {/* ── Page title / icon (hidden in inline/embedded mode) ── */}
      {!inline && (
        <div className="shrink-0 group/page">
          <div className="px-4 pt-6 pb-2 sm:px-8 sm:pt-8 lg:px-16 lg:pt-10 lg:pb-3">
            <PageHeader
              pageId={databaseId}
              shortId={pageShortId}
              initialTitle={initialTitle ?? ""}
              initialIcon={initialIcon}
              isLocked={isLocked}
              isDeleted={isDeleted}
              isEditor={isEditor}
              workspaceSlug={workspaceSlug}
              workspaceId={workspaceId}
              fontFamily="default"
              isSmallText={false}
              isFullWidth
            />
          </div>
        </div>
      )}


      {/* ── Toolbar ── */}
      <DatabaseToolbar
        views={views}
        activeViewId={activeView?.id ?? null}
        properties={properties}
        activeView={activeView}
        isEditor={isEditor}
        onSwitchView={setActiveViewId}
        onAddView={addView}
        onDuplicateView={duplicateView}
        onDeleteView={deleteView}
        onUpdateView={updateView}
        showFilterBar={showFilterBar}
        showSortBar={showSortBar}
        onToggleFilterBar={() => { setShowFilterBar((v) => !v); setShowSortBar(false); }}
        onToggleSortBar={() => { setShowSortBar((v) => !v); setShowFilterBar(false); }}
        onCreateEntry={() => createEntry()}
        onAddProperty={addProperty}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchInputRef={searchInputRef}
        selectedCount={selectedIds.size}
        onBulkDelete={bulkDelete}
        onClearSelection={() => setSelectedIds(new Set())}
        totalEntries={displayedEntries.length}
        inline={inline}
      />

      {/* ── Filter bar ── */}
      {showFilterBar && activeView && (
        <FilterBar
          properties={properties}
          filters={(activeView.filters ?? []) as FilterRule[]}
          filterLogic={(activeView.filterLogic as "and" | "or") ?? "and"}
          onChange={(filters) => updateView(activeView.id, { filters })}
          onFilterLogicChange={(logic) => updateView(activeView.id, { filterLogic: logic })}
        />
      )}

      {/* ── Sort bar ── */}
      {showSortBar && activeView && (
        <SortBar
          properties={properties}
          sorts={(activeView.sorts ?? []) as SortRule[]}
          onChange={(sorts) => updateView(activeView.id, { sorts })}
        />
      )}

      {/* ── View content ── */}
      <div className={`min-h-0 flex-1 ${activeView?.type === "calendar" ? "overflow-hidden" : activeView?.type === "table" ? "" : "overflow-y-auto overflow-x-hidden"}`}>
        <div className={activeView?.type === "calendar" || activeView?.type === "table" ? "h-full w-full" : "min-h-full w-full"}>
          {!activeView && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">No views configured.</p>
            </div>
          )}
          {activeView?.type === "table"    && <TableView    {...sharedViewProps} />}
          {activeView?.type === "board"    && <BoardView    {...sharedViewProps} />}
          {activeView?.type === "calendar" && <CalendarView {...sharedViewProps} />}
          {activeView?.type === "gallery"  && <GalleryView  {...sharedViewProps} />}
        </div>
      </div>

    </div>
  );
}
