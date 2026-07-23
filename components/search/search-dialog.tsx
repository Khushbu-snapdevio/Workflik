"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { getClampedTop, getClampedLeft } from "@/lib/ui/clamp-to-viewport";
import {
 Search as MagnifyingGlassIcon,
 X as XIcon,
 Clock as ClockIcon,
 FileText as FileTextIcon,
 Database as DatabaseIcon,
 MessageCircle as ChatCircleIcon,
 ChevronRight as CaretRightIcon,
 CornerDownLeft as ArrowBendDownLeftIcon,
 ArrowUp as ArrowUpIcon,
 ArrowDown as ArrowDownIcon,
 ChevronDown,
 Check,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type SourceType = "page" | "entry" | "comment";

interface SearchResult {
 id:     string;
 sourceType: SourceType;
 sourceId:  string;
 title:   string;
 pageId:   string;
 shortId:  string;
 icon:    string | null;
 kind:    string;
 breadcrumb: string;
 updatedAt: string;
 rank:    number;
}

interface RecentPage {
 id:    string;
 pageId:  string;
 visitedAt: string;
 page?: {
  shortId: string;
  title:  string;
  icon:  string | null;
  kind:  string;
 };
}

type FilterType = "all" | "page" | "entry" | "comment";
type FilterDate = "any" | "24h" | "7d" | "30d";

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
 const diff = Date.now() - new Date(dateStr).getTime();
 const mins = Math.floor(diff / 60000);
 const hours = Math.floor(diff / 3600000);
 const days = Math.floor(diff / 86400000);
 if (mins < 1) return "Just now";
 if (mins < 60) return `${mins}m ago`;
 if (hours < 24) return `${hours}h ago`;
 if (days === 1) return "Yesterday";
 if (days < 7) return `${days}d ago`;
 return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SourceIcon({ sourceType, kind, icon, size = 15 }: {
 sourceType: SourceType;
 kind:    string;
 icon:    string | null;
 size?:   number;
}) {
 if (icon && icon.length <= 4) {
  return <span style={{ fontSize: size - 2 }} className="leading-none">{icon}</span>;
 }
 if (sourceType === "entry")  return <DatabaseIcon  size={size} className="shrink-0 text-primary" />;
 if (sourceType === "comment") return <ChatCircleIcon size={size} className="shrink-0 text-primary" />;
 if (kind === "database")   return <DatabaseIcon  size={size} className="shrink-0 text-primary" />;
 return <FileTextIcon size={size} className="shrink-0 text-muted-foreground" />;
}

function sourceLabel(sourceType: SourceType, kind: string): string {
 if (sourceType === "entry")  return "Entry";
 if (sourceType === "comment") return "Comment";
 if (kind === "database")   return "Database";
 return "Page";
}

// ── Filter chip ───────────────────────────────────────────────────────────────

function FilterChip<T extends string>({
 label, options, value, onChange,
}: {
 label:  string;
 options: { value: T; label: string }[];
 value:  T;
 onChange: (v: T) => void;
}) {
 const [open, setOpen] = useState(false);
 const [rect, setRect] = useState<DOMRect | null>(null);
 const ref = useRef<HTMLDivElement>(null);
 const btnRef = useRef<HTMLButtonElement>(null);
 const menuRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  if (!open) return;
  function h(e: MouseEvent) {
   if (ref.current?.contains(e.target as Node)) return;
   if (menuRef.current?.contains(e.target as Node)) return;
   setOpen(false);
  }
  document.addEventListener("mousedown", h);
  return () => document.removeEventListener("mousedown", h);
 }, [open]);

 const active = value !== options[0].value;
 const selected = options.find((o) => o.value === value);

 return (
  <div ref={ref} className="relative">
   <button
    ref={btnRef}
    onClick={() => {
     if (!open) setRect(btnRef.current?.getBoundingClientRect() ?? null);
     setOpen((p) => !p);
    }}
    className={[
     "flex items-center gap-1 rounded-[var(--radius-sm)] border px-3 py-1 text-xs font-medium transition-colors duration-150",
     active
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-border bg-muted/30 text-muted-foreground hover:border-border/80 hover:bg-muted/60 hover:text-foreground",
    ].join(" ")}
   >
    {active ? selected?.label : label}
    <ChevronDown size={10} className="opacity-60" />
   </button>

   {open && rect && typeof document !== "undefined" && createPortal(
    <div
     ref={menuRef}
     // z-[820] — above the search dialog panel (z-[810]) and its backdrop
     // (z-[800]); the shadcn default z-50 rendered this portal-mounted menu
     // invisible/unclickable behind the dialog's opaque surface instead of
     // on top of it (see components/ui/select.tsx for the same fix).
     className="fixed z-[820] min-w-[160px] rounded-[var(--radius-md)] border border-border bg-popover p-1"
     style={{ top: getClampedTop(rect, 200, { gap: 4 }), left: getClampedLeft(rect, 160) }}
    >
     {options.map((opt) => (
      <button
       key={opt.value}
       onClick={() => { onChange(opt.value); setOpen(false); }}
       className={[
        "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm transition-colors",
        opt.value === value
         ? "bg-primary/10 font-medium text-primary"
         : "text-foreground hover:bg-accent",
       ].join(" ")}
      >
       {opt.value === value && <Check size={12} className="text-primary" />}
       {opt.label}
      </button>
     ))}
    </div>,
    document.body,
   )}
  </div>
 );
}

