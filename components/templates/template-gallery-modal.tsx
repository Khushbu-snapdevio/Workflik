"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  X,
  ArrowLeft,
  ArrowRight,
  LayoutGrid,
  Zap,
  BarChart2,
  Megaphone,
  Code2,
  DollarSign,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

type DbProp = { name: string; type: string; options?: { name: string; color: string }[]; multiple?: boolean };
type DbView = { name: string; type: string; isDefault?: boolean; groupBy?: string };

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
    database_schema?: { properties: DbProp[]; views: DbView[]; sample_rows?: Record<string, string | number>[] } | null;
  };
};

type CategoryDef = {
  key: string;
  label: string;
  Icon: LucideIcon;
};

const CATEGORIES: CategoryDef[] = [
  { key: "all",          label: "All Templates",       Icon: LayoutGrid  },
  { key: "productivity", label: "Productivity",         Icon: Zap         },
  { key: "project_mgmt", label: "Project Management",  Icon: BarChart2   },
  { key: "marketing",    label: "Marketing & Content",  Icon: Megaphone   },
  { key: "engineering",  label: "Engineering & Docs",   Icon: Code2       },
  { key: "sales",        label: "Sales & Finance",      Icon: DollarSign  },
];

const CATEGORY_COLORS: Record<string, { badge: string }> = {
  productivity: { badge: "bg-muted text-muted-foreground" },
  project_mgmt: { badge: "bg-muted text-muted-foreground" },
  marketing:    { badge: "bg-muted text-muted-foreground" },
  engineering:  { badge: "bg-muted text-muted-foreground" },
  sales:        { badge: "bg-muted text-muted-foreground" },
};

const DEFAULT_COLOR = { badge: "bg-muted text-muted-foreground" };

const OPTION_COLORS: Record<string, { dot: string; badge: string }> = {
  gray:   { dot: "bg-[#71717a]", badge: "bg-[#d4d4d8] text-[#3f3f46]" },
  red:    { dot: "bg-[#f87171]", badge: "bg-[#fee2e2] text-[#b91c1c]" },
  orange: { dot: "bg-[#fb923c]", badge: "bg-[#ffedd5] text-[#c2410c]" },
  yellow: { dot: "bg-[#facc15]", badge: "bg-[#fef9c3] text-[#a16207]" },
  green:  { dot: "bg-[#4ade80]", badge: "bg-[#dcfce7] text-[#15803d]" },
  teal:   { dot: "bg-[#2dd4bf]", badge: "bg-[#ccfbf1] text-[#0f766e]" },
  blue:   { dot: "bg-[#38bdf8]", badge: "bg-[#e0f2fe] text-[#0369a1]" },
  purple: { dot: "bg-[#a78bfa]", badge: "bg-[#ede9fe] text-[#6d28d9]" },
  pink:   { dot: "bg-[#f472b6]", badge: "bg-[#fce7f3] text-[#be185d]" },
};
const DEFAULT_OPT = { dot: "bg-[#71717a]", badge: "bg-[#d4d4d8] text-[#3f3f46]" };

interface Props {
  workspaceId:      string;
  workspaceSlug:    string;
  parentId?:        string | null;
  initialCategory?: string;
  onClose:          () => void;
}

