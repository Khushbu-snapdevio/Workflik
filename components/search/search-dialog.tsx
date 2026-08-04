"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Portal } from "@headlessui/react";
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
 LayoutTemplate as LayoutTemplateIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PageIcon, parseIcon } from "@/components/pages/page-icon";

// ── Types ─────────────────────────────────────────────────────────────────────

type SourceType = "page" | "entry" | "comment" | "template";

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

type FilterType = "all" | "page" | "entry" | "comment" | "template";
type FilterDate = "any" | "24h" | "7d" | "30d";
type FilterLocation = "all" | "shared" | "private";
// "me_created" / "me_edited" scope to the current user; any other value is a
// specific workspace member's user id, picked from the dropdown below.
type FilterAuthor = "any" | "me_created" | "me_edited" | (string & {});
type SortOption = "relevance" | "edited" | "created";

interface WorkspaceMemberOption {
 userId:  string;
 userName: string | null;
 userEmail: string;
}

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
 if (parseIcon(icon)) {
  return <PageIcon icon={icon} size={size - 2} />;
 }
 if (sourceType === "entry")  return <DatabaseIcon  size={size} className="shrink-0 text-primary" />;
 if (sourceType === "comment") return <ChatCircleIcon size={size} className="shrink-0 text-primary" />;
 if (sourceType === "template") return <LayoutTemplateIcon size={size} className="shrink-0 text-primary" />;
 if (kind === "database")   return <DatabaseIcon  size={size} className="shrink-0 text-primary" />;
 return <FileTextIcon size={size} className="shrink-0 text-muted-foreground" />;
}