// ── Result row ────────────────────────────────────────────────────────────────

function ResultRow({
 result, isActive, onClick,
}: {
 result:  SearchResult;
 isActive: boolean;
 onClick: () => void;
}) {
 return (
  <button
   onClick={onClick}
   className={[
    "flex w-full items-start gap-3 rounded-[var(--radius-sm)] px-4 py-3 text-left transition-colors",
    isActive ? "bg-accent outline-none" : "hover:bg-accent",
   ].join(" ")}
  >
   {/* Icon */}
   <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-muted/60">
    <SourceIcon sourceType={result.sourceType} kind={result.kind} icon={result.icon} />
   </div>

   {/* Content */}
   <div className="min-w-0 flex-1">
    <div className="flex items-center gap-2">
     <span className="truncate text-sm font-semibold text-foreground">
      {result.title || "Untitled"}
     </span>
     <span className="shrink-0 rounded-[var(--radius-xs)] bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
      {sourceLabel(result.sourceType, result.kind)}
     </span>
    </div>
    {result.breadcrumb && (
     <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground/70">
      <CaretRightIcon size={9} className="shrink-0" />
      <span className="truncate">{result.breadcrumb}</span>
     </div>
    )}
   </div>

   {/* Time */}
   <span className="mt-0.5 shrink-0 text-xs text-muted-foreground">
    {relativeTime(result.updatedAt)}
   </span>
  </button>
 );
}

// ── Recent row ────────────────────────────────────────────────────────────────

