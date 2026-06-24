"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, ArrowLeft, ArrowRight, ChevronRight,
  LayoutGrid, Zap, BarChart2, Megaphone, Code2, DollarSign,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type DbProp = { name: string; type: string; options?: { name: string; color: string }[]; multiple?: boolean };
type DbView = { name: string; type: string; isDefault?: boolean; groupBy?: string };
type SchemaForPreview = { properties: DbProp[]; views: DbView[]; sample_rows?: Record<string, string | number>[] };

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isBuiltIn: boolean;
  workspaceId: string | null;
  createdBy: string | null;
  pageSnapshot: {
    title: string;
    icon: string | null;
    blocks: { type: string; content?: unknown }[];
    database_schema?: SchemaForPreview | null;
  };
};

type CategoryDef = { key: string; label: string; Icon: LucideIcon };

const CATEGORIES: CategoryDef[] = [
  { key: "all",          label: "All templates",       Icon: LayoutGrid  },
  { key: "productivity", label: "Productivity",         Icon: Zap         },
  { key: "project_mgmt", label: "Project management",  Icon: BarChart2   },
  { key: "marketing",    label: "Marketing & content",  Icon: Megaphone   },
  { key: "engineering",  label: "Engineering & docs",   Icon: Code2       },
  { key: "sales",        label: "Sales & finance",      Icon: DollarSign  },
];

const OPTION_COLORS: Record<string, { dot: string; badge: string }> = {
  gray:   { dot: "bg-muted-foreground/40",  badge: "bg-muted text-muted-foreground"           },
  red:    { dot: "bg-destructive/50",        badge: "bg-destructive/10 text-destructive"       },
  orange: { dot: "bg-warning/50",            badge: "bg-warning/10 text-warning"               },
  yellow: { dot: "bg-warning/40",            badge: "bg-warning/[0.07] text-warning"           },
  green:  { dot: "bg-success/50",            badge: "bg-success/10 text-success"               },
  teal:   { dot: "bg-success/40",            badge: "bg-success/[0.07] text-success"           },
  blue:   { dot: "bg-primary/50",            badge: "bg-primary/10 text-primary"               },
  purple: { dot: "bg-primary/40",            badge: "bg-primary/[0.07] text-primary/80"        },
  pink:   { dot: "bg-destructive/40",        badge: "bg-destructive/[0.07] text-destructive/80"},
};
const DEFAULT_OPT = { dot: "bg-muted-foreground/40", badge: "bg-muted text-muted-foreground" };

const PROP_TYPE_ICON: Record<string, string> = {
  title: "Aa", text: "Aa", number: "#", select: "≡", multi_select: "≡",
  date: "📅", checkbox: "☐", url: "🔗", email: "✉", phone: "☎",
  person: "👤", relation: "↗", created_by: "👤", created_time: "🕐",
  last_edited_by: "👤", last_edited_time: "🕐",
};

const BLOCK_ICONS: Record<string, string> = {
  h1: "H1", h2: "H2", h3: "H3", paragraph: "¶",
  bullet: "•", numbered: "#", todo: "☐", quote: "❝",
  callout: "💡", divider: "—", table: "⊞", code: "</>",
};

const CAL_DAYS  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CAL_WEEKS = [
  [1,  2,  3,  4,  5,  6,  7],
  [8,  9,  10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20, 21],
  [22, 23, 24, 25, 26, 27, 28],
  [29, 30,  0,  0,  0,  0,  0],
];

interface Props {
  workspaceId:   string;
  workspaceSlug: string;
  parentId?:     string | null;
}

// ── Main page component ────────────────────────────────────────────────────────