function sourceLabel(sourceType: SourceType, kind: string): string {
 if (sourceType === "entry")  return "Entry";
 if (sourceType === "comment") return "Comment";
 if (sourceType === "template") return "Template";
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
 const active = value !== options[0].value;
 const selected = options.find((o) => o.value === value);

 return (
  <Listbox value={value} onChange={onChange}>
   <ListboxButton
    className={[
     "flex items-center gap-1 rounded-sm border px-3 py-1 text-xs font-medium transition-colors duration-150",
     active
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-border bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground",
    ].join(" ")}
   >
    {active ? selected?.label : label}
    <ChevronDown size={10} className="opacity-60" />
   </ListboxButton>

   {/* The dialog shell is a native <dialog> promoted to the browser's top
       layer on open — top-layer content paints above *any* z-index in the
       normal stacking context, no matter how high. Left to its default,
       this `anchor`-positioned panel would portal to the shared
       #headlessui-portal-root under <body>, outside the dialog's subtree,
       and render invisible/unclickable behind it. The call site wraps all
       FilterChips in <Portal.Group target={filterBarRef}> so this portals
       into the dialog's own subtree instead, inheriting its top-layer
       promotion. z-820 here still matters within that subtree, to stay
       above the results list below the filter bar. */}
   <ListboxOptions
    anchor={{ to: "bottom start", gap: 4 }}
    transition
    className="z-820 max-h-64 min-w-40 overflow-y-auto rounded-md border border-border bg-popover p-1 transition duration-100 ease-out data-leave:opacity-0 data-leave:scale-95"
   >
    {options.map((opt) => (
     <ListboxOption
      key={opt.value}
      value={opt.value}
      className="flex w-full cursor-default items-center gap-2 rounded-sm px-3 py-1.5 text-sm text-foreground transition-colors data-focus:bg-accent data-selected:bg-primary/10 data-selected:font-medium data-selected:text-primary"
     >
      {({ selected: isSelected }) => (
       <>
        {isSelected && <Check size={12} className="text-primary" />}
        {opt.label}
       </>
      )}
     </ListboxOption>
    ))}
   </ListboxOptions>
  </Listbox>
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
    "flex w-full items-start gap-3 rounded-sm px-4 py-3 text-left transition-colors",
    isActive ? "bg-accent outline-none" : "hover:bg-accent",
   ].join(" ")}
  >
   {/* Icon */}
   <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm bg-muted/60">
    <SourceIcon sourceType={result.sourceType} kind={result.kind} icon={result.icon} />
   </div>

   {/* Content */}
   <div className="min-w-0 flex-1">
    <div className="flex items-center gap-2">
     <span className="truncate text-sm font-semibold text-foreground">
      {result.title || "Untitled"}
     </span>
     <Badge variant="secondary" className="shrink-0">
      {sourceLabel(result.sourceType, result.kind)}
     </Badge>
    </div>
    {result.breadcrumb && (
     <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
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
    "flex w-full items-center gap-3 rounded-sm px-4 py-2.5 text-left transition-colors",
    isActive ? "bg-accent" : "hover:bg-accent",
   ].join(" ")}
  >
   <div className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-muted/60">
    {parseIcon(item.page?.icon)
     ? <PageIcon icon={item.page?.icon} size={13} />
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
 const [reindexing, setReindexing] = useState(false);
 const [reindexDone, setReindexDone] = useState(false);

 const [filterType, setFilterType] = useState<FilterType>("all");
 const [filterDate, setFilterDate] = useState<FilterDate>("any");
 const [filterLocation, setFilterLocation] = useState<FilterLocation>("all");
 const [filterAuthor, setFilterAuthor] = useState<FilterAuthor>("any");
 const [sortBy, setSortBy] = useState<SortOption>("relevance");
 const [members, setMembers] = useState<WorkspaceMemberOption[]>([]);

 // A filter is "active" when it's not the default. When one is active we
 // browse (list matching items) even with an empty query, instead of falling
 // back to the unfiltered recently-visited list — otherwise selecting a filter
 // looks like it does nothing. Sort has no effect on this — it only reorders
 // an existing result set, so it never triggers browse mode on its own.
 const hasFilter = filterType !== "all" || filterDate !== "any" || filterLocation !== "all" || filterAuthor !== "any";

 const inputRef    = useRef<HTMLInputElement>(null);
 const listRef     = useRef<HTMLDivElement>(null);
 const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
 // Portal target for FilterChip's Listbox panels — needed since the dialog shell
 // is now a native <dialog> (top-layer promoted); see ListboxOptions comment in FilterChip.
 const filterBarRef = useRef<HTMLDivElement>(null);
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
   if (query.trim() || hasFilter) runSearch(query, filterType, filterDate, filterLocation, filterAuthor, sortBy);
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
   // Guard against orphaned entries (e.g. a page removed after this list was
   // cached) rendering as a dead, indistinguishable "Untitled" row.
   .then((data: RecentPage[]) => setRecent(data.filter((r) => r.page)))
   .catch(() => {});
 }, [workspaceId]);

 function clearRecent() {
  setRecent([]);
  setActiveIndex(0);
  fetch(`/api/user/recently-visited?workspaceId=${workspaceId}`, { method: "DELETE" }).catch(() => {});
 }

 // Load workspace members on open — powers the "Specific member" entries in
 // the Author filter. Only active members can author/edit content.
 useEffect(() => {
  fetch(`/api/workspaces/${workspaceId}/members`)
   .then((r) => r.json())
   .then((data: { userId: string; userName: string | null; userEmail: string; status: string }[]) => {
    setMembers(data.filter((m) => m.status === "active"));
   })
   .catch(() => {});
 }, [workspaceId]);

 // Cancel any pending empty-result hold if the dialog itself closes
 useEffect(() => {
  return () => { if (emptyHoldRef.current) clearTimeout(emptyHoldRef.current); };
 }, []);

 // Debounced search
 const runSearch = useCallback(async (
  q: string, type: FilterType, date: FilterDate,
  location: FilterLocation, author: FilterAuthor, sort: SortOption,
 ) => {
  // Only bail on an empty query when there's also no active filter. With a
  // filter active, an empty query is a valid "browse" request.
  if (!q.trim() && type === "all" && date === "any" && location === "all" && author === "any") {
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
    location,
    author,
    sort,
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
   runSearch(query, filterType, filterDate, filterLocation, filterAuthor, sortBy);
  }, 200);
  return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
 }, [query, filterType, filterDate, filterLocation, filterAuthor, sortBy, hasFilter, runSearch]);

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
  // Templates aren't pages — they have no shortId route, so a match opens
  // the templates gallery with that template's preview pre-opened instead.
  if ("sourceType" in item && item.sourceType === "template") {
   // flushSync forces React to commit the unmount before router.push() fires, avoiding a brief re-appear "blink"; native <dialog>
   // defaults to hidden without showModal() (unlike the old always-visible divs), which removes most of the risk — kept as cheap insurance since rapid navigate-while-open hasn't been live-checked.
   flushSync(() => { onClose(); });
   router.push(`/app/${workspaceSlug}/templates?openId=${item.sourceId}`);
   return;
  }

  let shortId: string | undefined;
  if ("shortId" in item) {
   shortId = item.shortId;
  } else if ("page" in item && item.page) {
   shortId = item.page.shortId;
  }
  if (shortId) {
   flushSync(() => { onClose(); });
   router.push(`/app/${workspaceSlug}/${shortId}?from=search`);
  } else {
   toast.error("This page could not be opened — it may have been deleted.");
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
 }, [items, activeIndex]);

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
  { value: "template", label: "Templates" },
 ];

 const DATE_OPTIONS: { value: FilterDate; label: string }[] = [
  { value: "any", label: "Any time"   },
  { value: "24h", label: "Past 24 hours" },
  { value: "7d", label: "Past 7 days" },
  { value: "30d", label: "Past 30 days" },
 ];

 const LOCATION_OPTIONS: { value: FilterLocation; label: string }[] = [
  { value: "all",   label: "All locations" },
  { value: "shared", label: "Shared pages"  },
  { value: "private", label: "Private pages" },
 ];

 const AUTHOR_OPTIONS: { value: FilterAuthor; label: string }[] = [
  { value: "any",     label: "Any author"     },
  { value: "me_created", label: "Created by me"   },
  { value: "me_edited", label: "Last edited by me" },
  ...members.map((m) => ({ value: m.userId, label: m.userName || m.userEmail })),
 ];

 const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Best match"    },
  { value: "edited",  label: "Last edited"    },
  { value: "created", label: "Recently created" },
 ];

 return (
  <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
   <DialogContent
    showCloseButton={false}
    className="top-[12vh] w-full max-w-160 translate-y-0 gap-0 overflow-hidden rounded-lg border border-border bg-popover p-0 ring-0 backdrop:bg-black/40 sm:max-w-160"
   >

    {/* Search input */}
    <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
     <MagnifyingGlassIcon size={18} className="shrink-0 text-muted-foreground" />
     <input
      ref={inputRef}
      value={query}
      onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
      placeholder="Search pages, databases, and more…"
      className="flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground-subtle"
     />
     {(loading || isPending) && (
      <span className="loading loading-spinner loading-sm text-primary" />
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
    <div ref={filterBarRef} className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-4 py-2.5">
     <Portal.Group target={filterBarRef}>
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
      <FilterChip
       label="All locations"
       options={LOCATION_OPTIONS}
       value={filterLocation}
       onChange={(v) => { setFilterLocation(v); setActiveIndex(0); }}
      />
      <FilterChip
       label="Any author"
       options={AUTHOR_OPTIONS}
       value={filterAuthor}
       onChange={(v) => { setFilterAuthor(v); setActiveIndex(0); }}
      />
      <FilterChip
       label="Best match"
       options={SORT_OPTIONS}
       value={sortBy}
       onChange={(v) => { setSortBy(v); setActiveIndex(0); }}
      />
     </Portal.Group>
    </div>

    {/* Results / recent */}
    <div ref={listRef} className="max-h-105 overflow-y-auto">

     {/* Idle (no query, no filter) — show recently visited */}
     {showRecent && (
      <div className="py-1">
       {recent.length > 0 ? (
        <>
         <div className="flex items-center justify-between px-4 pb-1 pt-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">
           Recently visited
          </p>
          <button
           type="button"
           onClick={clearRecent}
           className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
           Clear all
          </button>
         </div>
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
         <MagnifyingGlassIcon size={28} className="text-muted-foreground" />
         <p className="text-sm text-muted-foreground">
          Start typing to search
         </p>
        </div>
       )}
      </div>
     )}

     {/* Has query, search in progress, no previous results to show — spinner */}
     {isSearching && results.length === 0 && (
      <div className="flex items-center justify-center py-12">
       <span className="loading loading-spinner loading-sm text-primary" />
      </div>
     )}

     {/* Query/browse done, no results */}
     {!showRecent && !isSearching && results.length === 0 && (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
       <MagnifyingGlassIcon size={28} className="text-muted-foreground" />
       <p className="text-sm font-medium text-foreground">
        {browseMode ? "Nothing matches these filters" : <>No results for &ldquo;{query}&rdquo;</>}
       </p>
       <p className="text-xs text-muted-foreground">
        {browseMode ? "Try a different type or time range" : "Try different keywords or adjust filters"}
       </p>
       {!reindexDone && (
        <button
         onClick={runReindex}
         disabled={reindexing}
         className="mt-1 rounded-sm border border-border bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground disabled:opacity-50"
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
    <div className="flex items-center gap-4 border-t border-border bg-muted/20 px-4 py-2">
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
   </DialogContent>
  </Dialog>
 );
}