function RecentRow({
 item, isActive, onClick,
}: {
 item:   RecentPage;
 isActive: boolean;
 onClick: () => void;
}) {
 return (
  <button
   onClick={onClick}
   className={[
    "flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-4 py-2.5 text-left transition-colors",
    isActive ? "bg-accent" : "hover:bg-accent",
   ].join(" ")}
  >
   <div className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-muted/60">
    {item.page?.icon && item.page.icon.length <= 4
     ? <span className="text-sm leading-none">{item.page.icon}</span>
     : <FileTextIcon size={13} className="text-muted-foreground" />
    }
   </div>
   <span className="flex-1 truncate text-sm font-medium text-foreground">
    {item.page?.title || "Untitled"}
   </span>
   <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
    <ClockIcon size={11} />
    {relativeTime(item.visitedAt)}
   </div>
  </button>
 );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

interface SearchDialogProps {
 workspaceSlug: string;
 workspaceId:  string;
 onClose:    () => void;
}

export function SearchDialog({ workspaceSlug, workspaceId, onClose }: SearchDialogProps) {
 const router = useRouter();

 const [query,    setQuery]    = useState("");
 const [results,   setResults]   = useState<SearchResult[]>([]);
 const [recent,   setRecent]   = useState<RecentPage[]>([]);
 const [loading,   setLoading]   = useState(false);
 const [isPending,  setIsPending]  = useState(false); // debounce queued but not fired yet
 const [total,    setTotal]    = useState(0);
 const [activeIndex, setActiveIndex] = useState(0);
 const [titleOnly,  setTitleOnly]  = useState(false);
 const [reindexing, setReindexing] = useState(false);
 const [reindexDone, setReindexDone] = useState(false);

 const [filterType, setFilterType] = useState<FilterType>("all");
 const [filterDate, setFilterDate] = useState<FilterDate>("any");

 // A type/date filter is "active" when it's not the default. When one is active
 // we browse (list matching items) even with an empty query, instead of falling
 // back to the unfiltered recently-visited list — otherwise selecting a filter
 // looks like it does nothing.
 const hasFilter = filterType !== "all" || filterDate !== "any";

 const inputRef    = useRef<HTMLInputElement>(null);
 const listRef     = useRef<HTMLDivElement>(null);
 const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
 const backdropRef  = useRef<HTMLDivElement>(null);
 const dialogRef   = useRef<HTMLDivElement>(null);
 // Guards against an older in-flight request overwriting a newer one's
 // results if responses arrive out of order.
 const requestIdRef = useRef(0);
 // A zero-result response can be a real "no matches" OR just a mid-word
 // fragment the backend's stemmed matching temporarily misses (e.g. typing
 // through "getting" letter by letter can drop out of matching partway).
 // Rather than clearing the panel the instant any response comes back empty
 // — which flashes "No results" and then real matches again a keystroke
 // later — an empty response is held for a beat so a same-query keystroke
 // can supersede it before it ever reaches the screen.
 const emptyHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);

 async function runReindex() {
  setReindexing(true);
  try {
   await fetch(`/api/search/reindex?workspaceId=${workspaceId}`, { method: "POST" });
   setReindexDone(true);
   // Re-run current search/browse after indexing
   if (query.trim() || hasFilter) runSearch(query, filterType, filterDate, titleOnly);
  } finally {
   setReindexing(false);
  }
 }

 // Focus input on mount
 useEffect(() => {
  inputRef.current?.focus();
 }, []);

 // Load recently visited on open
 useEffect(() => {
  fetch(`/api/user/recently-visited?workspaceId=${workspaceId}`)
   .then((r) => r.json())
   .then((data: RecentPage[]) => setRecent(data))
   .catch(() => {});
 }, [workspaceId]);

 // Cancel any pending empty-result hold if the dialog itself closes
 useEffect(() => {
  return () => { if (emptyHoldRef.current) clearTimeout(emptyHoldRef.current); };
 }, []);

 // Debounced search
 const runSearch = useCallback(async (q: string, type: FilterType, date: FilterDate, titleOnlyMode: boolean) => {
  // Only bail on an empty query when there's also no active filter. With a
  // filter active, an empty query is a valid "browse" request.
  if (!q.trim() && type === "all" && date === "any") {
   if (emptyHoldRef.current) clearTimeout(emptyHoldRef.current);
   requestIdRef.current++; // invalidate any in-flight request
   setResults([]);
   setTotal(0);
   setIsPending(false);
   return;
  }
  const myRequestId = ++requestIdRef.current;
  setLoading(true);
  try {
   const params = new URLSearchParams({
    q,
    workspaceId,
    type,
    date,
    titleOnly: String(titleOnlyMode),
   });
   const res = await fetch(`/api/search?${params}`);
   if (!res.ok) throw new Error("Search failed");
   const data = await res.json() as { results: SearchResult[]; total: number };
   if (myRequestId !== requestIdRef.current) return; // superseded by a newer search

   if (emptyHoldRef.current) clearTimeout(emptyHoldRef.current);
   if (data.results.length > 0) {
    setResults(data.results);
    setTotal(data.total);
    setActiveIndex(0);
   } else {
    // Hold the previous (possibly non-empty) results on screen briefly —
    // if the user keeps typing, this timer gets cancelled by the next
    // runSearch call before it ever commits the empty state.
    emptyHoldRef.current = setTimeout(() => {
     if (myRequestId !== requestIdRef.current) return;
     setResults([]);
     setTotal(0);
     setActiveIndex(0);
    }, 450);
   }
  } catch {
   if (myRequestId === requestIdRef.current) setResults([]);
  } finally {
   if (myRequestId === requestIdRef.current) {
    setLoading(false);
    setIsPending(false);
   }
  }
 }, [workspaceId]);

 useEffect(() => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  // No query AND no filter → nothing to search; show recently-visited.
  if (!query.trim() && !hasFilter) {
   if (emptyHoldRef.current) clearTimeout(emptyHoldRef.current);
   requestIdRef.current++; // invalidate any in-flight/pending search
   setIsPending(false);
   setResults([]);
   setTotal(0);
   return;
  }
  // Mark as pending immediately so we don't flash "No results" before the
  // debounce fires or the API responds
  setIsPending(true);
  debounceRef.current = setTimeout(() => {
   runSearch(query, filterType, filterDate, titleOnly);
  }, 200);
  return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
 }, [query, filterType, filterDate, titleOnly, hasFilter, runSearch]);

 // Items list for keyboard nav
 const isQueryEmpty = !query.trim();
 // Recently-visited shows only in the true idle state (no query, no filter).
 // With a filter active we browse; with a query we search — both show results.
 const showRecent = isQueryEmpty && !hasFilter;
 const browseMode = isQueryEmpty && hasFilter;
 const isSearching = !showRecent && (isPending || loading);
 const items = showRecent
  ? recent.map((r) => ({ type: "recent" as const, item: r }))
  : results.map((r) => ({ type: "result" as const, item: r }));

 function navigate(item: SearchResult | RecentPage) {
  let shortId: string | undefined;
  if ("shortId" in item) {
   shortId = item.shortId;
  } else if ("page" in item && item.page) {
   shortId = item.page.shortId;
  }
  if (shortId) {
   // Pre-hide the fixed elements for any intermediate browser paint
   if (backdropRef.current) backdropRef.current.style.display = "none";
   if (dialogRef.current) dialogRef.current.style.display = "none";
   // flushSync forces React to synchronously commit open=false and unmount
   // the dialog BEFORE router.push() fires. Without this, router.push()
   // triggers a layout re-render while open is still true, causing the dialog
   // to briefly re-appear (the visible "blink").
   flushSync(() => { onClose(); });
   router.push(`/app/${workspaceSlug}/${shortId}`);
  }
 }

 // Keyboard navigation
 useEffect(() => {
  function handleKey(e: KeyboardEvent) {
   if (e.key === "ArrowDown") {
    e.preventDefault();
    setActiveIndex((i) => Math.min(i + 1, items.length - 1));
   } else if (e.key === "ArrowUp") {
    e.preventDefault();
    setActiveIndex((i) => Math.max(i - 1, 0));
   } else if (e.key === "Enter") {
    e.preventDefault();
    const active = items[activeIndex];
    if (active) navigate(active.item as SearchResult | RecentPage);
   } else if (e.key === "Escape") {
    onClose();
   } else if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    setQuery("");
    setResults([]);
    setTotal(0);
    setActiveIndex(0);
    inputRef.current?.focus();
   }
  }
  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [items, activeIndex, onClose]);

 // Scroll active item into view
 useEffect(() => {
  const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
  el?.scrollIntoView({ block: "nearest" });
 }, [activeIndex]);

 // NOTE: no "Comments" option — comment bodies aren't written to search_index
 // anywhere yet, so a Comments filter could only ever return empty. Re-add it
 // once comment indexing exists.
 const TYPE_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all",   label: "Any type" },
  { value: "page",  label: "Pages"   },
  { value: "entry",  label: "Entries"  },
 ];

 const DATE_OPTIONS: { value: FilterDate; label: string }[] = [
  { value: "any", label: "Any time"   },
  { value: "24h", label: "Past 24 hours" },
  { value: "7d", label: "Past 7 days" },
  { value: "30d", label: "Past 30 days" },
 ];

 return (
  <>
   {/* Backdrop */}
   <div
    ref={backdropRef}
    className="fixed inset-0 z-[800] bg-black/40"
    onClick={onClose}
   />

   {/* Dialog */}
   <div ref={dialogRef} className="fixed left-1/2 top-[12vh] z-[810] w-full max-w-[640px] -translate-x-1/2 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background">

    {/* Search input */}
    <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3.5">
     <MagnifyingGlassIcon size={18} className="shrink-0 text-muted-foreground" />
     <input
      ref={inputRef}
      value={query}
      onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
      placeholder="Search pages, databases, and more…"
      className="flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/50"
     />
     {(loading || isPending) && (
      <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
     )}
     {query && !loading && !isPending && (
      <button
       onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
       className="text-muted-foreground transition-colors hover:text-foreground"
      >
       <XIcon size={15} />
      </button>
     )}
    </div>

    {/* Filter bar */}
    <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-4 py-2.5">
     <FilterChip
      label="Any type"
      options={TYPE_OPTIONS}
      value={filterType}
      onChange={(v) => { setFilterType(v); setActiveIndex(0); }}
     />
     <FilterChip
      label="Any time"
      options={DATE_OPTIONS}
      value={filterDate}
      onChange={(v) => { setFilterDate(v); setActiveIndex(0); }}
     />

     <div className="ml-auto">
      <button
       onClick={() => setTitleOnly((p) => !p)}
       className={[
        "rounded-[var(--radius-sm)] border px-3 py-1 text-xs font-medium transition-colors duration-150",
        titleOnly
         ? "border-primary/40 bg-primary/10 text-primary"
         : "border-border bg-transparent text-muted-foreground hover:text-foreground",
       ].join(" ")}
      >
       Title only
      </button>
     </div>
    </div>

    {/* Results / recent */}
    <div ref={listRef} className="max-h-[420px] overflow-y-auto">

     {/* Idle (no query, no filter) — show recently visited */}
     {showRecent && (
      <div className="py-1">
       {recent.length > 0 ? (
        <>
         <p className="px-4 pb-1 pt-3 text-xs font-semibold tracking-wide text-muted-foreground/60">
          Recently visited
         </p>
         {recent.map((r, i) => (
          <div key={r.id} data-idx={i}>
           <RecentRow
            item={r}
            isActive={activeIndex === i}
            onClick={() => navigate(r)}
           />
          </div>
         ))}
        </>
       ) : (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
         <MagnifyingGlassIcon size={28} className="text-muted-foreground/60" />
         <p className="text-sm text-muted-foreground/60">
          Start typing to search
         </p>
        </div>
       )}
      </div>
     )}

     {/* Has query, search in progress, no previous results to show — spinner */}
     {isSearching && results.length === 0 && (
      <div className="flex items-center justify-center py-12">
       <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
      </div>
     )}

     {/* Query/browse done, no results */}
     {!showRecent && !isSearching && results.length === 0 && (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
       <MagnifyingGlassIcon size={28} className="text-muted-foreground/60" />
       <p className="text-sm font-medium text-foreground">
        {browseMode ? "Nothing matches these filters" : <>No results for &ldquo;{query}&rdquo;</>}
       </p>
       <p className="text-xs text-muted-foreground/60">
        {browseMode ? "Try a different type or time range" : "Try different keywords or adjust filters"}
       </p>
       {!reindexDone && (
        <button
         onClick={runReindex}
         disabled={reindexing}
         className="mt-1 rounded-[var(--radius-sm)] border border-border bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
         {reindexing ? "Indexing…" : "Index pages now"}
        </button>
       )}
       {reindexDone && (
        <p className="text-xs text-success">
         Index updated — try searching again
        </p>
       )}
      </div>
     )}

     {/* Results — shown even while isSearching so old results stay visible during re-query */}
     {!showRecent && results.length > 0 && (
      <div className="py-1">
       {results.map((r, i) => (
        <div key={r.id} data-idx={i}>
         <ResultRow
          result={r}
          isActive={activeIndex === i}
          onClick={() => navigate(r)}
         />
        </div>
       ))}
       {total >= 50 && (
        <p className="px-4 py-2.5 text-center text-xs text-muted-foreground">
         Showing top 50 results — refine your search
        </p>
       )}
      </div>
     )}
    </div>

    {/* Footer hint */}
    <div className="flex items-center gap-4 border-t border-border/40 bg-muted/20 px-4 py-2">
     <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <kbd className="flex size-5 items-center justify-center rounded border border-border bg-background text-xs">
       <ArrowUpIcon size={9} />
      </kbd>
      <kbd className="flex size-5 items-center justify-center rounded border border-border bg-background text-xs">
       <ArrowDownIcon size={9} />
      </kbd>
      Navigate
     </span>
     <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <kbd className="flex items-center justify-center rounded border border-border bg-background px-1.5 py-0.5 text-xs">
       <ArrowBendDownLeftIcon size={9} />
      </kbd>
      Open
     </span>
     <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-xs">Esc</kbd>
      Close
     </span>
     <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
      <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-xs">Ctrl K</kbd>
      Clear
     </span>
    </div>
   </div>
  </>
 );
}