export function TemplateGalleryModal({ workspaceId, workspaceSlug, parentId, initialCategory, onClose }: Props) {
  const router = useRouter();
  const [builtIn, setBuiltIn]     = useState<Template[]>([]);
  const [workspace, setWorkspace] = useState<Template[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [activeTab, setActiveTab] = useState<string>(initialCategory ?? "all");
  const [step, setStep]           = useState<"gallery" | "detail">("gallery");
  const [selected, setSelected]   = useState<Template | null>(null);
  const [applying, setApplying]   = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/templates").then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/workspaces/${workspaceId}/templates`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([bi, ws]) => {
        setBuiltIn(Array.isArray(bi) ? bi : []);
        setWorkspace(Array.isArray(ws) ? ws : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    setTimeout(() => searchRef.current?.focus(), 80);
  }, [workspaceId]);

  const q = search.toLowerCase().trim();
  const matches = (t: Template) =>
    (!q || t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)) &&
    (activeTab === "all" || t.category === activeTab);

  const filteredBuiltIn   = builtIn.filter(matches);
  const filteredWorkspace = workspace.filter(matches);
  const total = builtIn.length + workspace.length;

  function countForTab(key: string) {
    if (key === "all") return total;
    return [...builtIn, ...workspace].filter((t) => t.category === key).length;
  }

  function handleSelectTemplate(tpl: Template) {
    setSelected(tpl);
    setStep("detail");
  }

  function handleBack() {
    setStep("gallery");
    setSelected(null);
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
        const data = (await res.json()) as { shortId: string; kind: string };
        onClose();
        // Database templates open in the template view; regular pages open normally
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

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative flex h-[88vh] w-full max-w-[980px] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background">

        {/* ── GALLERY STEP ── */}
        {step === "gallery" && (
          <>
            {/* Left sidebar */}
            <div className="flex w-56 shrink-0 flex-col border-r border-border/60 bg-muted/30">
              <div className="px-5 pb-3 pt-5">
                <h2 className="text-base font-bold tracking-tight text-foreground">Templates</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Pick a starting point</p>
              </div>

              <nav className="flex-1 overflow-y-auto px-2 pb-3">
                {CATEGORIES.map((cat) => {
                  const cnt      = countForTab(cat.key);
                  const isActive = activeTab === cat.key;
                  const CatIcon  = cat.Icon;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setActiveTab(cat.key)}
                      className={[
                        "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors duration-150",
                        isActive
                          ? "bg-accent text-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      ].join(" ")}
                    >
                      <CatIcon size={14} className={`shrink-0 ${isActive ? "text-primary" : ""}`} />
                      <span className="flex-1 text-xs font-medium">{cat.label}</span>
                      {cnt > 0 && (
                        <span className="rounded-[var(--radius-xs)] bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                          {cnt}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Main content */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Search */}
              <div className="border-b border-border/60 px-5 py-3">
                <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-border bg-muted/40 px-3.5 py-2.5">
                  <Search size={15} className="shrink-0 text-muted-foreground/60" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search templates…"
                    className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                  {search && (
                    <button type="button" onClick={() => setSearch("")} className="text-muted-foreground/70 hover:text-muted-foreground">
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {loading ? (
                  <LoadingSkeleton />
                ) : filteredBuiltIn.length === 0 && filteredWorkspace.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="space-y-6">
                    {filteredBuiltIn.length > 0 && (
                      <section>
                        <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">
                          WorkFlik Templates
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          {filteredBuiltIn.map((tpl) => (
                            <TemplateCard
                              key={tpl.id}
                              template={tpl}
                              onSelect={() => handleSelectTemplate(tpl)}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {filteredWorkspace.length > 0 && (
                      <section>
                        <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">
                          Workspace Templates
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          {filteredWorkspace.map((tpl) => (
                            <TemplateCard
                              key={tpl.id}
                              template={tpl}
                              onSelect={() => handleSelectTemplate(tpl)}
                            />
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── DETAIL STEP ── */}
        {step === "detail" && selected && (() => {
          const catColors = CATEGORY_COLORS[selected.category] ?? DEFAULT_COLOR;
          const catDef   = CATEGORIES.find((c) => c.key === selected.category);
          const CatIcon  = catDef?.Icon ?? LayoutGrid;
          const blocks   = selected.pageSnapshot.blocks ?? [];

          return (
            <div className="flex h-full w-full">
              {/* Left panel */}
              <div className="flex w-[380px] shrink-0 flex-col border-r border-border/60 bg-background">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Templates</p>
                    <h3 className="truncate text-sm font-bold text-foreground">{selected.name}</h3>
                  </div>
                </div>

                {/* Info + block list */}
                <div className="flex-1 overflow-y-auto px-5 py-5">
                  {/* Category + description */}
                  <span className={`inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground`}>
                    <CatIcon size={10} />
                    {catDef?.label}
                  </span>

                  {selected.description && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {selected.description}
                    </p>
                  )}

                  {/* DB schema preview or block list */}
                  {selected.pageSnapshot.database_schema ? (
                    <DbSchemaPreview schema={selected.pageSnapshot.database_schema} />
                  ) : blocks.length > 0 ? (
                    <div className="mt-5">
                      <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">
                        Included in this template
                      </p>
                      <div className="space-y-1.5 rounded-[var(--radius-md)] border border-border/50 bg-muted/20 p-3">
                        {blocks.slice(0, 12).map((b, i) => (
                          <BlockPreview key={i} block={b as { type: string; content?: unknown }} />
                        ))}
                        {blocks.length > 12 && (
                          <p className="text-xs text-muted-foreground/70">
                            + {blocks.length - 12} more blocks…
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Continue CTA */}
                <div className="border-t border-border/60 p-5">
                  <button
                    type="button"
                    disabled={applying}
                    onClick={() => applyTemplate(selected)}
                    className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90 disabled:opacity-60"
                  >
                    {applying ? (
                      <>
                        <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Creating page…
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Creates an independent copy of this template
                  </p>
                </div>
              </div>

              {/* Right panel — page preview */}
              <div className="flex flex-1 flex-col overflow-hidden bg-muted/20">
                <div className="flex flex-1 items-start justify-center overflow-y-auto p-8">
                  <div className="w-full max-w-[580px] overflow-hidden rounded-[var(--radius-md)] border border-border bg-background">
                    {/* Cover */}
                    <div className="flex h-24 items-center justify-center bg-muted/30">
                      {selected.pageSnapshot.icon ? (
                        <span className="text-4xl">{selected.pageSnapshot.icon}</span>
                      ) : (
                        <CatIcon size={40} className="text-muted-foreground/60" />
                      )}
                    </div>

                    {/* Page content preview */}
                    <div className="px-6 py-5">
                      <h1 className="mb-1 text-xl font-bold text-foreground">
                        {selected.pageSnapshot.title || selected.name}
                      </h1>
                      {blocks[0] && (() => {
                        const c = blocks[0].content as { text?: { text: string }[] } | null;
                        const txt = c?.text?.map((t) => t.text).join("") ?? "";
                        return txt ? (
                          <p className="mb-4 text-xs text-muted-foreground">{txt}</p>
                        ) : null;
                      })()}

                      {selected.pageSnapshot.database_schema ? (
                        <DatabasePreview schema={selected.pageSnapshot.database_schema} />
                      ) : (
                        <div className="space-y-2">
                          {blocks.slice(1, 14).map((b, i) => (
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
        })()}

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex size-7 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-background text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>
    </div>,
    document.body
  );
}

// ── Template card ──────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onSelect,
}: {
  template: Template;
  onSelect: () => void;
}) {
  const colors  = CATEGORY_COLORS[template.category] ?? DEFAULT_COLOR;
  const catDef  = CATEGORIES.find((c) => c.key === template.category);
  const CatIcon = catDef?.Icon ?? LayoutGrid;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-border bg-card text-left transition-colors duration-150 hover:border-border hover:bg-accent/20"
    >
      {/* Mini document preview */}
      <div className="relative h-[90px] overflow-hidden border-b border-border/40 bg-muted/20 p-3">
        <div className="mb-2 flex items-center gap-1.5">
          {template.pageSnapshot.icon ? (
            <span className="shrink-0 text-sm leading-none">{template.pageSnapshot.icon}</span>
          ) : (
            <div className="flex size-4 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-muted">
              <CatIcon size={9} className="text-muted-foreground" />
            </div>
          )}
          <div className="h-1.5 w-16 rounded-[var(--radius-xs)] bg-foreground/15" />
        </div>
        <div className="space-y-1">
          <div className="h-1 w-4/5 rounded-[var(--radius-xs)] bg-muted-foreground/15" />
          <div className="h-1 w-3/5 rounded-[var(--radius-xs)] bg-muted-foreground/12" />
          <div className="h-px bg-border/40 my-0.5" />
          <div className="flex items-center gap-1">
            <div className="size-1 rounded-full bg-muted-foreground/25" />
            <div className="h-1 w-1/2 rounded-[var(--radius-xs)] bg-muted-foreground/12" />
          </div>
          <div className="flex items-center gap-1">
            <div className="size-1 rounded-full bg-muted-foreground/25" />
            <div className="h-1 w-2/3 rounded-[var(--radius-xs)] bg-muted-foreground/10" />
          </div>
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-1 flex-col p-3">
        <p className="text-xs font-semibold leading-snug text-foreground">{template.name}</p>
        {template.description && (
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground/65">
            {template.description}
          </p>
        )}
        <div className="mt-2">
          <span className={`inline-flex items-center gap-1 rounded-[var(--radius-xs)] px-2 py-0.5 text-[9.5px] font-semibold ${colors.badge}`}>
            <CatIcon size={9} />
            {catDef?.label ?? template.category}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Block preview (compact, for left panel list) ───────────────────────────────

const BLOCK_ICONS: Record<string, string> = {
  h1: "H1", h2: "H2", h3: "H3", paragraph: "¶",
  bullet: "•", numbered: "#", todo: "☐", quote: "❝",
  callout: "💡", divider: "—", table: "⊞", code: "</>",
};

function BlockPreview({ block }: { block: { type: string; content?: unknown } }) {
  const icon = BLOCK_ICONS[block.type] ?? "·";
  const c    = block.content as { text?: { text: string }[] } | null;
  const text = c?.text?.map((t) => t.text).join("") ?? "";
  return (
    <div className="flex items-start gap-2">
      <span className="mt-px w-5 shrink-0 text-center text-xs font-bold text-muted-foreground/60">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-foreground/60">
        {text || <span className="italic text-muted-foreground/60">{block.type}</span>}
      </span>
    </div>
  );
}

// ── Page block preview (right panel, looks like a real doc) ────────────────────

function PageBlockPreview({ block }: { block: { type: string; content?: unknown } }) {
  const c    = block.content as { text?: { text: string }[] } | null;
  const text = c?.text?.map((t) => t.text).join("") ?? "";

  if (block.type === "divider") {
    return <hr className="border-border/40" />;
  }

  const classMap: Record<string, string> = {
    h1:        "text-base font-bold text-foreground mt-3 first:mt-0",
    h2:        "text-sm font-bold text-foreground mt-2.5 first:mt-0",
    h3:        "text-sm font-semibold text-foreground mt-2",
    paragraph: "text-xs text-muted-foreground leading-relaxed",
    bullet:    "text-xs text-muted-foreground leading-relaxed pl-3 before:content-['•'] before:mr-2 before:text-muted-foreground/70",
    numbered:  "text-xs text-muted-foreground leading-relaxed pl-3",
    todo:      "text-xs text-muted-foreground leading-relaxed pl-3 line-through opacity-50",
    quote:     "text-xs italic text-muted-foreground border-l-2 border-border pl-3",
    code:      "text-xs font-mono text-foreground bg-muted rounded px-1.5 py-0.5",
  };

  const cls = classMap[block.type] ?? "text-xs text-muted-foreground";

  return (
    <p className={cls}>
      {text || <span className="opacity-30">—</span>}
    </p>
  );
}

// ── DB schema preview (left panel — property list) ─────────────────────────────

const PROP_TYPE_ICON: Record<string, string> = {
  title: "Aa", text: "Aa", number: "#", select: "≡", multi_select: "≡",
  date: "📅", checkbox: "☐", url: "🔗", email: "✉", phone: "☎",
  person: "👤", relation: "↗", created_by: "👤", created_time: "🕐",
  last_edited_by: "👤", last_edited_time: "🕐",
};

function DbSchemaPreview({ schema }: { schema: { properties: DbProp[]; views: DbView[] } }) {
  return (
    <div className="mt-5 space-y-4">
      {/* Views */}
      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
          Views
        </p>
        <div className="flex flex-wrap gap-1.5">
          {schema.views.map((v) => (
            <span
              key={v.name}
              className={[
                "inline-flex items-center gap-1 rounded-[var(--radius-sm)] border px-2 py-1 text-xs font-medium",
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

      {/* Properties */}
      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
          Properties ({schema.properties.length})
        </p>
        <div className="divide-y divide-border/40 rounded-[var(--radius-md)] border border-border/50 bg-muted/20">
          {schema.properties.map((p) => (
            <div key={p.name} className="flex items-center gap-2.5 px-3 py-2">
              <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground/70">
                {PROP_TYPE_ICON[p.type] ?? "·"}
              </span>
              <span className="flex-1 text-xs text-foreground/80">{p.name}</span>
              {p.options && p.options.length > 0 && (
                <div className="flex gap-1">
                  {p.options.slice(0, 3).map((o) => (
                    <span key={o.name} className="rounded px-1 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                      {o.name}
                    </span>
                  ))}
                  {p.options.length > 3 && (
                    <span className="text-xs text-muted-foreground/70">+{p.options.length - 3}</span>
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

// ── Shared type + shared subcomponents ────────────────────────────────────────

type SchemaForPreview = { properties: DbProp[]; views: DbView[]; sample_rows?: Record<string, string | number>[] };

function ViewTabs({ views, defaultName }: { views: DbView[]; defaultName: string }) {
  return (
    <div className="mb-3 flex items-center gap-1 overflow-x-auto border-b border-border/40 pb-2">
      {views.map((v) => (
        <span
          key={v.name}
          className={[
            "shrink-0 rounded px-2 py-0.5 text-xs font-medium",
            v.name === defaultName ? "bg-accent text-foreground font-semibold" : "text-muted-foreground",
          ].join(" ")}
        >
          {v.name}
        </span>
      ))}
    </div>
  );
}

// ── DB table preview ────────────────────────────────────────────────────────────

function DbTablePreview({ schema }: { schema: SchemaForPreview }) {
  const visibleProps = schema.properties.filter((p) => p.type !== "created_by" && p.type !== "created_time" && p.type !== "last_edited_by" && p.type !== "last_edited_time").slice(0, 5);
  const defaultView  = schema.views.find((v) => v.isDefault) ?? schema.views[0];
  const rows         = schema.sample_rows ?? [];

  return (
    <div className="mt-3">
      <ViewTabs views={schema.views} defaultName={defaultView?.name ?? ""} />
      {/* Table */}
      <div className="overflow-hidden rounded-[var(--radius-sm)] border border-border/40">
        {/* Header */}
        <div className="flex border-b border-border/40 bg-muted/30">
          {visibleProps.map((p) => (
            <div key={p.name} className="flex-1 min-w-0 px-2 py-1.5 text-[9.5px] font-semibold text-muted-foreground/60 truncate">
              <span className="mr-1 opacity-50">{PROP_TYPE_ICON[p.type] ?? "·"}</span>
              {p.name}
            </div>
          ))}
        </div>
        {/* Sample rows */}
        {rows.slice(0, 3).map((row, ri) => (
          <div key={ri} className="flex border-b border-border/30 last:border-0 hover:bg-muted/20">
            {visibleProps.map((p, pi) => {
              const val = row[p.name];
              const opt = p.options?.find((o) => o.name === val);
              return (
                <div key={pi} className="flex-1 min-w-0 px-2 py-1.5 text-xs text-foreground/80">
                  {opt ? (
                    <span className={`rounded-[var(--radius-xs)] px-1.5 py-0.5 text-[9.5px] font-medium ${(OPTION_COLORS[opt.color] ?? DEFAULT_OPT).badge}`}>{val}</span>
                  ) : val !== undefined ? (
                    <span className="truncate block">{String(val)}</span>
                  ) : (
                    <span className="text-muted-foreground/60">—</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="py-3 text-center text-xs text-muted-foreground/60">
            No sample data
          </div>
        )}
      </div>
    </div>
  );
}

// ── Board (kanban) preview ─────────────────────────────────────────────────────

function BoardPreview({ schema }: { schema: SchemaForPreview }) {
  const defaultView = schema.views.find((v) => v.isDefault) ?? schema.views[0];
  const groupByName = defaultView?.groupBy;
  const groupByProp = schema.properties.find((p) => p.name === groupByName)
    ?? schema.properties.find((p) => p.type === "select");
  const titleProp   = schema.properties.find((p) => p.type === "title");
  const tagProp     = schema.properties.find((p) => p.type === "select" && p !== groupByProp);
  const columns     = (groupByProp?.options ?? []).slice(0, 5);
  const rows        = schema.sample_rows ?? [];

  return (
    <div className="mt-3">
      <ViewTabs views={schema.views} defaultName={defaultView?.name ?? ""} />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {columns.map((col) => {
          const colRows = groupByProp
            ? rows.filter((r) => r[groupByProp.name] === col.name)
            : [];
          const clr = OPTION_COLORS[col.color] ?? DEFAULT_OPT;
          return (
            <div key={col.name} className="min-w-[130px] flex-shrink-0">
              <div className="mb-2 flex items-center gap-1.5">
                <span className={`size-2 shrink-0 rounded-full ${clr.dot}`} />
                <span className="flex-1 truncate text-xs font-semibold text-foreground/70">{col.name}</span>
                {colRows.length > 0 && (
                  <span className="text-xs text-muted-foreground/60 tabular-nums">{colRows.length}</span>
                )}
              </div>
              <div className="space-y-1.5">
                {colRows.map((row, i) => {
                  const title  = titleProp ? String(row[titleProp.name] ?? "") : "";
                  const tagVal = tagProp ? String(row[tagProp.name] ?? "") : "";
                  const tagOpt = tagProp?.options?.find((o) => o.name === tagVal);
                  return (
                    <div key={i} className="rounded-[var(--radius-sm)] border border-border/50 bg-background p-2">
                      <p className="text-xs font-medium leading-snug text-foreground">{title}</p>
                      {tagOpt && (
                        <span className={`mt-1 inline-flex rounded px-1 py-0.5 text-xs font-medium ${(OPTION_COLORS[tagOpt.color] ?? DEFAULT_OPT).badge}`}>
                          {tagVal}
                        </span>
                      )}
                    </div>
                  );
                })}
                <div className="rounded-[var(--radius-sm)] border border-border/30 p-2">
                  <span className="text-xs text-muted-foreground/60">+ New</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Calendar preview ───────────────────────────────────────────────────────────

const CAL_DAYS  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CAL_WEEKS = [
  [1,  2,  3,  4,  5,  6,  7 ],
  [8,  9,  10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20, 21],
  [22, 23, 24, 25, 26, 27, 28],
  [29, 30, 0,  0,  0,  0,  0 ],
];

function CalendarPreview({ schema }: { schema: SchemaForPreview }) {
  const defaultView = schema.views.find((v) => v.isDefault) ?? schema.views[0];
  return (
    <div className="mt-3">
      <ViewTabs views={schema.views} defaultName={defaultView?.name ?? ""} />
      <div className="overflow-hidden rounded-[var(--radius-sm)] border border-border/40">
        <div className="flex items-center justify-between border-b border-border/40 bg-muted/20 px-3 py-1.5">
          <span className="text-xs font-semibold text-foreground/70">June 2026</span>
          <div className="flex gap-2 text-xs text-muted-foreground/60">
            <span>‹</span>
            <span>›</span>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-border/40 bg-muted/10">
          {CAL_DAYS.map((d) => (
            <div key={d} className="py-1 text-center text-[8.5px] font-semibold text-muted-foreground/70">
              {d}
            </div>
          ))}
        </div>
        {CAL_WEEKS.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border/20 last:border-0">
            {week.map((date, di) => (
              <div key={di} className="h-9 border-r border-border/20 p-1 last:border-0">
                {date > 0 && (
                  <span className={
                    date === 19
                      ? "flex size-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground"
                      : "text-xs text-muted-foreground/70"
                  }>
                    {date}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DatabasePreview — picks the right view type ────────────────────────────────

function DatabasePreview({ schema }: { schema: SchemaForPreview }) {
  const defaultView = schema.views.find((v) => v.isDefault) ?? schema.views[0];
  if (defaultView?.type === "board")    return <BoardPreview schema={schema} />;
  if (defaultView?.type === "calendar") return <CalendarPreview schema={schema} />;
  return <DbTablePreview schema={schema} />;
}

// ── States ────────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-[var(--radius-md)] border border-border/40">
          <div className="h-[76px] animate-pulse bg-muted/60" />
          <div className="space-y-1.5 bg-background p-3">
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
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-14 items-center justify-center rounded-[var(--radius-lg)] bg-muted/50">
        <LayoutGrid size={28} className="text-muted-foreground/70" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">No templates yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Templates are added by the WorkFlik team via Orbit Admin.
        </p>
      </div>
    </div>
  );
}