export function TemplatesPageClient({ workspaceId, workspaceSlug, parentId }: Props) {
  const router    = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [builtIn,   setBuiltIn]   = useState<Template[]>([]);
  const [workspace, setWorkspace] = useState<Template[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selected,  setSelected]  = useState<Template | null>(null);
  const [applying,  setApplying]  = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/templates").then(r => r.ok ? r.json() : []),
      fetch(`/api/workspaces/${workspaceId}/templates`).then(r => r.ok ? r.json() : []),
    ])
      .then(([bi, ws]) => {
        setBuiltIn(Array.isArray(bi) ? bi : []);
        setWorkspace(Array.isArray(ws) ? ws : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [workspaceId]);

  const q = search.toLowerCase().trim();
  const matches = (t: Template) =>
    (!q || t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)) &&
    (activeTab === "all" || t.category === activeTab);

  const filteredBuiltIn   = builtIn.filter(matches);
  const filteredWorkspace = workspace.filter(matches);

  function countForTab(key: string) {
    if (key === "all") return builtIn.length + workspace.length;
    return [...builtIn, ...workspace].filter(t => t.category === key).length;
  }

  async function applyTemplate(tpl: Template) {
    setApplying(true);
    try {
      const res = await fetch(`/api/templates/${tpl.id}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, parentId: parentId ?? null }),
      });
      if (res.ok) {
        const data = await res.json() as { shortId: string; kind: string };
        if (data.kind === "database") {
          router.push(`/app/${workspaceSlug}/t/${data.shortId}`);
        } else {
          router.push(`/app/${workspaceSlug}/${data.shortId}`);
        }
      }
    } finally {
      setApplying(false);
    }
  }

  function handleCategoryClick(key: string) {
    setActiveTab(key);
    setSelected(null);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">

      {/* ── Page header — h-11 matches sidebar top row and all other topbars ── */}
      <div className="flex h-11 shrink-0 items-center border-b border-border/60 bg-card px-3">
        {selected ? (
          <nav className="flex min-w-0 items-center gap-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
            >
              <LayoutGrid size={13} className="shrink-0" />
              <span className="font-medium">Templates</span>
            </button>
            <ChevronRight size={12} className="shrink-0 text-muted-foreground/30" />
            <span className="min-w-0 truncate px-1 font-medium text-foreground">{selected.name}</span>
          </nav>
        ) : (
          <nav className="flex min-w-0 items-center gap-0.5 text-xs">
            <span className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-muted-foreground">
              <LayoutGrid size={13} className="shrink-0" />
              <span className="font-medium text-foreground">Templates</span>
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="truncate px-1 text-muted-foreground/60">Pick a starting point for your next page or database</span>
          </nav>
        )}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">

        {/* ── Category sidebar — mirrors settings-nav.tsx exactly ── */}
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-border/60 bg-sidebar">
          <div className="flex-1 overflow-y-auto px-2.5 py-3">
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/40">
              Categories
            </p>
            <div className="space-y-0.5">
              {CATEGORIES.map(cat => {
                const cnt      = countForTab(cat.key);
                const isActive = activeTab === cat.key;
                const CatIcon  = cat.Icon;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleCategoryClick(cat.key)}
                    className={`group flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-left text-[13px] font-medium transition-colors duration-150 ${
                      isActive
                        ? "bg-primary/[0.08] text-primary"
                        : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    }`}
                  >
                    <span className={`shrink-0 transition-colors duration-150 ${isActive ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/60"}`}>
                      <CatIcon size={14} />
                    </span>
                    <span className={`min-w-0 flex-1 truncate ${isActive ? "font-semibold" : ""}`}>{cat.label}</span>
                    {cnt > 0 && (
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {cnt}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ── Main panel ── */}
        {selected ? (
          <DetailView
            selected={selected}
            workspaceSlug={workspaceSlug}
            applying={applying}
            onApply={() => applyTemplate(selected)}
          />
        ) : (
          <GalleryView
            searchRef={searchRef}
            search={search}
            onSearch={setSearch}
            loading={loading}
            filteredBuiltIn={filteredBuiltIn}
            filteredWorkspace={filteredWorkspace}
            onSelect={setSelected}
          />
        )}
      </div>
    </div>
  );
}

// ── Gallery view ───────────────────────────────────────────────────────────────

function GalleryView({
  searchRef, search, onSearch, loading,
  filteredBuiltIn, filteredWorkspace, onSelect,
}: {
  searchRef:         React.RefObject<HTMLInputElement | null>;
  search:            string;
  onSearch:          (v: string) => void;
  loading:           boolean;
  filteredBuiltIn:   Template[];
  filteredWorkspace: Template[];
  onSelect:          (t: Template) => void;
}) {
  const empty = filteredBuiltIn.length === 0 && filteredWorkspace.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">

      {/* Search bar */}
      <div className="shrink-0 border-b border-border/60 px-5 py-2.5">
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-muted/30 px-3 py-1.5 transition-colors focus-within:border-primary/40 focus-within:bg-card">
          <Search size={13} className="shrink-0 text-muted-foreground/50" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search templates…"
            className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              aria-label="Clear search"
              className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground transition-colors duration-150 hover:bg-muted-foreground/30"
            >
              <X size={9} />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 pt-5">
        {loading ? (
          <GallerySkeleton />
        ) : empty ? (
          <EmptyState />
        ) : (
          <div className="space-y-7">
            {filteredBuiltIn.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <p className="text-[11px] font-medium tracking-[0.125px] text-muted-foreground/50">Workflik templates</p>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">{filteredBuiltIn.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredBuiltIn.map(tpl => (
                    <TemplateCard key={tpl.id} template={tpl} onSelect={() => onSelect(tpl)} />
                  ))}
                </div>
              </section>
            )}
            {filteredWorkspace.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <p className="text-[11px] font-medium tracking-[0.125px] text-muted-foreground/50">Workspace templates</p>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">{filteredWorkspace.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredWorkspace.map(tpl => (
                    <TemplateCard key={tpl.id} template={tpl} onSelect={() => onSelect(tpl)} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Detail view ────────────────────────────────────────────────────────────────

function DetailView({
  selected, applying, onApply,
}: {
  selected:      Template;
  workspaceSlug: string;
  applying:      boolean;
  onApply:       () => void;
}) {
  const catDef  = CATEGORIES.find(c => c.key === selected.category);
  const CatIcon = catDef?.Icon ?? LayoutGrid;
  const blocks  = selected.pageSnapshot.blocks ?? [];

  return (
    <div className="flex min-h-0 flex-1">

      {/* Info panel */}
      <div className="flex w-80 shrink-0 flex-col border-r border-border">
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* Icon */}
          <div className="mb-4 flex size-12 items-center justify-center rounded-[var(--radius-lg)] bg-muted">
            {selected.pageSnapshot.icon ? (
              <span className="text-2xl leading-none">{selected.pageSnapshot.icon}</span>
            ) : (
              <CatIcon size={22} className="text-muted-foreground" />
            )}
          </div>

          <h2 className="text-base font-bold text-foreground">{selected.name}</h2>

          {catDef && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <CatIcon size={10} />
                {catDef.label}
              </span>
            </div>
          )}

          {selected.description && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {selected.description}
            </p>
          )}

          {/* Content breakdown */}
          {selected.pageSnapshot.database_schema ? (
            <DbSchemaPreview schema={selected.pageSnapshot.database_schema} />
          ) : blocks.length > 0 ? (
            <div className="mt-5">
              <p className="mb-2 text-[10px] font-semibold tracking-[0.125px] text-muted-foreground/50">
                Includes
              </p>
              <div className="space-y-1 rounded-[var(--radius-md)] border border-border/60 bg-muted/30 p-3">
                {blocks.slice(0, 12).map((b, i) => (
                  <BlockPreview key={i} block={b as { type: string; content?: unknown }} />
                ))}
                {blocks.length > 12 && (
                  <p className="mt-1 text-[10px] text-muted-foreground/40">
                    +{blocks.length - 12} more blocks
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* CTA */}
        <div className="shrink-0 border-t border-border p-4">
          <button
            type="button"
            disabled={applying}
            onClick={onApply}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-[var(--primary-hover)] disabled:opacity-60"
          >
            {applying ? (
              <>
                <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                Creating page…
              </>
            ) : (
              <>
                Use template
                <ArrowRight size={14} />
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground/50">
            Creates an independent copy
          </p>
        </div>
      </div>

      {/* Preview panel */}
      <div className="flex flex-1 flex-col overflow-hidden bg-muted/20">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto w-full max-w-[560px] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background">
            {/* Cover */}
            <div className="flex h-24 items-center justify-center bg-muted/30">
              {selected.pageSnapshot.icon ? (
                <span className="text-5xl leading-none">{selected.pageSnapshot.icon}</span>
              ) : (
                <CatIcon size={44} className="text-muted-foreground/30" />
              )}
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <h1 className="mb-3 text-xl font-bold text-foreground">
                {selected.pageSnapshot.title || selected.name}
              </h1>
              {selected.pageSnapshot.database_schema ? (
                <DatabasePreview schema={selected.pageSnapshot.database_schema} />
              ) : (
                <div className="space-y-2">
                  {blocks.slice(0, 14).map((b, i) => (
                    <PageBlockPreview key={i} block={b as { type: string; content?: unknown }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Template card ──────────────────────────────────────────────────────────────

const MINI_WIDTHS = ["w-4/5", "w-3/5", "w-3/4", "w-1/2", "w-11/12", "w-2/3", "w-5/6"] as const;

function TemplateCard({ template, onSelect }: { template: Template; onSelect: () => void }) {
  const catDef  = CATEGORIES.find(c => c.key === template.category);
  const CatIcon = catDef?.Icon ?? LayoutGrid;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      <TemplateCardThumbnail template={template} />
      <div className="px-3.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[13px] font-semibold text-foreground">{template.name}</p>
          <span className="mt-0.5 flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <CatIcon size={9} />
          </span>
        </div>
        {template.description && (
          <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground/60">
            {template.description}
          </p>
        )}
      </div>
    </button>
  );
}

// ── Template card thumbnail ────────────────────────────────────────────────────

function TemplateCardThumbnail({ template }: { template: Template }) {
  const icon   = template.pageSnapshot.icon;
  const schema = template.pageSnapshot.database_schema;
  const blocks = template.pageSnapshot.blocks ?? [];
  const catDef  = CATEGORIES.find(c => c.key === template.category);
  const CatIcon = catDef?.Icon ?? LayoutGrid;

  return (
    <div className="relative h-44 overflow-hidden border-b border-border/30 bg-gradient-to-b from-muted/30 to-muted/10">
      <div className="p-3">
        {/* Icon indicator row */}
        <div className="mb-2.5 flex items-center gap-1.5">
          {icon ? (
            <span className="shrink-0 text-sm leading-none">{icon}</span>
          ) : (
            <div className="flex size-4 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted">
              <CatIcon size={9} className="text-muted-foreground" />
            </div>
          )}
          <div className="h-1.5 w-20 rounded-[var(--radius-xs)] bg-foreground/15" />
        </div>

        {/* Content preview */}
        {schema ? (
          <MiniDbContent schema={schema} />
        ) : (
          <MiniPageContent blocks={blocks} />
        )}
      </div>
    </div>
  );
}

// ── Mini page content ──────────────────────────────────────────────────────────

function MiniPageContent({ blocks }: { blocks: { type: string }[] }) {
  const items = blocks.length > 0 ? blocks.slice(0, 8) : [];
  if (items.length === 0) {
    return (
      <div className="space-y-1.5">
        <div className="h-1.5 w-2/3 rounded-[var(--radius-xs)] bg-foreground/18" />
        <div className="h-1 w-4/5 rounded-[var(--radius-xs)] bg-muted-foreground/14" />
        <div className="h-1 w-full rounded-[var(--radius-xs)] bg-muted-foreground/12" />
        <div className="h-px bg-border/40 my-1" />
        <div className="flex items-center gap-1.5 pl-1">
          <div className="size-1 shrink-0 rounded-full bg-muted-foreground/30" />
          <div className="h-1 w-3/5 rounded-[var(--radius-xs)] bg-muted-foreground/14" />
        </div>
        <div className="flex items-center gap-1.5 pl-1">
          <div className="size-1 shrink-0 rounded-full bg-muted-foreground/30" />
          <div className="h-1 w-4/5 rounded-[var(--radius-xs)] bg-muted-foreground/12" />
        </div>
        <div className="flex items-center gap-1.5 pl-1">
          <div className="size-1 shrink-0 rounded-full bg-muted-foreground/30" />
          <div className="h-1 w-1/2 rounded-[var(--radius-xs)] bg-muted-foreground/10" />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {items.map((b, i) => (
        <MiniBlock key={i} type={b.type} wCls={MINI_WIDTHS[i % MINI_WIDTHS.length]!} />
      ))}
    </div>
  );
}

function MiniBlock({ type, wCls }: { type: string; wCls: string }) {
  if (type === "divider") return <div className="h-px bg-border/50" />;

  if (type === "h1") return (
    <div className="h-2 w-3/4 rounded-[var(--radius-xs)] bg-foreground/25" />
  );
  if (type === "h2") return (
    <div className="h-1.5 w-1/2 rounded-[var(--radius-xs)] bg-foreground/20" />
  );
  if (type === "h3") return (
    <div className="h-1 w-2/5 rounded-[var(--radius-xs)] bg-foreground/18" />
  );

  if (type === "bullet") return (
    <div className="flex items-center gap-1.5 pl-2">
      <div className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
      <div className={`${wCls} h-1 rounded-[var(--radius-xs)] bg-muted-foreground/15`} />
    </div>
  );
  if (type === "numbered") return (
    <div className="flex items-center gap-1.5 pl-2">
      <div className="size-1 shrink-0 rounded-[var(--radius-xs)] bg-muted-foreground/30" />
      <div className={`${wCls} h-1 rounded-[var(--radius-xs)] bg-muted-foreground/15`} />
    </div>
  );

  if (type === "todo") return (
    <div className="flex items-center gap-1.5">
      <div className="size-2 shrink-0 rounded-[var(--radius-xs)] border border-muted-foreground/30 bg-background" />
      <div className={`${wCls} h-1 rounded-[var(--radius-xs)] bg-muted-foreground/15`} />
    </div>
  );

  if (type === "callout") return (
    <div className="flex items-center gap-1.5 rounded-[var(--radius-xs)] bg-warning/10 px-2 py-1">
      <div className="size-1.5 shrink-0 rounded-full bg-warning/60" />
      <div className="h-1 flex-1 rounded-[var(--radius-xs)] bg-muted-foreground/15" />
    </div>
  );

  if (type === "quote") return (
    <div className="flex gap-1.5 pl-0.5">
      <div className="w-0.5 shrink-0 self-stretch rounded-full bg-border" />
      <div className={`${wCls} h-1 rounded-[var(--radius-xs)] bg-muted-foreground/12`} />
    </div>
  );

  if (type === "code") return (
    <div className="rounded-[var(--radius-xs)] bg-muted px-2 py-1">
      <div className={`${wCls} h-1 rounded-[var(--radius-xs)] bg-muted-foreground/25`} />
    </div>
  );

  return <div className={`${wCls} h-1 rounded-[var(--radius-xs)] bg-muted-foreground/12`} />;
}

// ── Mini database content ──────────────────────────────────────────────────────

function MiniDbContent({ schema }: { schema: SchemaForPreview }) {
  const defaultView = schema.views.find(v => v.isDefault) ?? schema.views[0];
  if (defaultView?.type === "board")    return <MiniBoardContent schema={schema} />;
  if (defaultView?.type === "calendar") return <MiniCalContent />;
  return <MiniTableContent schema={schema} />;
}

function MiniTableContent({ schema }: { schema: SchemaForPreview }) {
  const props = schema.properties
    .filter(p => !["created_by","created_time","last_edited_by","last_edited_time"].includes(p.type))
    .slice(0, 4);
  const rows = schema.sample_rows ?? [];

  return (
    <div className="overflow-hidden rounded-[var(--radius-xs)] border border-border/50 text-[8px] leading-none">
      {/* Header row */}
      <div className="flex border-b border-border/40 bg-muted/50">
        {props.map((p, i) => (
          <div key={i} className="min-w-0 flex-1 truncate px-1.5 py-1 font-semibold text-muted-foreground/40">
            {PROP_TYPE_ICON[p.type] ?? "·"} {p.name.slice(0, 5)}
          </div>
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: 3 }).map((_, ri) => {
        const row = rows[ri];
        return (
          <div key={ri} className="flex border-b border-border/20 last:border-0">
            {props.map((p, pi) => {
              const val = row?.[p.name];
              const opt = val ? p.options?.find(o => o.name === val) : null;
              return (
                <div key={pi} className="min-w-0 flex-1 overflow-hidden px-1 py-1">
                  {opt ? (
                    <span className={`inline-block max-w-full truncate rounded-[var(--radius-xs)] px-1 leading-[10px] ${(OPTION_COLORS[opt.color] ?? DEFAULT_OPT).badge}`}>
                      {String(val).slice(0, 6)}
                    </span>
                  ) : val !== undefined ? (
                    <span className="block truncate text-foreground/50">{String(val).slice(0, 7)}</span>
                  ) : (
                    <div className={`${MINI_WIDTHS[(ri * 4 + pi) % MINI_WIDTHS.length]} h-0.5 rounded-[var(--radius-xs)] bg-muted-foreground/15`} />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function MiniBoardContent({ schema }: { schema: SchemaForPreview }) {
  const groupProp = schema.properties.find(p => p.type === "select");
  const cols = (groupProp?.options ?? []).slice(0, 3);
  const rows = schema.sample_rows ?? [];
  const fallback = [
    { name: "Todo", color: "gray" },
    { name: "In Progress", color: "blue" },
    { name: "Done", color: "green" },
  ] as { name: string; color: string }[];
  const displayCols = cols.length > 0 ? cols : fallback;

  return (
    <div className="flex gap-2">
      {displayCols.map((col, ci) => {
        const clr = OPTION_COLORS[col.color] ?? DEFAULT_OPT;
        const colRows = groupProp
          ? rows.filter(r => r[groupProp.name] === col.name).slice(0, 2)
          : [];
        const cardCount = colRows.length > 0 ? colRows.length : ci === 0 ? 2 : ci === 1 ? 2 : 1;

        return (
          <div key={ci} className="flex-1">
            <div className={`mb-1.5 inline-flex items-center gap-0.5 rounded-[var(--radius-xs)] px-1.5 py-px text-[7px] font-semibold ${clr.badge}`}>
              <div className={`size-1 rounded-full ${clr.dot}`} />
              <span className="truncate">{col.name.slice(0, 8)}</span>
            </div>
            <div className="space-y-1">
              {Array.from({ length: cardCount }).map((_, ki) => (
                <div key={ki} className="space-y-0.5 rounded-[var(--radius-xs)] border border-border/30 bg-card p-1.5">
                  <div className="h-1 w-4/5 rounded-[var(--radius-xs)] bg-foreground/18" />
                  <div className="h-1 w-3/5 rounded-[var(--radius-xs)] bg-muted-foreground/15" />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MiniCalContent() {
  const events = new Set([2, 7, 12, 18, 20]);
  return (
    <div className="overflow-hidden rounded-[var(--radius-xs)] border border-border/40">
      <div className="grid grid-cols-7 border-b border-border/40 bg-muted/30">
        {["M","T","W","T","F","S","S"].map((d, i) => (
          <div key={i} className="py-0.5 text-center">
            <span className="text-[6.5px] font-semibold text-muted-foreground/40">{d}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 21 }).map((_, i) => (
          <div key={i} className="relative h-4 border-b border-r border-border/15 p-0.5 last:border-r-0">
            {i === 14 ? (
              <div className="flex size-3 items-center justify-center rounded-full bg-primary">
                <span className="text-[5px] font-bold text-primary-foreground">{i+1}</span>
              </div>
            ) : (
              <>
                <span className="text-[5.5px] text-muted-foreground/30">{i + 1}</span>
                {events.has(i) && (
                  <div className="absolute bottom-0.5 left-0.5 right-0.5 h-0.5 rounded-full bg-primary/40" />
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Block preview helpers ──────────────────────────────────────────────────────

function BlockPreview({ block }: { block: { type: string; content?: unknown } }) {
  const icon = BLOCK_ICONS[block.type] ?? "·";
  const c    = block.content as { text?: { text: string }[] } | null;
  const text = c?.text?.map(t => t.text).join("") ?? "";
  return (
    <div className="flex items-start gap-2">
      <span className="mt-px w-5 shrink-0 text-center text-[9px] font-bold text-muted-foreground/30">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-foreground/60">
        {text || <span className="italic text-muted-foreground/30">{block.type}</span>}
      </span>
    </div>
  );
}

function PageBlockPreview({ block }: { block: { type: string; content?: unknown } }) {
  const c    = block.content as { text?: { text: string }[] } | null;
  const text = c?.text?.map(t => t.text).join("") ?? "";
  if (block.type === "divider") return <hr className="border-border/40" />;
  const cls: Record<string, string> = {
    h1:        "text-base font-bold text-foreground mt-3 first:mt-0",
    h2:        "text-sm font-bold text-foreground mt-2 first:mt-0",
    h3:        "text-sm font-semibold text-foreground mt-1.5",
    paragraph: "text-xs leading-relaxed text-muted-foreground",
    bullet:    "text-xs leading-relaxed text-muted-foreground pl-3 before:content-['•'] before:mr-2 before:text-muted-foreground/40",
    numbered:  "text-xs leading-relaxed text-muted-foreground pl-3",
    todo:      "text-xs leading-relaxed text-muted-foreground pl-3 line-through opacity-50",
    quote:     "text-xs italic text-muted-foreground border-l-2 border-border pl-3",
    code:      "text-xs font-mono text-foreground bg-muted rounded-[var(--radius-xs)] px-1.5 py-0.5",
  };
  return (
    <p className={cls[block.type] ?? "text-xs text-muted-foreground/50"}>
      {text || <span className="opacity-30">—</span>}
    </p>
  );
}

// ── DB schema preview ──────────────────────────────────────────────────────────

function DbSchemaPreview({ schema }: { schema: SchemaForPreview }) {
  return (
    <div className="mt-5 space-y-4">
      <div>
        <p className="mb-2 text-[10px] font-semibold tracking-[0.125px] text-muted-foreground/50">
          Views
        </p>
        <div className="flex flex-wrap gap-1.5">
          {schema.views.map(v => (
            <span
              key={v.name}
              className={[
                "inline-flex items-center gap-1 rounded-[var(--radius-xs)] border px-2 py-1 text-[11px] font-medium",
                v.isDefault
                  ? "border-border bg-accent text-foreground font-semibold"
                  : "border-border/40 bg-muted/20 text-muted-foreground",
              ].join(" ")}
            >
              {v.type === "board" ? "⊞" : v.type === "calendar" ? "📅" : "☰"} {v.name}
            </span>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[10px] font-semibold tracking-[0.125px] text-muted-foreground/50">
          Properties ({schema.properties.length})
        </p>
        <div className="divide-y divide-border/40 rounded-[var(--radius-md)] border border-border/60 bg-muted/30">
          {schema.properties.map(p => (
            <div key={p.name} className="flex items-center gap-2.5 px-3 py-2">
              <span className="w-5 shrink-0 text-center text-[9px] font-bold text-muted-foreground/40">
                {PROP_TYPE_ICON[p.type] ?? "·"}
              </span>
              <span className="flex-1 text-xs text-foreground/80">{p.name}</span>
              {p.options && p.options.length > 0 && (
                <div className="flex gap-1">
                  {p.options.slice(0, 3).map(o => (
                    <span key={o.name} className="rounded px-1 py-0.5 text-[9px] font-medium bg-muted text-muted-foreground">
                      {o.name}
                    </span>
                  ))}
                  {p.options.length > 3 && (
                    <span className="text-[9px] text-muted-foreground/40">+{p.options.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Database preview (right panel) ────────────────────────────────────────────

function ViewTabs({ views, defaultName }: { views: DbView[]; defaultName: string }) {
  return (
    <div className="mb-3 flex items-center gap-1 overflow-x-auto border-b border-border/40 pb-2">
      {views.map(v => (
        <span
          key={v.name}
          className={[
            "shrink-0 rounded-[var(--radius-xs)] px-2 py-0.5 text-[10px] font-medium",
            v.name === defaultName ? "bg-accent text-foreground font-semibold" : "text-muted-foreground/50",
          ].join(" ")}
        >
          {v.name}
        </span>
      ))}
    </div>
  );
}

function DbTablePreview({ schema }: { schema: SchemaForPreview }) {
  const visibleProps = schema.properties
    .filter(p => !["created_by","created_time","last_edited_by","last_edited_time"].includes(p.type))
    .slice(0, 5);
  const defaultView = schema.views.find(v => v.isDefault) ?? schema.views[0];
  const rows        = schema.sample_rows ?? [];

  return (
    <div className="mt-3">
      <ViewTabs views={schema.views} defaultName={defaultView?.name ?? ""} />
      <div className="overflow-hidden rounded-[var(--radius-sm)] border border-border/40">
        <div className="flex border-b border-border/40 bg-muted/30">
          {visibleProps.map(p => (
            <div key={p.name} className="min-w-0 flex-1 truncate px-2 py-1.5 text-[9.5px] font-semibold text-muted-foreground/60">
              <span className="mr-1 opacity-50">{PROP_TYPE_ICON[p.type] ?? "·"}</span>
              {p.name}
            </div>
          ))}
        </div>
        {rows.slice(0, 3).map((row, ri) => (
          <div key={ri} className="flex border-b border-border/30 last:border-0">
            {visibleProps.map((p, pi) => {
              const val = row[p.name];
              const opt = p.options?.find(o => o.name === val);
              return (
                <div key={pi} className="min-w-0 flex-1 px-2 py-1.5 text-[10px] text-foreground/80">
                  {opt ? (
                    <span className={`rounded-[var(--radius-xs)] px-1.5 py-0.5 text-[9.5px] font-medium ${(OPTION_COLORS[opt.color] ?? DEFAULT_OPT).badge}`}>{val}</span>
                  ) : val !== undefined ? (
                    <span className="block truncate">{String(val)}</span>
                  ) : (
                    <span className="text-muted-foreground/20">—</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="py-3 text-center text-[10px] text-muted-foreground/30">No sample data</div>
        )}
      </div>
    </div>
  );
}

function BoardPreview({ schema }: { schema: SchemaForPreview }) {
  const defaultView = schema.views.find(v => v.isDefault) ?? schema.views[0];
  const groupByName = defaultView?.groupBy;
  const groupByProp = schema.properties.find(p => p.name === groupByName) ?? schema.properties.find(p => p.type === "select");
  const titleProp   = schema.properties.find(p => p.type === "title");
  const tagProp     = schema.properties.find(p => p.type === "select" && p !== groupByProp);
  const columns     = (groupByProp?.options ?? []).slice(0, 5);
  const rows        = schema.sample_rows ?? [];

  return (
    <div className="mt-3">
      <ViewTabs views={schema.views} defaultName={defaultView?.name ?? ""} />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {columns.map(col => {
          const colRows = groupByProp ? rows.filter(r => r[groupByProp.name] === col.name) : [];
          const clr = OPTION_COLORS[col.color] ?? DEFAULT_OPT;
          return (
            <div key={col.name} className="min-w-[130px] shrink-0">
              <div className="mb-2 flex items-center gap-1.5">
                <span className={`size-2 shrink-0 rounded-full ${clr.dot}`} />
                <span className="flex-1 truncate text-[10px] font-semibold text-foreground/70">{col.name}</span>
                {colRows.length > 0 && <span className="text-[9px] text-muted-foreground/30 tabular-nums">{colRows.length}</span>}
              </div>
              <div className="space-y-1.5">
                {colRows.map((row, i) => {
                  const title  = titleProp ? String(row[titleProp.name] ?? "") : "";
                  const tagVal = tagProp ? String(row[tagProp.name] ?? "") : "";
                  const tagOpt = tagProp?.options?.find(o => o.name === tagVal);
                  return (
                    <div key={i} className="rounded-[var(--radius-sm)] border border-border/50 bg-background p-2">
                      <p className="text-[10.5px] font-medium leading-snug text-foreground">{title}</p>
                      {tagOpt && (
                        <span className={`mt-1 inline-flex rounded px-1 py-0.5 text-[9px] font-medium ${(OPTION_COLORS[tagOpt.color] ?? DEFAULT_OPT).badge}`}>
                          {tagVal}
                        </span>
                      )}
                    </div>
                  );
                })}
                <div className="rounded-[var(--radius-sm)] border border-border/40 p-2">
                  <span className="text-[9px] text-muted-foreground/25">+ New</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarPreview({ schema }: { schema: SchemaForPreview }) {
  const defaultView = schema.views.find(v => v.isDefault) ?? schema.views[0];
  return (
    <div className="mt-3">
      <ViewTabs views={schema.views} defaultName={defaultView?.name ?? ""} />
      <div className="overflow-hidden rounded-[var(--radius-sm)] border border-border/40">
        <div className="flex items-center justify-between border-b border-border/40 bg-muted/20 px-3 py-1.5">
          <span className="text-[10.5px] font-semibold text-foreground/70">June 2026</span>
          <div className="flex gap-2 text-[9px] text-muted-foreground/30"><span>‹</span><span>›</span></div>
        </div>
        <div className="grid grid-cols-7 border-b border-border/40 bg-muted/10">
          {CAL_DAYS.map(d => (
            <div key={d} className="py-1 text-center text-[8.5px] font-semibold text-muted-foreground/40">{d}</div>
          ))}
        </div>
        {CAL_WEEKS.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border/20 last:border-0">
            {week.map((date, di) => (
              <div key={di} className="h-9 border-r border-border/20 p-1 last:border-0">
                {date > 0 && (
                  <span className={date === 19
                    ? "flex size-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground"
                    : "text-[9px] text-muted-foreground/40"
                  }>{date}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DatabasePreview({ schema }: { schema: SchemaForPreview }) {
  const defaultView = schema.views.find(v => v.isDefault) ?? schema.views[0];
  if (defaultView?.type === "board")    return <BoardPreview schema={schema} />;
  if (defaultView?.type === "calendar") return <CalendarPreview schema={schema} />;
  return <DbTablePreview schema={schema} />;
}

// ── States ─────────────────────────────────────────────────────────────────────

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-[var(--radius-md)] border border-border">
          <div className="h-44 animate-pulse bg-muted/60" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-full animate-pulse rounded bg-muted/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="flex size-12 items-center justify-center rounded-[var(--radius-lg)] bg-muted/50">
        <LayoutGrid size={22} className="text-muted-foreground/40" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">No templates found</p>
        <p className="mt-1 text-xs text-muted-foreground">Try a different search or category.</p>
      </div>
    </div>
  );
}
